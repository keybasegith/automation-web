/**
 * Concurrency sweep for the Internal AI local models.
 *
 *   MODEL=qwen3-30b-a3b npm run ai:loadtest
 *   MODEL=gpt-oss-120b npm run ai:loadtest -- --levels=1,5,10
 *
 * Sizing context: roughly 200 employees will have access. That is not 200
 * concurrent requests. Chat use is bursty and mostly idle — a realistic peak is
 * a low double-digit number of simultaneous generations, which is why the
 * sweep stops at 40 rather than 200. The sweep's job is to find where latency
 * degrades unacceptably, not to prove a number we already believe.
 *
 * SAFETY: refuses to run unless LOCAL_LLM_BASE_URL is set, and refuses to run
 * against localhost, so it cannot be pointed at a development machine by
 * accident. Like the benchmark, it fabricates nothing: no server, no results.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getInternalAiConfig } from "@/lib/internal-ai/config";
import { createInferenceClient } from "@/lib/internal-ai/providers/inference-client";
import { SYSTEM_PROMPT } from "@/lib/internal-ai/providers/local-provider";
import { percentile } from "@/lib/internal-ai/benchmark/graders";

const DEFAULT_LEVELS = [1, 5, 10, 20, 40];

/**
 * One representative prompt, identical at every level. Comparing levels
 * requires the work to be constant; varying the prompt would measure the
 * prompt.
 */
const LOAD_PROMPT =
  "Summarise the purpose of a trial balance in three sentences for a new employee.";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const args = process.argv.slice(2);
const levels =
  args
    .find((a) => a.startsWith("--levels="))
    ?.split("=")[1]
    .split(",")
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isFinite(n) && n > 0) ?? DEFAULT_LEVELS;

const requestsPerLevel = Number(
  args.find((a) => a.startsWith("--requests="))?.split("=")[1] ?? 20
);

const requestedModel = process.env.MODEL?.trim();
if (requestedModel) process.env.LOCAL_LLM_MODEL = requestedModel;

const config = getInternalAiConfig();
if (!config.localInference) {
  fail(
    "load test not executed: inference server unavailable\n" +
      "  LOCAL_LLM_BASE_URL is not set."
  );
}
const inference = config.localInference;

const host = new URL(inference.baseUrl).hostname;
const allowLocalhost = args.includes("--allow-localhost");
if (!allowLocalhost && ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(host)) {
  fail(
    "load test refused: target is localhost.\n" +
      "  This sweep is for the GB10 inference host, not a development machine.\n" +
      "  Override deliberately with --allow-localhost if you know what you are doing."
  );
}

const client = createInferenceClient(inference);

interface Sample {
  ok: boolean;
  latencyMs: number;
  timeToFirstTokenMs: number | null;
  completionTokens: number | null;
}

async function oneRequest(): Promise<Sample> {
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: LOAD_PROMPT },
  ];
  const started = Date.now();
  let firstTokenAt: number | null = null;
  let completionTokens: number | null = null;

  try {
    for await (const frame of client.stream(messages)) {
      if (frame.type === "delta") firstTokenAt ??= Date.now();
      else completionTokens = frame.usage.completionTokens;
    }
    return {
      ok: true,
      latencyMs: Date.now() - started,
      timeToFirstTokenMs: firstTokenAt ? firstTokenAt - started : null,
      completionTokens,
    };
  } catch {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      timeToFirstTokenMs: null,
      completionTokens: null,
    };
  }
}

async function sweepLevel(concurrency: number) {
  const total = Math.max(concurrency, requestsPerLevel);
  const samples: Sample[] = [];
  let launched = 0;
  const startedAt = Date.now();

  // A fixed pool of `concurrency` workers, each taking the next request as it
  // finishes. This holds concurrency steady, which firing all requests at once
  // would not.
  const worker = async () => {
    while (launched < total) {
      launched += 1;
      samples.push(await oneRequest());
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));

  const wallSeconds = (Date.now() - startedAt) / 1000;
  const ok = samples.filter((s) => s.ok);
  const latencies = ok.map((s) => s.latencyMs);
  const ttfts = ok
    .map((s) => s.timeToFirstTokenMs)
    .filter((v): v is number => typeof v === "number");
  const tokens = ok
    .map((s) => s.completionTokens)
    .filter((v): v is number => typeof v === "number")
    .reduce((a, b) => a + b, 0);

  return {
    concurrency,
    requests: samples.length,
    successRate: samples.length ? ok.length / samples.length : 0,
    latencyMs: latencies.length
      ? {
          p50: percentile(latencies, 50),
          p95: percentile(latencies, 95),
          p99: percentile(latencies, 99),
        }
      : null,
    timeToFirstTokenMs: ttfts.length
      ? {
          p50: percentile(ttfts, 50),
          p95: percentile(ttfts, 95),
          p99: percentile(ttfts, 99),
        }
      : null,
    /**
     * Aggregate completion tokens per wall-clock second across the level. Queue
     * time is not separated here: the chat-completions protocol does not expose
     * it, so time spent waiting is inside these latencies. Read the server's
     * own metrics endpoint for a queue breakdown.
     */
    throughputTokensPerSecond: wallSeconds > 0 ? tokens / wallSeconds : null,
    wallSeconds,
  };
}

async function main() {
  console.log(
    `Load sweep against ${inference.model.providerModelName} at levels ${levels.join(", ")}\n`
  );

  const results = [];
  for (const level of levels) {
    process.stdout.write(`  concurrency ${level} … `);
    const result = await sweepLevel(level);
    results.push(result);
    console.log(
      `p50 ${result.latencyMs?.p50.toFixed(0) ?? "n/a"}ms, ` +
        `p95 ${result.latencyMs?.p95.toFixed(0) ?? "n/a"}ms, ` +
        `success ${(result.successRate * 100).toFixed(0)}%`
    );

    if (result.successRate < 0.95) {
      console.log(
        `\n  Stopping: success rate fell below 95% at concurrency ${level}.\n` +
          "  Higher levels would measure a failing server, not its capacity."
      );
      break;
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(process.cwd(), "benchmark-results", stamp);
  mkdirSync(outDir, { recursive: true });
  const slug = (requestedModel ?? inference.model.providerModelName!).replace(
    /[^a-z0-9.-]+/gi,
    "_"
  );
  const file = path.join(outDir, `${slug}.loadtest.json`);
  writeFileSync(
    file,
    JSON.stringify(
      {
        model: inference.model.providerModelName,
        baseUrl: inference.baseUrl,
        requestsPerLevel,
        ranAt: new Date().toISOString(),
        levels: results,
      },
      null,
      2
    )
  );
  console.log(`\nWrote ${path.relative(process.cwd(), file)}`);
}

await main();
