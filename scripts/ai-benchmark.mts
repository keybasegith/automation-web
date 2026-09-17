/**
 * Benchmark runner for the Internal AI local models.
 *
 *   MODEL=gpt-oss-120b npm run ai:benchmark
 *   MODEL=qwen3-30b-a3b npm run ai:benchmark -- --stream
 *
 * Requires LOCAL_LLM_BASE_URL to point at a reachable inference server. There
 * is no offline mode and no simulated result: if the server cannot be reached,
 * this prints
 *
 *     benchmark not executed: inference server unavailable
 *
 * and exits non-zero. A fabricated number here would end up in a capacity
 * decision, so the only safe behaviour is to produce nothing.
 *
 * Results: benchmark-results/<timestamp>/<model>.json plus a summary.md.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getInternalAiConfig } from "@/lib/internal-ai/config";
import { createInferenceClient } from "@/lib/internal-ai/providers/inference-client";
import { SYSTEM_PROMPT } from "@/lib/internal-ai/providers/local-provider";
import { loadDataset, materializePrompt } from "@/lib/internal-ai/benchmark/dataset";
import { gradeResponse, percentile } from "@/lib/internal-ai/benchmark/graders";
import type {
  BenchmarkRun,
  PromptRun,
  RequestMetrics,
} from "@/lib/internal-ai/benchmark/types";

const args = process.argv.slice(2);
const useStreaming = args.includes("--stream");
const only = args.find((a) => a.startsWith("--category="))?.split("=")[1];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const config = getInternalAiConfig();
if (!config.localInference) {
  fail(
    "benchmark not executed: inference server unavailable\n" +
      "  LOCAL_LLM_BASE_URL is not set. Point it at the GB10 inference server and retry."
  );
}

// MODEL= overrides the configured model for this run, which is how three
// candidates are compared without editing the environment between them.
const requestedModel = process.env.MODEL?.trim();
if (requestedModel) process.env.LOCAL_LLM_MODEL = requestedModel;
const runConfig = getInternalAiConfig();
const inference = runConfig.localInference!;

if (!inference.model.providerModelName) {
  fail(
    "benchmark not executed: no model selected\n" +
      "  Set MODEL=<registry id> or LOCAL_LLM_MODEL=<provider model name>."
  );
}

const client = createInferenceClient(inference);

// ---------------------------------------------------------------------------

async function probe(): Promise<{ served: string | null; seconds: number } | null> {
  const started = Date.now();
  try {
    const models = await client.listModels();
    return {
      served: models[0] ?? null,
      seconds: (Date.now() - started) / 1000,
    };
  } catch {
    return null;
  }
}

async function runOne(
  text: string,
  maxTokens: number | undefined
): Promise<{ response: string; metrics: RequestMetrics; served: string | null }> {
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: text },
  ];
  const started = Date.now();

  if (!useStreaming) {
    const result = await client.complete(messages);
    const totalLatencyMs = Date.now() - started;
    return {
      response: result.text,
      served: result.model,
      metrics: {
        // Not measurable without streaming. Reported as null rather than as
        // total latency, which would be a different measurement wearing this
        // one's name.
        timeToFirstTokenMs: null,
        totalLatencyMs,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        outputTokensPerSecond:
          result.usage.completionTokens && totalLatencyMs > 0
            ? result.usage.completionTokens / (totalLatencyMs / 1000)
            : null,
      },
    };
  }

  let firstTokenAt: number | null = null;
  let served: string | null = null;
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;
  const parts: string[] = [];

  for await (const frame of client.stream(messages)) {
    if (frame.type === "delta") {
      firstTokenAt ??= Date.now();
      parts.push(frame.text);
    } else {
      served = frame.model;
      promptTokens = frame.usage.promptTokens;
      completionTokens = frame.usage.completionTokens;
    }
  }

  const finishedAt = Date.now();
  const generationMs = firstTokenAt ? finishedAt - firstTokenAt : finishedAt - started;

  return {
    response: parts.join(""),
    served,
    metrics: {
      timeToFirstTokenMs: firstTokenAt ? firstTokenAt - started : null,
      totalLatencyMs: finishedAt - started,
      promptTokens,
      completionTokens,
      outputTokensPerSecond:
        completionTokens && generationMs > 0
          ? completionTokens / (generationMs / 1000)
          : null,
    },
  };
  void maxTokens; // Per-prompt caps are a later refinement; the config cap applies.
}

// ---------------------------------------------------------------------------

async function main() {
  const startedAt = new Date().toISOString();
  const probed = await probe();

  if (!probed) {
    fail(
      "benchmark not executed: inference server unavailable\n" +
        `  Could not reach ${inference.baseUrl}. No results were written.`
    );
  }

  const dataset = loadDataset();
  const prompts = only
    ? dataset.prompts.filter((p) => p.category === only)
    : dataset.prompts;

  if (prompts.length === 0) fail(`No prompts matched --category=${only}`);

  console.log(
    `Running ${prompts.length} prompts against ${inference.model.providerModelName} ` +
      `(${useStreaming ? "streaming" : "non-streaming"})\n`
  );

  const runs: PromptRun[] = [];
  let served: string | null = probed.served;

  for (const prompt of prompts) {
    const { text, needle } = materializePrompt(prompt);
    process.stdout.write(`  ${prompt.id} … `);
    try {
      const result = await runOne(text, prompt.maxTokens);
      served = result.served ?? served;
      const grade = gradeResponse(result.response, dataset.behaviors[prompt.id], needle);
      runs.push({
        promptId: prompt.id,
        category: prompt.category,
        ok: true,
        response: result.response,
        metrics: result.metrics,
        grade,
      });
      console.log(
        `${result.metrics.totalLatencyMs}ms` +
          (grade.score === null ? "" : `, score ${(grade.score * 100).toFixed(0)}%`)
      );
    } catch (error) {
      runs.push({
        promptId: prompt.id,
        category: prompt.category,
        ok: false,
        // The message only; a cause could carry prompt text.
        error: error instanceof Error ? error.message : "unknown failure",
        metrics: null,
        grade: null,
      });
      console.log("FAILED");
    }
  }

  const succeeded = runs.filter((r) => r.ok);
  const latencies = succeeded
    .map((r) => r.metrics?.totalLatencyMs)
    .filter((v): v is number => typeof v === "number");
  const graded = succeeded
    .map((r) => r.grade?.score)
    .filter((v): v is number => typeof v === "number");
  const throughputs = succeeded
    .map((r) => r.metrics?.outputTokensPerSecond)
    .filter((v): v is number => typeof v === "number");

  const categories = [...new Set(prompts.map((p) => p.category))];
  const scoresByCategory = Object.fromEntries(
    categories.map((category) => {
      const scores = succeeded
        .filter((r) => r.category === category)
        .map((r) => r.grade?.score)
        .filter((v): v is number => typeof v === "number");
      return [
        category,
        scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      ];
    })
  );

  const run: BenchmarkRun = {
    startedAt,
    finishedAt: new Date().toISOString(),
    model: inference.model.providerModelName!,
    servedModel: served,
    baseUrl: inference.baseUrl,
    datasetVersion: dataset.version,
    settings: {
      maxTokens: inference.maxTokens,
      temperature: inference.temperature,
      timeoutMs: inference.timeoutMs,
      reasoningEffort: inference.reasoningEffort,
      streaming: useStreaming,
    },
    modelLoadProbeSeconds: probed.seconds,
    runs,
    summary: {
      total: runs.length,
      succeeded: succeeded.length,
      failed: runs.length - succeeded.length,
      failureRate: runs.length ? (runs.length - succeeded.length) / runs.length : 0,
      meanScore: graded.length
        ? graded.reduce((a, b) => a + b, 0) / graded.length
        : null,
      scoresByCategory,
      latencyMs: latencies.length
        ? {
            p50: percentile(latencies, 50),
            p95: percentile(latencies, 95),
            p99: percentile(latencies, 99),
          }
        : null,
      meanOutputTokensPerSecond: throughputs.length
        ? throughputs.reduce((a, b) => a + b, 0) / throughputs.length
        : null,
    },
  };

  const stamp = startedAt.replace(/[:.]/g, "-");
  const outDir = path.join(process.cwd(), "benchmark-results", stamp);
  mkdirSync(outDir, { recursive: true });

  const slug = (requestedModel ?? inference.model.providerModelName!).replace(
    /[^a-z0-9.-]+/gi,
    "_"
  );
  writeFileSync(path.join(outDir, `${slug}.json`), JSON.stringify(run, null, 2));
  writeFileSync(path.join(outDir, `${slug}.md`), summarize(run));

  console.log(`\nWrote ${path.relative(process.cwd(), outDir)}/${slug}.json`);
  console.log(summarize(run));
}

function summarize(run: BenchmarkRun): string {
  const pct = (v: number | null) => (v === null ? "n/a" : `${(v * 100).toFixed(0)}%`);
  const ms = (v: number | undefined) => (v === undefined ? "n/a" : `${v.toFixed(0)}ms`);

  const needsReview = run.runs.filter((r) => r.grade?.humanReview);
  const hardFails = run.runs.flatMap((r) =>
    (r.grade?.checks ?? [])
      .filter((c) => !c.passed && c.detail.includes("hard fail"))
      .map((c) => `${r.promptId}: ${c.name}`)
  );

  return [
    "",
    `# ${run.model}`,
    "",
    `Served model: ${run.servedModel ?? "unreported"}`,
    `Dataset v${run.datasetVersion} · ${run.settings.streaming ? "streaming" : "non-streaming"} · temp ${run.settings.temperature} · max_tokens ${run.settings.maxTokens}`,
    "",
    `Prompts: ${run.summary.succeeded}/${run.summary.total} succeeded (failure rate ${pct(run.summary.failureRate)})`,
    `Automated score: ${pct(run.summary.meanScore)}`,
    `Latency p50/p95/p99: ${ms(run.summary.latencyMs?.p50)} / ${ms(run.summary.latencyMs?.p95)} / ${ms(run.summary.latencyMs?.p99)}`,
    `Mean output tokens/sec: ${run.summary.meanOutputTokensPerSecond?.toFixed(1) ?? "n/a"}`,
    "",
    "## By category",
    ...Object.entries(run.summary.scoresByCategory).map(
      ([category, score]) => `- ${category}: ${pct(score)}`
    ),
    "",
    hardFails.length ? "## Hard fails" : "",
    ...hardFails.map((f) => `- ${f}`),
    "",
    "## Needs human review",
    "Automated checks are a filter, not a verdict. Read these answers before choosing a model:",
    ...needsReview.map((r) => `- ${r.promptId}: ${r.grade?.humanReview}`),
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

await main();
