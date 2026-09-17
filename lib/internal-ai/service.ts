/**
 * The chat service.
 *
 * Sits between the route and the provider so the route stays a thin HTTP
 * shell: it reads a body, this answers it, the route writes the result. When
 * transcripts become persistent this is where the write goes, and neither the
 * route nor the UI changes.
 */

import { toSummary } from "@/lib/internal-ai/attachments";
import { getInternalAiConfig } from "@/lib/internal-ai/config";
import { InternalAiError } from "@/lib/internal-ai/errors";
import { newConversationId } from "@/lib/internal-ai/conversation";
import { getLLMProvider } from "@/lib/internal-ai/providers/llm-provider";
import { buildTurnRecords, persistTurn } from "@/lib/internal-ai/transcript";
import type { ChatResponse, ChatSubmission } from "@/lib/internal-ai/types";
import type { InternalAiUser } from "@/lib/internal-ai/session";

export async function respondToChatMessage(
  submission: ChatSubmission,
  user: InternalAiUser
): Promise<ChatResponse> {
  const config = getInternalAiConfig();
  if (!config.enabled) {
    throw new InternalAiError("disabled", "Internal AI is not available.", {
      detail: "INTERNAL_AI_ENABLED is false",
    });
  }

  const conversationId = submission.conversationId ?? newConversationId();
  const provider = await getLLMProvider(config);
  const result = await provider.generateResponse({
    message: submission.message,
    conversationId,
    attachments: submission.attachments,
  });

  // Phase 1 keeps no transcripts; this is the seam, not a write. See transcript.ts.
  await persistTurn(
    buildTurnRecords({
      conversationId,
      userId: user.id,
      prompt: submission.message,
      reply: result.message,
      model: result.model,
      // Metadata only. Uploaded bytes go out of scope when this call returns.
      attachments: submission.attachments.map(toSummary),
    })
  );

  return {
    message: result.message,
    conversationId,
    model: result.model,
    status: result.status,
  };
}
