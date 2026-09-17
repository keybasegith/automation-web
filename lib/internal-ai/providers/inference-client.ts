/**
 * The HTTP client for the company's own inference server.
 *
 * WHERE THIS TALKS TO
 * -------------------
 * Exactly one host: `config.baseUrl`, which comes from LOCAL_LLM_BASE_URL and
 * is expected to be a GB10 box on the internal network. There is no other URL
 * in this file, no fallback host, and no third-party SDK. It speaks the
 * chat-completions wire protocol because that is what vLLM and every other
 * serious local runtime expose — the protocol is a shape, not a vendor, and
 * using it is what lets us change runtime or model without touching the app.
 * No request ever leaves the company network.
 *
 * The URL is server-only. It is read in the config layer, held here, and never
 * serialised into a response, so no browser can learn where inference runs.
 *
 * `fetchImpl` is injectable so the whole client is testable against a fake
 * server. Nothing in the standard test suite needs a model.
 */

import { InternalAiError } from "@/lib/internal-ai/errors";
import type { LocalInferenceConfig } from "@/lib/internal-ai/config";
import { readSseData } from "@/lib/internal-ai/providers/sse";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatCompletionMessage {
  role: ChatRole;
  content: string;
}

export interface TokenUsage {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
}

export interface CompletionResult {
  /** The answer text. Never the reasoning channel. */
  text: string;
  /** The model the server says produced it, which may differ from what we asked for. */
  model: string;
  usage: TokenUsage;
}

/** One frame of a streamed completion. */
export type StreamFrame =
  | { type: "delta"; text: string }
  | { type: "done"; model: string | null; usage: TokenUsage };

export type FetchLike = (
  input: string,
  init: RequestInit
) => Promise<Response>;

export interface InferenceClient {
  complete(
    messages: readonly ChatCompletionMessage[],
    options?: { signal?: AbortSignal }
  ): Promise<CompletionResult>;
  stream(
    messages: readonly ChatCompletionMessage[],
    options?: { signal?: AbortSignal }
  ): AsyncGenerator<StreamFrame, void, undefined>;
  /** Liveness probe for the benchmark runner and the deployment checklist. */
  listModels(options?: { signal?: AbortSignal }): Promise<string[]>;
}

const UNAVAILABLE =
  "The local AI model is not reachable. Please try again, or contact IT if this continues.";

/** Everything a caller may see. The host and the model name stay in `detail`. */
const unavailable = (detail: string, cause?: unknown) =>
  new InternalAiError("model_unavailable", UNAVAILABLE, { detail, cause });

interface RawChoiceMessage {
  content?: unknown;
  reasoning_content?: unknown;
}

function textFrom(message: RawChoiceMessage): string {
  // Reasoning models return their thinking separately. We read `content` only:
  // a thinking channel is not an answer, and showing it would be misleading.
  return typeof message.content === "string" ? message.content : "";
}

function usageFrom(raw: unknown): TokenUsage {
  const usage = (raw ?? {}) as Record<string, unknown>;
  const int = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  return {
    promptTokens: int(usage.prompt_tokens),
    completionTokens: int(usage.completion_tokens),
    totalTokens: int(usage.total_tokens),
  };
}

