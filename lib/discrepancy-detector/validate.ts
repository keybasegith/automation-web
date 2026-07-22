/**
 * Extraction quality gate — spec 5.2.
 *
 * These forms sometimes carry a text layer whose custom font encoding decodes to
 * garbage. Presence of a text layer therefore proves nothing; we only trust
 * extracted values that survive these checks. A confident-but-wrong pre-fill is
 * worse than a blank field, so anything doubtful falls through to manual entry.
 *
 * Pure and dependency-free so the heuristics can be unit-tested without a PDF.
 */

import { canonicalizeIncomeBand } from "./normalize";
import type { CrqVersion } from "./vocab";

/** Unicode private-use area — where subset/custom font encodings land. */
const PRIVATE_USE = new RegExp("[\\uE000-\\uF8FF\\uFFFD]", "g");
/** ASCII printable plus newline. */
const ASCII_PRINTABLE = new RegExp("[\\x20-\\x7E\\n]", "g");

/**
 * Detect a text layer that decoded to garbage rather than readable English.
 *
 * Broken CID/custom encodings typically surface as Unicode private-use
 * characters, replacement characters, or a soup of symbols with no real words.
 */
export function isGarbledText(text: string): boolean {
  const sample = text.trim();
  if (sample.length === 0) return true;

  // Private-use / replacement characters are a definitive broken-encoding tell.
  const broken = (sample.match(PRIVATE_USE) ?? []).length;
  if (broken / sample.length > 0.02) return true;

  // A form in English is overwhelmingly ASCII-printable.
  const printable = (sample.match(ASCII_PRINTABLE) ?? []).length;
  if (printable / sample.length < 0.85) return true;

  // Real prose yields pronounceable words; glyph soup does not.
  const words = sample.match(/[A-Za-z]{3,}/g) ?? [];
  if (words.length < 5) return true;
  const withVowel = words.filter((w) => /[aeiouy]/i.test(w)).length;
  if (withVowel / words.length < 0.6) return true;

  return false;
}

/** Case/space-insensitive haystack for anchor checks. */
const flatten = (text: string): string => text.toLowerCase().replace(/\s+/g, " ");

/**
 * Anchors must DISCRIMINATE, not merely describe: phrases the two forms share
 * ("account holder", "risk tolerance") are useless here, because a CRQ would
 * then score as a NAAF and the swapped-upload check would never fire. Every
 * anchor below appears on one form and not the other.
 */
const NAAF_ANCHORS = [
  "new account application",
  "client kyc",
  "time horizon",
  "trusted contact",
  "investment plan",
  "naaf", // the form code V3-NAAFE-2022 contains it
];

const CRQ_ANCHORS = [
  "client risk questionnaire",
  "risk capacity",
  "risk ranking",
  "score total",
  "crq", // the form code v2-crq25 contains it
];

const countAnchors = (text: string, anchors: string[]): number => {
  const hay = flatten(text);
  return anchors.filter((a) => hay.includes(a)).length;
};

/**
 * Does this text actually look like the document we were handed?
 *
 * Guards against a reviewer swapping the two uploads as well as against a text
 * layer that decoded to something unrelated.
 */
export const looksLikeNaaf = (text: string): boolean => countAnchors(text, NAAF_ANCHORS) >= 2;
export const looksLikeCrq = (text: string): boolean => countAnchors(text, CRQ_ANCHORS) >= 2;

/** Detect which of the three CRQ layouts was uploaded, from the header text. */
export function detectCrqVersion(text: string): CrqVersion | null {
  const hay = flatten(text);
  // Order matters: the Joint and Corporate layouts also say "account holder".
  if (/corporate/.test(hay)) return "Corporate";
  if (/joint account holder/.test(hay)) return "Joint";
  if (/individual/.test(hay)) return "Individual";
  return null;
}

/**
 * Sanity-check a value that claims to be an income band. Spec 5.2 names this as
 * the canary: if the income field does not decode to a known band, distrust the
 * whole text layer.
 */
export const isSaneIncomeBand = (value: string): boolean =>
  canonicalizeIncomeBand(value) !== null;

/** Client IDs are short alphanumeric tokens; reject decoded junk. */
export function isSaneClientId(value: string): boolean {
  const v = value.trim();
  if (v.length < 3 || v.length > 32) return false;
  return /^[A-Za-z0-9][A-Za-z0-9\-_/ ]*$/.test(v);
}

export interface TextLayerVerdict {
  usable: boolean;
  reason: string;
}

/**
 * The single decision point for "can we trust this text layer?".
 * Returns the reviewer-facing reason when the answer is no.
 */
export function assessTextLayer(text: string, expect: "naaf" | "crq"): TextLayerVerdict {
  if (text.trim().length === 0) {
    return {
      usable: false,
      reason:
        "This PDF has no selectable text — it looks like a scan. Enter the fields manually below; the page images are shown alongside for reference.",
    };
  }

  if (isGarbledText(text)) {
    return {
      usable: false,
      reason:
        "This PDF has a text layer, but it decodes to unreadable characters (a known issue with some exports of this form). The extracted values cannot be trusted, so the fields are left blank for manual entry.",
    };
  }

  const matches = expect === "naaf" ? looksLikeNaaf(text) : looksLikeCrq(text);
  if (!matches) {
    return {
      usable: false,
      reason: `The text in this PDF does not look like a ${expect.toUpperCase()}. Confirm the correct file was uploaded; the fields are left blank for manual entry.`,
    };
  }

  return { usable: true, reason: "" };
}
