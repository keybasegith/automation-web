/**
 * Request-shape validation and the two bounded responses that never reach the
 * model at all: out-of-scope questions and personalized-recommendation
 * requests where Keybase has nothing educational to offer.
 *
 * Note the split of responsibility. This module refuses only what is *shaped*
 * wrong — an empty body, an essay instead of a question, a non-financial topic.
 * Everything else, including a question that tries to talk the system out of
 * its instructions, goes down the normal grounded pipeline: the system
 * instruction and citation validation are what contain it, not a keyword ban.
 */

import { getConfig } from "@/lib/keybase-answer/config";
import { KeybaseAnswerError } from "@/lib/keybase-answer/errors";
import { cleanQuestion } from "@/lib/keybase-answer/normalize-question";

/**
 * Things a visitor must not paste into a public form. Matching does not reject
 * the question — the input already warns, and refusing to answer would teach
 * nobody anything — but it does mark the question unloggable.
 */
const SENSITIVE_PATTERNS: RegExp[] = [
  /\b\d{3}[ -]?\d{3}[ -]?\d{3}\b/, // SIN
  /\b(?:\d[ -]?){13,19}\b/, // card / account numbers
  /\baccount (?:number|no\.?|#)\s*[:#]?\s*\S+/i,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // email address
];

export function containsSensitiveData(question: string): boolean {
  return SENSITIVE_PATTERNS.some((re) => re.test(question));
}

/**
 * A question safe to write to a log or an analytics row: dropped entirely when
 * it looks like it carries personal data, truncated otherwise. Operational
 * logging must never become a second copy of a visitor's finances.
 */
export function redactForLogs(question: string): string {
  if (containsSensitiveData(question)) return "[redacted: possible personal data]";
  return question.length > 180 ? `${question.slice(0, 177)}...` : question;
}

export interface ValidatedQuestion {
  /** Tidied, meaning-preserving, ready for the model and for display. */
  question: string;
  /** True when the text matched a sensitive-data pattern. */
  sensitive: boolean;
}

/**
 * Validate a submitted question. Throws {@link KeybaseAnswerError} with a code
 * the API turns into a status; the messages here are visitor-facing.
 */
export function validateQuestion(input: unknown): ValidatedQuestion {
  if (typeof input !== "string") {
    throw new KeybaseAnswerError(
      "invalid_request",
      "That request could not be read. Please try asking again.",
      { detail: `question was ${typeof input}` },
    );
  }

  const question = cleanQuestion(input);
  if (question.length === 0) {
    throw new KeybaseAnswerError(
      "question_empty",
      "Enter a financial question to get started.",
    );
  }

  const { maxQuestionLength } = getConfig();
  if (question.length > maxQuestionLength) {
    throw new KeybaseAnswerError(
      "question_too_long",
      `Questions are limited to ${maxQuestionLength} characters. Please shorten your question.`,
    );
  }

  return { question, sensitive: containsSensitiveData(question) };
}

/** Body-level validation, before the question itself is looked at. */
export function readQuestionFromBody(body: unknown): ValidatedQuestion {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new KeybaseAnswerError(
      "invalid_request",
      "That request could not be read. Please try asking again.",
      { detail: "body was not a JSON object" },
    );
  }
  return validateQuestion((body as { question?: unknown }).question);
}

/**
 * The response to a question with nothing financial in it. Written once, here,
 * so the wording cannot drift between the API and the UI.
 */
export const OUT_OF_SCOPE_SUMMARY =
  "Keybase Answer is designed for financial questions and questions about Keybase Financial Group's published insights.";

export const OUT_OF_SCOPE_EXAMPLES = [
  "How are interest rates affecting Canadian markets?",
  "Why do bond prices move when interest rates change?",
  "What should investors understand about market volatility?",
];

/**
 * The opening line for a request for individualized recommendations. The
 * pipeline follows it with whatever educational material retrieval found on the
 * same topic — the point is to redirect, not to hand back a wall of legal text.
 */
export const PERSONALIZED_ADVICE_SUMMARY =
  "Keybase Answer is designed to explain financial concepts and Keybase's published insights rather than provide individualized investment recommendations. Here is the general background we publish on this topic.";

/** Shown when a personalized request has no educational material behind it. */
export const PERSONALIZED_ADVICE_ONLY_SUMMARY =
  "Keybase Answer is designed to explain financial concepts and Keybase's published insights rather than provide individualized investment recommendations. A Keybase advisor can review your circumstances and discuss what is appropriate for you.";

/** Shown when retrieval finds nothing solid enough to answer from. */
export const INSUFFICIENT_EVIDENCE_SUMMARY =
  "We couldn't find enough information in Keybase's published insights to provide a reliable answer to that question.";

/** Shown when a question asks for the latest position and the index is stale. */
export const STALE_EVIDENCE_SUMMARY =
  "Keybase Answer doesn't currently have sufficiently recent Keybase material to answer that reliably. Rather than fill the gap from outside sources, we'd rather say so.";

export const INSUFFICIENT_EVIDENCE_TOPICS = [
  "Canadian markets",
  "interest rates",
  "investing concepts",
  "wealth management",
  "financial planning",
  "Keybase's latest commentary",
];
