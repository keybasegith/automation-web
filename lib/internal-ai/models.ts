/**
 * The local model registry.
 *
 * One place that knows which models we intend to serve on the company's own
 * hardware, what each is for, and what the inference server calls it. Nothing
 * above this file names a model: the config layer resolves a selection here,
 * the provider sends `providerModelName` on the wire, and the UI shows
 * `displayName`. Adding or retiring a candidate is an edit to this array.
 *
 * No weights, no credentials, and no host names live here — only identity and
 * intent. Where a model actually runs is deployment configuration
 * (LOCAL_LLM_BASE_URL), never source.
 *
 * NOTHING IN THIS FILE IS A PERFORMANCE CLAIM. Memory figures are the vendors'
 * published parameter counts and nothing more; throughput, latency, and how
 * many of these fit in the GB10's 128 GB of unified memory are UNKNOWN UNTIL
 * BENCHMARKED ON THE ACTUAL GB10.
 */

/** What a candidate is being evaluated for. Drives nothing; documents intent. */
export type ModelRole = "quality" | "performance" | "baseline";

export interface LocalModelConfig {
  /** Registry key. Stable, lowercase, used by LOCAL_LLM_MODEL and benchmarks. */
  id: string;
  /** Shown in the UI when this model answers. */
  displayName: string;
  /**
   * What the inference server is asked to load. vLLM normally serves the
   * Hugging Face repo id unless `--served-model-name` overrides it, so this is
   * the value that must match the deployment, not the registry key.
   */
  providerModelName: string;
  family: string;
  /** Why this candidate is on the list. */
  expectedUse: string;
  role: ModelRole;
  /**
   * Whether the model exposes a separate reasoning/thinking channel that the
   * runtime may return alongside the answer. Affects request shape and how a
   * response is read — not a quality claim.
   */
  reasoning: boolean;
  /** Published parameter count, for sizing conversations only. */
  parameters: string;
  /** Runtime notes that must not be discovered the hard way on deployment day. */
  notes: string;
  /** Whether this candidate is offered at all. */
  enabled: boolean;
}

export const LOCAL_MODELS: readonly LocalModelConfig[] = [
  {
    id: "gpt-oss-120b",
    displayName: "GPT-OSS 120B",
    providerModelName: "openai/gpt-oss-120b",
    family: "gpt-oss",
    expectedUse:
      "Quality-first candidate: complex reasoning, enterprise general assistance, and the eventual tool/agent workflows.",
    role: "quality",
    reasoning: true,
    parameters: "117B total / ~5.1B active (mixture of experts)",
    notes:
      "Mixture-of-experts, released at MXFP4 precision. Confirm the serving " +
      "runtime supports that quantisation on Blackwell before committing — a " +
      "runtime that silently upcasts changes the memory profile entirely. " +
      "Emits a separate reasoning channel; the response reader must not show " +
      "it to users as the answer.",
    enabled: true,
  },
  {
    id: "qwen3-30b-a3b",
    displayName: "Qwen3 30B-A3B",
    providerModelName: "Qwen/Qwen3-30B-A3B",
    family: "qwen3",
    expectedUse:
      "Performance-first candidate: lower latency and higher concurrency for everyday internal assistance.",
    role: "performance",
    reasoning: true,
    parameters: "30.5B total / ~3.3B active (mixture of experts)",
    notes:
      "Few active parameters per token, so the throughput candidate on paper — " +
      "unproven here until measured. Supports a switchable thinking mode; the " +
      "benchmark must pin one mode per run or the numbers are not comparable.",
    enabled: true,
  },
  {
    id: "gpt-oss-20b",
    displayName: "GPT-OSS 20B",
    providerModelName: "openai/gpt-oss-20b",
    family: "gpt-oss",
    expectedUse:
      "Lightweight baseline: development testing, latency comparison, and the fallback if the larger candidates do not fit the concurrency target.",
    role: "baseline",
    reasoning: true,
    parameters: "21B total / ~3.6B active (mixture of experts)",
    notes:
      "Same family as the 120B, so it is the honest control for family-level " +
      "behaviour: differences between the two are size, not training lineage.",
    enabled: true,
  },
];

export const getModel = (id: string): LocalModelConfig | undefined =>
  LOCAL_MODELS.find((model) => model.id === id.trim().toLowerCase());

export const enabledModels = (): LocalModelConfig[] =>
  LOCAL_MODELS.filter((model) => model.enabled);

/**
 * How a configured LOCAL_LLM_MODEL was understood.
 *
 * `registered` — matched a candidate above.
 * `unregistered` — not in the registry, and passed through to the inference
 *    server verbatim. Deliberately allowed: the registry documents our
 *    candidates, it does not restrict what the company may serve, and a
 *    deployment must never be blocked by this file being out of date.
 * `unset` — no model configured.
 */
export type ModelSelectionKind = "registered" | "unregistered" | "unset";

export interface ModelSelection {
  kind: ModelSelectionKind;
  /** What to send to the inference server. Null only when nothing is configured. */
  providerModelName: string | null;
  /** What to show a user. Null only when nothing is configured. */
  displayName: string | null;
  /** The registry entry, when there is one. */
  model: LocalModelConfig | null;
}

/**
 * Resolve a configured model name.
 *
 * Accepts either a registry id (`qwen3-30b-a3b`) or the provider's own name
 * (`Qwen/Qwen3-30B-A3B`), so operators can use whichever they have to hand.
 */
export function selectModel(configured: string | null | undefined): ModelSelection {
  const raw = configured?.trim();
  if (!raw) {
    return { kind: "unset", providerModelName: null, displayName: null, model: null };
  }

  const match =
    getModel(raw) ??
    LOCAL_MODELS.find(
      (model) => model.providerModelName.toLowerCase() === raw.toLowerCase()
    );

  if (match) {
    return {
      kind: "registered",
      providerModelName: match.providerModelName,
      displayName: match.displayName,
      model: match,
    };
  }

  return {
    kind: "unregistered",
    providerModelName: raw,
    displayName: raw,
    model: null,
  };
}
