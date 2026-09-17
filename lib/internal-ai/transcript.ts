/**
 * Where conversation storage will go.
 *
 * Phase 1 stores nothing. That is a decision, not an omission: internal
 * prompts are the most sensitive content this feature will ever hold, and
 * there is no retention or access policy for them yet, so the safest store is
 * none. A conversation lives in the browser tab that started it.
 *
 * `buildTurnRecords` still assembles the rows a turn *would* write, so the
 * schema is fixed, typed, and tested before anything depends on it, and
 * `persistTurn` is the single place to implement the write. Nothing above this
 * file changes when it does.
 *
 * The target table, when it is created:
 *
 *   internal_ai_messages
 *     id              uuid primary key
 *     conversation_id uuid not null
 *     user_id         uuid not null
 *     role            text not null check (role in ('user','assistant'))
 *     content         text not null
 *     model           text null
 *     created_at      timestamptz not null default now()
 *
 *   internal_ai_message_attachments
 *     id          uuid primary key
 *     message_id  uuid not null references internal_ai_messages(id) on delete cascade
 *     name        text not null
 *     mime_type   text not null
 *     size_bytes  bigint not null
 *     kind        text not null check (kind in ('image','document'))
 *
 * Note what that second table does NOT have: a column for file content. Where
 * uploaded bytes would live, how long they would be kept, and who could read
 * them back are decisions for the phase that needs them, not defaults to
 * inherit by accident.
 */

import type { AttachmentSummary } from "@/lib/internal-ai/attachments";
import { newMessageId } from "@/lib/internal-ai/conversation";
import type { StoredChatMessage } from "@/lib/internal-ai/types";

/** Phase 1 writes no transcripts. Flipping this requires implementing `persistTurn`. */
export const TRANSCRIPT_PERSISTENCE_ENABLED = false;

export interface TurnInput {
  conversationId: string;
  userId: string;
  prompt: string;
  reply: string;
  model: string;
  /** Metadata for the files sent with the prompt. Never their content. */
  attachments?: readonly AttachmentSummary[];
}

/** The two rows one exchange produces, in order. */
export function buildTurnRecords(turn: TurnInput): StoredChatMessage[] {
  const createdAt = new Date().toISOString();
  return [
    {
      id: newMessageId(),
      conversationId: turn.conversationId,
      userId: turn.userId,
      role: "user",
      content: turn.prompt,
      createdAt,
      model: null,
      attachments: [...(turn.attachments ?? [])],
    },
    {
      id: newMessageId(),
      conversationId: turn.conversationId,
      userId: turn.userId,
      role: "assistant",
      content: turn.reply,
      createdAt,
      model: turn.model,
      attachments: [],
    },
  ];
}

export async function persistTurn(records: StoredChatMessage[]): Promise<void> {
  if (!TRANSCRIPT_PERSISTENCE_ENABLED) return;
  throw new Error(
    `internal-ai transcript persistence is not implemented (${records.length} rows dropped)`
  );
}