export function createInferenceClient(
  config: LocalInferenceConfig,
  fetchImpl: FetchLike = fetch
): InferenceClient {
  const modelName = config.model.providerModelName;

  if (!modelName) {
    // Refusing here is deliberate: a server asked to complete with no model
    // either errors or silently picks one, and neither is acceptable when the
    // answer will be labelled with a model name in the UI.
    throw new InternalAiError(
      "model_unavailable",
      "The local AI model is not configured.",
      { detail: "LOCAL_LLM_BASE_URL is set but LOCAL_LLM_MODEL is empty" }
    );
  }

  /**
   * One request, with the whole-request timeout applied. The caller's signal
   * and our timeout both abort it; whichever fires first wins.
   */
  async function send(
    path: string,
    body: Record<string, unknown> | null,
    signal: AbortSignal | undefined,
    method: "GET" | "POST"
  ): Promise<Response> {
    const timeout = AbortSignal.timeout(config.timeoutMs);
    const abort = signal ? AbortSignal.any([signal, timeout]) : timeout;

    let response: Response;
    try {
      response = await fetchImpl(`${config.baseUrl}${path}`, {
        method,
        headers: { "content-type": "application/json", accept: "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: abort,
        // No credentials and no cookies: this is a server-to-server call on the
        // internal network, not a browser request.
        cache: "no-store",
      });
    } catch (err) {
      if (timeout.aborted) {
        throw unavailable(`request exceeded ${config.timeoutMs}ms`, err);
      }
      if (signal?.aborted) {
        // The caller gave up (client disconnected). Not a server fault.
        throw unavailable("request aborted by caller", err);
      }
      throw unavailable("could not reach the inference server", err);
    }

    if (!response.ok) {
      // The body may explain the fault, but it can echo the prompt, so it is
      // read only for its length and never logged or returned.
      throw unavailable(
        `inference server returned HTTP ${response.status}`,
        undefined
      );
    }

    return response;
  }

  function requestBody(
    messages: readonly ChatCompletionMessage[],
    stream: boolean
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: modelName,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      stream,
    };
    if (stream) {
      // Ask for the usage block on the final frame; servers omit it otherwise.
      body.stream_options = { include_usage: true };
    }
    if (config.reasoningEffort) {
      body.reasoning_effort = config.reasoningEffort;
    }
    return body;
  }

  return {
    async complete(messages, options = {}) {
      const response = await send(
        "/v1/chat/completions",
        requestBody(messages, false),
        options.signal,
        "POST"
      );

      let payload: unknown;
      try {
        payload = await response.json();
      } catch (err) {
        throw unavailable("inference server returned a body that was not JSON", err);
      }

      const body = (payload ?? {}) as Record<string, unknown>;
      const choices = Array.isArray(body.choices) ? body.choices : [];
      const first = (choices[0] ?? null) as Record<string, unknown> | null;
      const message = (first?.message ?? null) as RawChoiceMessage | null;

      if (!message) {
        throw unavailable("inference server returned no choices");
      }

      const text = textFrom(message).trim();
      if (!text) {
        // An empty answer is a failure, not an answer. Surfacing a blank bubble
        // would read as the model having nothing to say.
        throw unavailable(
          first?.finish_reason === "length"
            ? "response was empty; generation hit the token limit"
            : "inference server returned an empty message"
        );
      }

      return {
        text,
        model: typeof body.model === "string" && body.model ? body.model : modelName,
        usage: usageFrom(body.usage),
      };
    },

    async *stream(messages, options = {}) {
      const response = await send(
        "/v1/chat/completions",
        requestBody(messages, true),
        options.signal,
        "POST"
      );

      if (!response.body) {
        throw unavailable("inference server returned no stream body");
      }

      let model: string | null = null;
      let usage: TokenUsage = {
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
      };

      for await (const raw of readSseData(response.body)) {
        let frame: Record<string, unknown>;
        try {
          frame = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          // One malformed frame must not abort a good stream; the sentinel and
          // the final usage frame still decide when it ends.
          continue;
        }

        if (typeof frame.model === "string" && frame.model) model = frame.model;
        if (frame.usage) usage = usageFrom(frame.usage);

        const choices = Array.isArray(frame.choices) ? frame.choices : [];
        const delta = (choices[0] as Record<string, unknown> | undefined)?.delta as
          | Record<string, unknown>
          | undefined;
        const text = delta?.content;
        if (typeof text === "string" && text.length > 0) {
          yield { type: "delta", text };
        }
      }

      yield { type: "done", model, usage };
    },

    async listModels(options = {}) {
      const response = await send("/v1/models", null, options.signal, "GET");
      let payload: unknown;
      try {
        payload = await response.json();
      } catch (err) {
        throw unavailable("model listing was not JSON", err);
      }
      const data = (payload as Record<string, unknown>)?.data;
      if (!Array.isArray(data)) return [];
      return data
        .map((entry) => (entry as Record<string, unknown>)?.id)
        .filter((id): id is string => typeof id === "string");
    },
  };
}
