/**
 * Domain types for Internal AI.
 *
 * Shared by the API route, the provider layer, and the browser, so the wire
 * shape is written down once. Nothing here depends on a particular model or
 * inference server — that lives entirely behind `LLMProvider`.
 */

import type {
  AttachmentPayload,
  AttachmentSummary,
} from "@/lib/internal-ai/attachments";

export type ChatRole = "user" | "assistant";

/**
 * How far the response got.
 *
 * `model_not_connected` is the honest Phase 1 answer: the request was accepted
 * and answered by the mock provider, and no model ran. A real local model
 * returns `ok`. The UI never renders a connected state off anything else.
 */
export type InternalAiStatus = "ok" | "model_not_connected";

/** One turn in a conversation, as the browser holds it. */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** ISO-8601, set when the turn was created. */
  createdAt: string;
  /** The model behind an assistant turn; null for user turns. */
  model: string | null;
  /** Files sent with a user turn. Metadata only; the bytes are not kept. */
  attachments?: readonly ChatAttachment[];
}

/** An attachment as the transcript shows it, with a local preview if it is an image. */
export interface ChatAttachment extends AttachmentSummary {
  id: string;
  /** Object URL for an image thumbnail. Revoked when the conversation resets. */
  previewUrl: string | null;
}

/**
 * The persisted shape a future `internal_ai_messages` table should carry.
 *
 * Phase 1 keeps conversations in browser state and writes no rows — this
 * interface exists so the storage layer, when it arrives, does not force a
 * change to the API contract or the UI. Column mapping is 1:1:
 *
 *   conversation_id uuid   message_id uuid   user_id uuid
 *   role text              content text      model text null
 *   created_at timestamptz
 */
export interface StoredChatMessage {
  id: string;
  conversationId: string;
  /** Author of the conversation — the signed-in internal user. */
  userId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  model: string | null;
  /**
   * Attachment metadata only. File content is never included here: a future
   * phase must decide where bytes live and for how long before any is stored.
   *
   *   internal_ai_message_attachments
   *     id          uuid primary key
   *     message_id  uuid not null references internal_ai_messages(id)
   *     name text   mime_type text   size_bytes bigint   kind text
   */
  attachments: AttachmentSummary[];
}

/**
 * POST /api/internal-ai/chat request body (application/json).
 *
 * The multipart form of the same endpoint carries the same two fields plus
 * repeated `attachments` file parts.
 */
export interface ChatRequest {
  message: string;
  conversationId?: string;
}

/** A validated submission, whichever content type carried it. */
export interface ChatSubmission {
  message: string;
  conversationId?: string;
  attachments: AttachmentPayload[];
}

/** POST /api/internal-ai/chat success body. */
export interface ChatResponse {
  message: string;
  conversationId: string;
  model: string;
  status: InternalAiStatus;
}

/** POST /api/internal-ai/chat failure body. */
export interface ChatErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
