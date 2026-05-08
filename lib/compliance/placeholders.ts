/**
 * Placeholder substitution.
 *
 * COMPLIANCE INVARIANT — read before editing:
 *   This module is the ONLY place where placeholder tokens are replaced with
 *   real client / advisor / firm values. It must run AFTER OpenAI returns
 *   the draft, not before. Nothing in this module ever touches OpenAI; it
 *   operates entirely inside our system.
 *
 *   The contract is:
 *     1. The model returns text containing placeholders like [CLIENT_NAME].
 *     2. Our backend looks up the real values from internal storage.
 *     3. We substitute here, then either persist the personalized draft or
 *        send it via the company's email API.
 *     4. The personalized text never goes back to OpenAI.
 */

import type { AllowedPlaceholder } from "./sanitizer";

export interface PlaceholderValues {
  CLIENT_NAME?: string;
  CLIENT_FIRST_NAME?: string;
  ADVISOR_NAME?: string;
  FIRM_NAME?: string;
  DATE?: string;
  DOCUMENT_NAME?: string;
  MEETING_DATE?: string;
  MEETING_TIME?: string;
}

export interface SubstitutionResult {
  text: string;
  /** Placeholders that were found and replaced. */
  substituted: AllowedPlaceholder[];
  /**
   * Placeholders that remain in the text after substitution. A non-empty
   * value here means the caller didn't provide a value for that key —
   * usually a real bug, occasionally intentional (e.g. leaving [DATE] in a
   * template). Surfaced so the UI / send route can refuse to send if any
   * required placeholder is unfilled.
   */
  remaining: AllowedPlaceholder[];
}

const PLACEHOLDER_TO_KEY: Record<AllowedPlaceholder, keyof PlaceholderValues> = {
  "[CLIENT_NAME]": "CLIENT_NAME",
  "[CLIENT_FIRST_NAME]": "CLIENT_FIRST_NAME",
  "[ADVISOR_NAME]": "ADVISOR_NAME",
  "[FIRM_NAME]": "FIRM_NAME",
  "[DATE]": "DATE",
  "[DOCUMENT_NAME]": "DOCUMENT_NAME",
  "[MEETING_DATE]": "MEETING_DATE",
  "[MEETING_TIME]": "MEETING_TIME",
};

const ALL_PLACEHOLDERS: AllowedPlaceholder[] = Object.keys(
  PLACEHOLDER_TO_KEY
) as AllowedPlaceholder[];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Replace allowed placeholders in `text` with the matching values. Unknown
 * tokens (e.g. "[Recipient]") are left untouched — the model was instructed
 * not to invent placeholders, but if it did we don't silently expand them.
 */
export function substitutePlaceholders(
  text: string,
  values: PlaceholderValues
): SubstitutionResult {
  let out = text;
  const substituted: AllowedPlaceholder[] = [];

  for (const placeholder of ALL_PLACEHOLDERS) {
    const key = PLACEHOLDER_TO_KEY[placeholder];
    const replacement = values[key];
    if (replacement === undefined || replacement === null) continue;
    if (typeof replacement !== "string" || replacement.length === 0) continue;
    const re = new RegExp(escapeRegExp(placeholder), "g");
    if (!re.test(out)) continue;
    out = out.replace(new RegExp(escapeRegExp(placeholder), "g"), replacement);
    substituted.push(placeholder);
  }

  const remaining = ALL_PLACEHOLDERS.filter((p) => out.includes(p));
  return { text: out, substituted, remaining };
}

/** Convenience: derive a first name from a full name when the model used [CLIENT_NAME]. */
export function deriveFirstName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  const trimmed = fullName.trim();
  if (trimmed.length === 0) return "";
  const first = trimmed.split(/\s+/)[0];
  return first ?? "";
}

/**
 * Returns true when the supplied text still contains any allowed placeholder
 * token. Use this on the send path to refuse delivery of unfinished drafts.
 */
export function hasUnfilledPlaceholders(text: string): boolean {
  return ALL_PLACEHOLDERS.some((p) => text.includes(p));
}
