/**
 * Conversation identity.
 *
 * Phase 1 stores no transcripts: a conversation lives in the browser tab that
 * started it, and the server keeps only the id long enough to answer one
 * request. Ids are minted here so that, when persistence arrives, the primary
 * keys are already the shape the schema in `StoredChatMessage` expects.
 */

import { randomUUID } from "node:crypto";

export function newConversationId(): string {
  return randomUUID();
}

export function newMessageId(): string {
  return randomUUID();
}
