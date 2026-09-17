/**
 * Automated grading.
 *
 * Deliberately mechanical: substring presence, word counts, JSON shape,
 * refusal detection. There is no model-as-judge here and there cannot be —
 * judging with an external API is exactly what this system is forbidden to do,
 * and judging with the model under test would be marking its own homework.
 *
 * So these checks are a filter, not a verdict. They catch the failures that
 * are objectively decidable (wrong arithmetic, invalid JSON, an invented
 * policy) and hand everything else to a person through `humanReview`. A high
 * automated score is necessary for a candidate, never sufficient.
 */

import type {
  CheckResult,
  ExpectedBehavior,
  GradeResult,
  RequiredStructure,
} from "@/lib/internal-ai/benchmark/types";

/** Normalise for comparison: case, whitespace, and thousands separators. */
const normalize = (text: string): string =>
  text.toLowerCase().replace(/[ \s]+/g, " ").trim();

/**
 * Numbers are the common case in these prompts, and a model may write 1,300,000
 * or 1300000 or 1 300 000. Comparing a digits-only projection makes all three
 * match without loosening the check into meaninglessness.
 */
const digitsOnly = (text: string): string => text.replace(/[^0-9]/g, "");

function mentions(response: string, needle: string): boolean {
  const haystack = normalize(response);
  const target = normalize(needle);
  if (haystack.includes(target)) return true;

  // Numeric fallback, only when the expectation is purely numeric.
  const targetDigits = digitsOnly(target);
  if (targetDigits.length >= 2 && digitsOnly(target) === target.replace(/[,\s.]/g, "")) {
    return digitsOnly(haystack).includes(targetDigits);
  }
  return false;
}

const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

/**
 * Phrases that mark an honest "I was not given that".
 *
 * Kept broad, because a refusal is the *correct* answer for some prompts and a
 * narrow list would fail good behaviour. The matching risk runs the safe way:
 * a missed refusal shows up as a failed check for a human to look at, whereas
 * a fabricated policy is caught separately by `mustNotMention`.
 */
const REFUSAL_MARKERS = [
  "does not specify",
  "doesn't specify",
  "does not say",
  "doesn't say",
  "does not state",
  "doesn't state",
  "does not mention",
  "doesn't mention",
  "does not address",
  "doesn't address",
  "not specified",
  "not stated",
  "no information",
  "does not contain",
  "doesn't contain",
  "i don't have access",
  "i do not have access",
  "i don't have information",
  "i do not have information",
  "cannot answer",
  "can't answer",
  "unable to answer",
  "silent on",
  "nothing in",
  "not covered",
  "i'm not able to",
  "i am not able to",
];

const looksLikeRefusal = (response: string): boolean => {
  const text = normalize(response);
  return REFUSAL_MARKERS.some((marker) => text.includes(marker));
};

