/**
 * Loading and preparing the benchmark dataset.
 *
 * Long-context prompts are generated rather than stored: a 64k-token filler
 * file would bloat the repository and tell a reader nothing. The generator is
 * deterministic given a seed, so two runs — and two models — see byte-identical
 * input, which is the whole point of a comparison.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import type {
  BenchmarkPrompt,
  ExpectedBehavior,
} from "@/lib/internal-ai/benchmark/types";

export const DATASET_DIR = path.join(process.cwd(), "benchmarks", "internal-ai");

export interface Dataset {
  version: number;
  prompts: BenchmarkPrompt[];
  behaviors: Record<string, ExpectedBehavior>;
}

export function loadDataset(dir = DATASET_DIR): Dataset {
  const prompts = JSON.parse(
    readFileSync(path.join(dir, "prompts.json"), "utf8")
  ) as { version: number; prompts: BenchmarkPrompt[] };
  const behaviors = JSON.parse(
    readFileSync(path.join(dir, "expected-behaviors.json"), "utf8")
  ) as { behaviors: Record<string, ExpectedBehavior> };

  return {
    version: prompts.version,
    prompts: prompts.prompts,
    behaviors: behaviors.behaviors,
  };
}

/** A tiny deterministic PRNG, so filler text is identical between runs. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FILLER_SENTENCES = [
  "The quarterly operations review covers staffing, throughput, and exception handling.",
  "Processing volumes are recorded weekly and reconciled against the intake log.",
  "Team leads submit a short written summary at the end of each reporting period.",
  "Exceptions are queued for a second reviewer before any file is closed.",
  "Training records are refreshed annually for every member of the operations team.",
  "Meeting notes are circulated within two business days of the meeting itself.",
  "Capacity planning assumes an even distribution of work across the reporting week.",
  "Archived files are indexed by reference number rather than by client name.",
];

/**
 * A needle-in-a-haystack prompt: filler, one planted fact, more filler, then a
 * question about the fact. Tests retrieval across the context window rather
 * than recall of anything the model was trained on.
 *
 * Token counts are approximate — the true count depends on the tokenizer, and
 * the runner records the server's own `prompt_tokens` as the real figure.
 */
export function buildNeedlePrompt(
  approxTokens: number,
  seed = 1
): { prompt: string; needle: string } {
  const random = mulberry32(seed);
  // ~0.75 words per token is a rough English average; close enough to size the
  // filler, and the true count is measured, never guessed, at run time.
  const targetWords = Math.round(approxTokens * 0.75);

  const needleCode = `RX-${Math.floor(random() * 9000) + 1000}`;
  const needle = needleCode;
  const needleSentence = `The internal reference code for the annual operations audit is ${needleCode}.`;

  const lines: string[] = [];
  let words = 0;
  while (words < targetWords) {
    const sentence = FILLER_SENTENCES[Math.floor(random() * FILLER_SENTENCES.length)];
    lines.push(`${lines.length + 1}. ${sentence}`);
    words += sentence.split(" ").length + 1;
    // Plant the needle near the middle, where a model that only reads the
    // beginning and the end will miss it.
    if (lines.length === Math.floor(targetWords / 20) && !lines.includes(needleSentence)) {
      lines.push(needleSentence);
      words += needleSentence.split(" ").length;
    }
  }
  if (!lines.some((line) => line.includes(needleCode))) {
    lines.splice(Math.floor(lines.length / 2), 0, needleSentence);
  }

  const prompt = [
    "Below is an operations log. Read it and answer the question at the end.",
    "",
    ...lines,
    "",
    "Question: What is the internal reference code for the annual operations audit?",
    "Answer with the code only.",
  ].join("\n");

  return { prompt, needle };
}

/** Resolve a dataset entry into the text actually sent, plus any needle. */
export function materializePrompt(prompt: BenchmarkPrompt): {
  text: string;
  needle?: string;
} {
  if (prompt.generator?.kind === "needle-in-haystack") {
    const built = buildNeedlePrompt(prompt.generator.approxTokens);
    return { text: built.prompt, needle: built.needle };
  }
  return { text: prompt.prompt };
}
