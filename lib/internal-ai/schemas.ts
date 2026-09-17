/**
 * Request parsing.
 *
 * The route accepts nothing it has not checked here. Rejections carry a
 * user-readable reason and never quote the submitted content back.
 */

import {
  checkAttachment,
  type AttachmentPayload,
} from "@/lib/internal-ai/attachments";
import type { InternalAiConfig } from "@/lib/internal-ai/config";
import { InternalAiError } from "@/lib/internal-ai/errors";
import type { ChatRequest, ChatSubmission } from "@/lib/internal-ai/types";

/** Conversation ids are minted by `newConversationId`; only that shape is accepted back. */
const CONVERSATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseChatRequest(body: unknown, maxMessageLength: number): ChatRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new InternalAiError("invalid_request", "That request could not be read.", {
      detail: `body was ${body === null ? "null" : typeof body}`,
    });
  }

  const { message, conversationId } = body as Record<string, unknown>;

  if (typeof message !== "string") {
    throw new InternalAiError("invalid_request", "A message is required.", {
      detail: `message was ${typeof message}`,
    });
  }

  const trimmed = message.trim();
  if (!trimmed) {
    throw new InternalAiError("invalid_request", "A message is required.", {
      detail: "message was empty after trimming",
    });
  }
  if (trimmed.length > maxMessageLength) {
    throw new InternalAiError(
      "invalid_request",
      `Messages are limited to ${maxMessageLength.toLocaleString("en-US")} characters.`,
      { detail: `message was ${trimmed.length} characters` }
    );
  }

  if (conversationId !== undefined) {
    if (typeof conversationId !== "string" || !CONVERSATION_ID.test(conversationId)) {
      throw new InternalAiError("invalid_request", "That conversation could not be read.", {
        detail: "conversationId was not a valid identifier",
      });
    }
  }

  return {
    message: trimmed,
    conversationId: conversationId as string | undefined,
  };
}

/**
 * The multipart form of the same request.
 *
 * Fields: `message` (may be blank when files are attached), `conversationId`,
 * and any number of `attachments` file parts. Every file is re-checked here
 * against the same policy the browser applied — the browser's word is never
 * taken for a type or a size.
 */
export async function parseChatForm(
  form: FormData,
  config: InternalAiConfig
): Promise<ChatSubmission> {
  const rawMessage = form.get("message");
  const rawConversationId = form.get("conversationId");

  const files = form
    .getAll("attachments")
    .filter((entry): entry is File => entry instanceof File);

  if (files.length > config.attachments.maxCount) {
    throw new InternalAiError(
      "invalid_request",
      `Up to ${config.attachments.maxCount} files can be attached to one message.`,
      { detail: `${files.length} files submitted` }
    );
  }

  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
  if (!message && files.length === 0) {
    throw new InternalAiError("invalid_request", "A message or a file is required.", {
      detail: "empty message with no attachments",
    });
  }
  if (message.length > config.maxMessageLength) {
    throw new InternalAiError(
      "invalid_request",
      `Messages are limited to ${config.maxMessageLength.toLocaleString("en-US")} characters.`,
      { detail: `message was ${message.length} characters` }
    );
  }

  let conversationId: string | undefined;
  if (typeof rawConversationId === "string" && rawConversationId) {
    if (!CONVERSATION_ID.test(rawConversationId)) {
      throw new InternalAiError("invalid_request", "That conversation could not be read.", {
        detail: "conversationId was not a valid identifier",
      });
    }
    conversationId = rawConversationId;
  }

  const attachments: AttachmentPayload[] = [];
  let bytesSoFar = 0;
  for (const file of files) {
    const descriptor = { name: file.name, mimeType: file.type, sizeBytes: file.size };
    const check = checkAttachment(descriptor, config.attachments, {
      count: attachments.length,
      bytes: bytesSoFar,
    });
    if (!check.ok) {
      throw new InternalAiError("invalid_request", check.rejection.message, {
        detail: `attachment rejected: ${check.rejection.reason}`,
      });
    }
    attachments.push({
      ...descriptor,
      kind: check.kind,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    bytesSoFar += file.size;
  }

  return { message, conversationId, attachments };
}
