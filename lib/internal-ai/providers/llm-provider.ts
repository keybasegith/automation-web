/**
 * The model seam.
 *
 * Everything above this file — the API route, the service, the UI — talks to
 * `LLMProvider` and knows nothing about how a response is produced. Connecting
 * the company's own inference server later means writing one more
 * implementation and returning it from `getLLMProvider`; no caller changes.
 *
 * There is deliberately no provider here that reaches an external AI service,
 * and none is ever to be added: Internal AI answers from company-controlled
 * infrastructure or it does not answer.
 */

import type { AttachmentPayload } from "@/lib/internal-ai/attachments";
import { getInternalAiConfig, type InternalAiConfig } from "@/lib/internal-ai/config";
import type { InternalAiStatus } from "@/lib/internal-ai/types";

export interface LLMGenerateInput {
  message: string;
  conversationId?: string;
  /**
   * Files sent with this message, content included, valid only for the life of
   * the call. A provider that cannot interpret a file must say so rather than
   * answer around it; a multimodal local model will read `bytes` here.
   */
  attachments?: readonly AttachmentPayload[];
}

export interface LLMGenerateResult {
  message: string;
  /** Identifies what produced the text. Surfaced to the user, so it must be true. */
  model: string;
  /** Whether a real model answered. See InternalAiStatus. */
  status: InternalAiStatus;
}

export interface LLMProvider {
  /** Stable identifier for logs and diagnostics. */
  readonly id: string;
  generateResponse(input: LLMGenerateInput): Promise<LLMGenerateResult>;
}

/**
 * The provider for the current configuration.
 *
 * Loaded lazily so the local provider's module is never pulled into a request
 * that runs on the mock, and vice versa.
 */
export async function getLLMProvider(
  config: InternalAiConfig = getInternalAiConfig()
): Promise<LLMProvider> {
  if (config.providerMode === "local") {
    const { createLocalProvider } = await import(
      "@/lib/internal-ai/providers/local-provider"
    );
    return createLocalProvider(config);
  }
  const { createMockProvider } = await import(
    "@/lib/internal-ai/providers/mock-provider"
  );
  return createMockProvider();
}
