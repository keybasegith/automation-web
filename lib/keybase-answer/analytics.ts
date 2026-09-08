/**
 * Operational analytics.
 *
 * What is recorded is what the feature *did* — which stage it reached, how long
 * retrieval and generation took, whether the cache was hit, how many sources
 * were used, how it ended. What is not recorded is what anybody asked: no
 * question text, no address, no identifier that survives the request. A
 * question hash exists so feedback can be tied to the answer it was about, and
 * a hash cannot be read back into a question.
 *
 * The repository has no analytics vendor, so events go to the same Postgres the
 * feature already uses and to the server log. Adding a vendor later means
 * changing `recordEvent` and nothing else.
 */

import { createHash, randomUUID } from "node:crypto";
import { isConfigured, query } from "@/lib/keybase-answer/db";
import { normalizeQuestion } from "@/lib/keybase-answer/normalize-question";

export type KeybaseAnswerEvent =
  | "keybase_answer_home_impression"
  | "keybase_answer_home_cta"
  | "keybase_answer_view"
  | "keybase_answer_suggested_question"
  | "keybase_answer_submit"
  | "keybase_answer_cache_hit"
  | "keybase_answer_generated"
  | "keybase_answer_insufficient_evidence"
  | "keybase_answer_restricted"
  | "keybase_answer_out_of_scope"
  | "keybase_answer_rate_limit"
  | "keybase_answer_error"
  | "keybase_answer_source_click"
  | "keybase_answer_feedback"
  | "keybase_answer_new_question";

/** Every event name, so the client route can reject anything else. */
export const KEYBASE_ANSWER_EVENTS: KeybaseAnswerEvent[] = [
  "keybase_answer_home_impression",
  "keybase_answer_home_cta",
  "keybase_answer_view",
  "keybase_answer_suggested_question",
  "keybase_answer_submit",
  "keybase_answer_cache_hit",
  "keybase_answer_generated",
  "keybase_answer_insufficient_evidence",
  "keybase_answer_restricted",
  "keybase_answer_out_of_scope",
  "keybase_answer_rate_limit",
  "keybase_answer_error",
  "keybase_answer_source_click",
  "keybase_answer_feedback",
  "keybase_answer_new_question",
];

export function isKeybaseAnswerEvent(value: unknown): value is KeybaseAnswerEvent {
  return (
    typeof value === "string" &&
    (KEYBASE_ANSWER_EVENTS as string[]).includes(value)
  );
}

/**
 * Values an event may carry. Scalars only — a nested object is how a question
 * or a source passage ends up in an analytics row by accident.
 */
export type EventProperties = Record<string, string | number | boolean | null>;

/** Stable, one-way handle for a question. Never reversible into the question. */
export function questionHash(question: string): string {
  return createHash("sha256")
    .update(normalizeQuestion(question))
    .digest("hex")
    .slice(0, 32);
}

export function newRequestId(): string {
  return randomUUID();
}

/**
 * Record one event. Never throws and never blocks the answer: analytics that
 * can fail a request is worse than no analytics.
 */
export async function recordEvent(
  name: KeybaseAnswerEvent,
  properties: EventProperties = {},
  requestId?: string,
): Promise<void> {
  console.info(
    `[keybase-answer] ${name} ${JSON.stringify({ requestId, ...properties })}`,
  );
  if (!isConfigured()) return;
  try {
    await query(
      `insert into ka_events (id, name, request_id, properties)
       values ($1, $2, $3, $4::jsonb)`,
      [randomUUID(), name, requestId ?? null, JSON.stringify(properties)],
    );
  } catch (err) {
    console.warn("[keybase-answer] event write failed:", err);
  }
}

/** Fire and forget, for call sites on the answer's critical path. */
export function trackEvent(
  name: KeybaseAnswerEvent,
  properties: EventProperties = {},
  requestId?: string,
): void {
  void recordEvent(name, properties, requestId).catch(() => {});
}

export interface FeedbackInput {
  responseId: string;
  questionHash: string;
  helpful: boolean;
  model: string;
  sourceIds: string[];
}

export async function recordFeedback(input: FeedbackInput): Promise<void> {
  trackEvent("keybase_answer_feedback", {
    helpful: input.helpful,
    sourceCount: input.sourceIds.length,
    model: input.model,
  });
  if (!isConfigured()) return;
  try {
    await query(
      `insert into ka_feedback
         (id, response_id, question_hash, helpful, model, source_ids)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        randomUUID(),
        input.responseId,
        input.questionHash,
        input.helpful,
        input.model,
        input.sourceIds,
      ],
    );
  } catch (err) {
    console.warn("[keybase-answer] feedback write failed:", err);
  }
}
