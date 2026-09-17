/**
 * Benchmark types.
 *
 * Shared by the dataset loader, the graders, the runner, and the load tester,
 * so a results file has one shape and can be diffed across models and runs.
 *
 * EVERY performance field here is UNKNOWN UNTIL BENCHMARKED ON THE ACTUAL
 * GB10. Nothing in this repository fills them in from an estimate.
 */

export type BenchmarkCategory =
  | "office"
  | "finance"
  | "compliance"
  | "structured"
  | "reasoning"
  | "longcontext";

export interface BenchmarkPrompt {
  id: string;
  category: BenchmarkCategory;
  prompt: string;
  maxTokens?: number;
  /** Long-context prompts are generated rather than stored, to keep the repo small. */
  generator?: { kind: "needle-in-haystack"; approxTokens: number };
}

export interface RequiredStructure {
  keys?: string[];
  itemKeys?: string[];
  exactKeys?: boolean;
  length?: number;
  enums?: Record<string, string[]>;
  types?: Record<string, "string" | "number" | "boolean" | "array" | "object">;
}

export interface ExpectedBehavior {
  mustMention?: string[];
  mustNotMention?: string[];
  maxWords?: number;
  /** The answer must cite the supplied policy rather than assert from nowhere. */
  citationRequired?: boolean;
  /**
   * The only correct answer is to decline: the question asks for something the
   * model was not given. Inventing an answer is a hard fail.
   */
  mustRefuse?: boolean;
  formatValidity?: "json-object" | "json-array";
  requiredStructure?: RequiredStructure;
  /** The generated long-context fact the answer must contain. */
  needleAnswer?: boolean;
  /** What a checker cannot decide. Carried into the report for a human. */
  humanReview?: string;
}

export interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

export interface GradeResult {
  /** Automated checks only. Null when a prompt has no checkable criteria. */
  score: number | null;
  checks: CheckResult[];
  humanReview: string | null;
}

/** Timings for one request. Null wherever the server did not report a figure. */
export interface RequestMetrics {
  /** Milliseconds from request start to the first token arriving. Streaming only. */
  timeToFirstTokenMs: number | null;
  totalLatencyMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  /** Completion tokens ÷ generation time. Null when tokens were not reported. */
  outputTokensPerSecond: number | null;
}

export interface PromptRun {
  promptId: string;
  category: BenchmarkCategory;
  ok: boolean;
  /** Present when ok. */
  response?: string;
  /** Present when the request failed. Never contains prompt content. */
  error?: string;
  metrics: RequestMetrics | null;
  grade: GradeResult | null;
}

export interface BenchmarkRun {
  /** ISO-8601. */
  startedAt: string;
  finishedAt: string;
  /** Registry id or passthrough name, as configured. */
  model: string;
  /** What the server said it was serving. */
  servedModel: string | null;
  baseUrl: string;
  datasetVersion: number;
  settings: {
    maxTokens: number;
    temperature: number;
    timeoutMs: number;
    reasoningEffort: string | null;
    streaming: boolean;
  };
  /** Seconds from process start until the server answered a probe. */
  modelLoadProbeSeconds: number | null;
  runs: PromptRun[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    failureRate: number;
    /** Mean of the automated per-prompt scores, over graded prompts only. */
    meanScore: number | null;
    scoresByCategory: Record<string, number | null>;
    latencyMs: { p50: number; p95: number; p99: number } | null;
    meanOutputTokensPerSecond: number | null;
  };
}
