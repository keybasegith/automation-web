/**
 * The single configuration layer for Internal AI.
 *
 * Every environment variable this feature reads is read here and nowhere else,
 * so the inference target can move without touching a route, a provider, or a
 * component. None of these variables is required: with an empty environment
 * the feature runs on the mock provider.
 *
 * Server-only. Nothing here is prefixed NEXT_PUBLIC_, so no value in this file
 * can reach a browser bundle.
 */

import type { AttachmentLimits } from "@/lib/internal-ai/attachments";
import { selectModel, type ModelSelection } from "@/lib/internal-ai/models";

/** Which implementation of `LLMProvider` answers a request. */
export type InternalAiProviderMode = "mock" | "local";

/** Generation settings sent to the inference server. */
export interface LocalInferenceConfig {
  /** Base URL of the internal inference server. Server-only, never sent to a browser. */
  baseUrl: string;
  /** The resolved model, from the registry or passed through verbatim. */
  model: ModelSelection;
  /** Whole-request budget in milliseconds, enforced with an AbortSignal. */
  timeoutMs: number;
  /** Upper bound on generated tokens per response. */
  maxTokens: number;
  /** Sampling temperature. */
  temperature: number;
  /**
   * Reasoning effort for models that expose a thinking channel. Null leaves it
   * to the server's own default rather than asserting one.
   */
  reasoningEffort: "low" | "medium" | "high" | null;
}

export interface InternalAiConfig {
  /** Master switch. False makes the page and the API 404. */
  enabled: boolean;
  /**
   * Derived, never set directly: pointing LOCAL_LLM_BASE_URL at an inference
   * server is what selects the local provider. Until that provider is built,
   * setting it produces an explicit "not implemented" error rather than a
   * silent fallback to the mock — a deployment cannot half-connect.
   */
  providerMode: InternalAiProviderMode;
  /** Base URL of the self-hosted inference server (e.g. the GB10 vLLM host). */
  localBaseUrl: string | null;
  /** Model name to request from that server, as configured. */
  localModel: string | null;
  /**
   * Everything the local provider needs, or null in mock mode. Present exactly
   * when providerMode is "local", so the provider cannot be constructed
   * half-configured.
   */
  localInference: LocalInferenceConfig | null;
  /** Longest single message accepted, in characters. */
  maxMessageLength: number;
  /** Attachment ceilings, applied in the browser and enforced on the server. */
  attachments: AttachmentLimits;
}

function str(name: string): string | null {
  const raw = process.env[name];
  return raw && raw.trim() ? raw.trim() : null;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === "") return fallback;
  return raw === "true" || raw === "1" || raw === "yes";
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || !raw.trim()) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Allows 0, unlike `num`, which treats 0 as "unset". Temperature 0 is valid. */
function float(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw || !raw.trim()) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function reasoningEffort(): LocalInferenceConfig["reasoningEffort"] {
  const raw = process.env.LOCAL_LLM_REASONING_EFFORT?.trim().toLowerCase();
  return raw === "low" || raw === "medium" || raw === "high" ? raw : null;
}

/** Trailing slashes make `${base}/v1/...` produce doubled separators. */
const trimTrailingSlash = (url: string): string => url.replace(/\/+$/, "");

export function getInternalAiConfig(): InternalAiConfig {
  const rawBaseUrl = str("LOCAL_LLM_BASE_URL");
  const localBaseUrl = rawBaseUrl ? trimTrailingSlash(rawBaseUrl) : null;
  const localModel = str("LOCAL_LLM_MODEL");

  return {
    enabled: bool("INTERNAL_AI_ENABLED", true),
    // Mock is the default and stays the default: pointing this at an inference
    // server is the only way to enable real inference, and doing so disables
    // the mock entirely rather than adding a fallback to it.
    providerMode: localBaseUrl ? "local" : "mock",
    localBaseUrl,
    localModel,
    localInference: localBaseUrl
      ? {
          baseUrl: localBaseUrl,
          model: selectModel(localModel),
          timeoutMs: num("LOCAL_LLM_TIMEOUT_MS", 120_000),
          maxTokens: num("LOCAL_LLM_MAX_TOKENS", 2048),
          temperature: float("LOCAL_LLM_TEMPERATURE", 0.2, 0, 2),
          reasoningEffort: reasoningEffort(),
        }
      : null,
    maxMessageLength: num("INTERNAL_AI_MAX_MESSAGE_LENGTH", 4000),
    attachments: {
      maxCount: num("INTERNAL_AI_MAX_ATTACHMENTS", 10),
      maxBytesPerFile: num("INTERNAL_AI_MAX_ATTACHMENT_MB", 25) * 1024 * 1024,
      maxTotalBytes: num("INTERNAL_AI_MAX_UPLOAD_MB", 50) * 1024 * 1024,
    },
  };
}