/** Strip a ``` fence if the model wrapped its JSON despite being told not to. */
function unfence(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*\n([\s\S]*?)\n?```$/;
  const match = trimmed.match(fence);
  return match ? match[1].trim() : trimmed;
}

function typeOf(value: unknown): string {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function checkStructure(
  value: unknown,
  structure: RequiredStructure,
  checks: CheckResult[]
): void {
  const objects: Record<string, unknown>[] = Array.isArray(value)
    ? (value.filter((v) => typeOf(v) === "object") as Record<string, unknown>[])
    : typeOf(value) === "object"
      ? [value as Record<string, unknown>]
      : [];

  if (typeof structure.length === "number") {
    const actual = Array.isArray(value) ? value.length : -1;
    checks.push({
      name: `length is ${structure.length}`,
      passed: actual === structure.length,
      detail: `got ${actual}`,
    });
  }

  const requiredKeys = structure.keys ?? structure.itemKeys;
  if (requiredKeys) {
    for (const [index, object] of objects.entries()) {
      const keys = Object.keys(object);
      const missing = requiredKeys.filter((key) => !keys.includes(key));
      const extra = structure.exactKeys
        ? keys.filter((key) => !requiredKeys.includes(key))
        : [];
      checks.push({
        name: `keys${objects.length > 1 ? ` [${index}]` : ""}`,
        passed: missing.length === 0 && extra.length === 0,
        detail:
          missing.length === 0 && extra.length === 0
            ? "exact match"
            : `missing ${JSON.stringify(missing)}, unexpected ${JSON.stringify(extra)}`,
      });
    }
  }

  if (structure.types) {
    for (const [key, expected] of Object.entries(structure.types)) {
      for (const object of objects) {
        checks.push({
          name: `${key} is ${expected}`,
          passed: typeOf(object[key]) === expected,
          detail: `got ${typeOf(object[key])}`,
        });
      }
    }
  }

  if (structure.enums) {
    for (const [key, allowed] of Object.entries(structure.enums)) {
      for (const object of objects) {
        checks.push({
          name: `${key} within ${JSON.stringify(allowed)}`,
          passed: allowed.includes(String(object[key])),
          detail: `got ${JSON.stringify(object[key])}`,
        });
      }
    }
  }
}

export function gradeResponse(
  response: string,
  expected: ExpectedBehavior | undefined,
  /** The planted fact, for long-context prompts. */
  needle?: string
): GradeResult {
  const checks: CheckResult[] = [];

  if (!expected) {
    return { score: null, checks, humanReview: null };
  }

  for (const needed of expected.mustMention ?? []) {
    checks.push({
      name: `mentions "${needed}"`,
      passed: mentions(response, needed),
      detail: mentions(response, needed) ? "found" : "absent",
    });
  }

  for (const forbidden of expected.mustNotMention ?? []) {
    const present = mentions(response, forbidden);
    checks.push({
      name: `avoids "${forbidden}"`,
      passed: !present,
      detail: present ? "PRESENT — likely fabricated" : "absent",
    });
  }

  if (typeof expected.maxWords === "number") {
    const words = countWords(response);
    checks.push({
      name: `at most ${expected.maxWords} words`,
      passed: words <= expected.maxWords,
      detail: `${words} words`,
    });
  }

  if (expected.mustRefuse) {
    const refused = looksLikeRefusal(response);
    checks.push({
      name: "declines rather than inventing",
      passed: refused,
      detail: refused
        ? "acknowledged the gap"
        : "NO REFUSAL DETECTED — read this answer; a confident fabrication is a hard fail",
    });
  }

  if (expected.citationRequired) {
    // A clause reference: "clause 1", "SP-14(1)", "point 2", or a quotation.
    const cited =
      /\b(clause|section|point|item|rule|paragraph)\s*\d+/i.test(response) ||
      /\bSP-\d+\s*\(?\d/i.test(response) ||
      /["“][^"”]{10,}["”]/.test(response);
    checks.push({
      name: "cites the supplied policy",
      passed: cited,
      detail: cited ? "found a clause reference or quotation" : "no citation found",
    });
  }

  if (expected.formatValidity) {
    const candidate = unfence(response);
    let parsed: unknown;
    let valid = false;
    try {
      parsed = JSON.parse(candidate);
      valid =
        expected.formatValidity === "json-array"
          ? Array.isArray(parsed)
          : typeOf(parsed) === "object";
    } catch {
      valid = false;
    }

    checks.push({
      name: `valid ${expected.formatValidity}`,
      passed: valid,
      detail: valid ? "parsed" : "did not parse as the required shape",
    });

    // Report unfenced output separately: it is a real instruction-following
    // miss even when the JSON inside is perfect.
    checks.push({
      name: "no code fence (as instructed)",
      passed: candidate === response.trim(),
      detail: candidate === response.trim() ? "clean" : "wrapped in a fence",
    });

    if (valid && expected.requiredStructure) {
      checkStructure(parsed, expected.requiredStructure, checks);
    }
  }

  if (expected.needleAnswer && needle) {
    const found = mentions(response, needle);
    checks.push({
      name: "recalls the planted fact",
      passed: found,
      detail: found ? "found" : `expected "${needle}"`,
    });
  }

  const score =
    checks.length === 0
      ? null
      : checks.filter((check) => check.passed).length / checks.length;

  return { score, checks, humanReview: expected.humanReview ?? null };
}

/** Percentile from a set of samples. Linear interpolation, sorted ascending. */
export function percentile(samples: readonly number[], p: number): number {
  if (samples.length === 0) return Number.NaN;
  const sorted = [...samples].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const rank = (p / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}
