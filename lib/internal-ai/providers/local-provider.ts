/**
 * The self-hosted provider.
 *
 * Reached only when LOCAL_LLM_BASE_URL is set. When it is not — the default,
 * and the state of every environment until the GB10 is racked — the resolver
 * returns the mock instead and this file is never loaded.
 *
 * NO SILENT FALLBACK. If a deployment is configured for a real model and that
 * model is unreachable, slow, or answering nonsense, this raises
 * `model_unavailable` and the user sees an error. It must never hand back
 * placeholder text that would read as though a model had answered — a wrong
 * answer that looks real is worse than an outage that looks like one.
 *
 * Attachments are declined explicitly rather than ignored. Sending a document
 * to a text endpoint and answering from the filename alone would look like the
 * file had been read. Multimodal handling is a later phase.
 */

import type { InternalAiConfig } from "@/lib/internal-ai/config";
import { InternalAiError } from "@/lib/internal-ai/errors";
import {
  createInferenceClient,
  type ChatCompletionMessage,
  type FetchLike,
  type InferenceClient,
} from "@/lib/internal-ai/providers/inference-client";
import type {
  LLMGenerateInput,
  LLMGenerateResult,
  LLMProvider,
} from "@/lib/internal-ai/providers/llm-provider";

/**
 * The standing instruction sent with every message.
 *
 * Kept short and factual. It states the setting and the boundaries the model
 * genuinely has in this phase; it does not claim access to company documents,
 * because the model has none until RAG exists.
 */
export const SYSTEM_PROMPT = [
  "You are the internal AI assistant for Keybase Financial Group, running on the",
  "company's own hardware. You are used by employees for general work assistance.",
  "",
  "Answer from your own knowledge. You have no access to company documents,",
  "client records, or live systems, so if a question needs those, say so plainly",
  "instead of guessing. Do not invent policies, figures, or regulations; if you",
  "are unsure, say you are unsure.",
  "",
  "Be direct and concise. Prefer plain language over hedging.",
].join("\n");

export function createLocalProvider(
  config: InternalAiConfig,
  /** Injectable for tests; production always uses the process's own fetch. */
  fetchImpl?: FetchLike
): LLMProvider {
  const inference = config.localInference;
  if (!inference) {
    // Unreachable through the resolver, which only builds this in local mode.
    throw new InternalAiError(
      "model_unavailable",
      "The local AI model is not configured.",
      { detail: "createLocalProvider called without localInference config" }
    );
  }

  let client: InferenceClient | null = null;
  const getClient = (): InferenceClient => {
    client ??= createInferenceClient(inference, fetchImpl);
    return client;
  };

  return {
    id: "local",

    async generateResponse(input: LLMGenerateInput): Promise<LLMGenerateResult> {
      if (input.attachments && input.attachments.length > 0) {
        throw new InternalAiError(
          "invalid_request",
          "This assistant cannot read attachments yet. Please describe the " +
            "content in your message instead.",
          { detail: `${input.attachments.length} attachment(s) declined` }
        );
      }

      const messages: ChatCompletionMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: input.message },
      ];

      const result = await getClient().complete(messages);

      return {
        message: result.text,
        // The server's own answer for what ran, not what we asked for: if the
        // deployment is serving something else, the UI should say so.
        model: result.model,
        status: "ok",
      };
    },
  };
}
