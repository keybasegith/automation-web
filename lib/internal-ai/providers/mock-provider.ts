/**
 * The Phase 1 provider.
 *
 * It runs no model and does not pretend to. Every request gets the same
 * statement of fact, so the whole path — auth, validation, uploads, the route,
 * the conversation handling, the UI's loading and error states — is exercised
 * before any hardware exists, and nobody can mistake its output for an answer.
 *
 * Attachments are acknowledged by name and size so a user can confirm the
 * upload arrived intact, and are explicitly declared unread: no model has
 * looked at them. The file content is never opened, and the prompt is never
 * echoed, stored, or logged.
 */

import { formatBytes } from "@/lib/internal-ai/attachments";
import type {
  LLMGenerateInput,
  LLMGenerateResult,
  LLMProvider,
} from "@/lib/internal-ai/providers/llm-provider";

export const MOCK_MODEL_ID = "mock";

export const MOCK_RESPONSE =
  "The local AI model is not connected yet. This interface is ready for " +
  "deployment once the company GB10 system is available.";

/** Longest list of filenames worth reading back before it stops being useful. */
const MAX_LISTED = 10;

function describeAttachments(input: LLMGenerateInput): string {
  const attachments = input.attachments ?? [];
  if (attachments.length === 0) return "";

  const listed = attachments.slice(0, MAX_LISTED);
  const lines = listed.map(
    (file) => `• ${file.name} (${file.kind}, ${formatBytes(file.sizeBytes)})`
  );
  const remainder = attachments.length - listed.length;
  if (remainder > 0) lines.push(`• …and ${remainder} more`);

  const count = `${attachments.length} file${attachments.length === 1 ? "" : "s"}`;
  return (
    `\n\nReceived ${count}:\n${lines.join("\n")}\n\n` +
    "Nothing has read them. They were not stored, and they were not sent " +
    "anywhere outside this system."
  );
}

export function createMockProvider(): LLMProvider {
  return {
    id: "mock",
    async generateResponse(input: LLMGenerateInput): Promise<LLMGenerateResult> {
      return {
        message: MOCK_RESPONSE + describeAttachments(input),
        model: MOCK_MODEL_ID,
        status: "model_not_connected",
      };
    },
  };
}
