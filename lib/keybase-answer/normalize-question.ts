/**
 * Question normalization.
 *
 * Two jobs, deliberately kept apart:
 *
 *   `cleanQuestion`  — what the reader typed, tidied. This is what gets sent
 *                      to the model and echoed back as the answer heading, so
 *                      it must preserve meaning, case, and punctuation.
 *
 *   `normalizeQuestion` — a cache key ingredient. Aggressive, and lossy on
 *                      purpose, so "What is a TFSA?" and "what is a tfsa"
 *                      share one cached answer. Never displayed, never sent
 *                      to the model.
 *
 * Nothing here rewrites words. Dropping a "not", collapsing "RRSP" into
 * "rrsp income", or stemming "rates" would change what was asked.
 */

/** Characters typed by word processors that mean the same as their ASCII twin. */
const PUNCTUATION_FOLDS: Array<[RegExp, string]> = [
  [/[‘’‚‛′]/g, "'"], // curly single quotes, prime
  [/[“”„‟″]/g, '"'], // curly double quotes
  [/[‐-―−]/g, "-"], // dashes and the minus sign
  [/…/g, "..."], // ellipsis
];

/** Control characters, excluding the newlines a multi-line question may carry. */
const CONTROL_CHARS = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/g;

/** Spaces of every width, plus the zero-width joiners pasted text drags in. */
const WIDE_SPACE = /[ \t\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\u200b-\u200d\ufeff]+/g;

/**
 * Tidy a question for display and for the model: normalized Unicode, no
 * control characters, no runaway whitespace, straight quotes.
 */
export function cleanQuestion(raw: string): string {
  let text = raw.normalize("NFKC");
  for (const [pattern, replacement] of PUNCTUATION_FOLDS) {
    text = text.replace(pattern, replacement);
  }
  text = text.replace(CONTROL_CHARS, " ");
  text = text.replace(WIDE_SPACE, " ");
  text = text.replace(/\s*\n\s*/g, "\n");
  return text.trim();
}

/**
 * The cache-key form of a question: lowercased, whitespace collapsed, trailing
 * punctuation dropped. Meaning-preserving — only casing, spacing, and terminal
 * punctuation are touched.
 */
export function normalizeQuestion(raw: string): string {
  return cleanQuestion(raw)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?!.\s]+$/g, "")
    .trim();
}

/** Words too common to say anything about what a question is looking for. */
const STOP_WORDS = new Set([
  "a", "about", "affect", "affecting", "all", "am", "an", "and", "any", "are",
  "as", "at", "be", "been", "being", "between", "but", "by", "can", "could",
  "did", "do", "does", "doing", "for", "from", "get", "had", "has", "have",
  "how", "i", "if", "in", "into", "is", "it", "its", "just", "may", "me",
  "mean", "means", "might", "more", "most", "my", "no", "not", "of", "on",
  "or", "our", "should", "so", "some", "such", "than", "that", "the", "their",
  "them", "then", "there", "these", "they", "this", "those", "to", "up", "us",
  "was", "we", "were", "what", "when", "where", "which", "while", "who", "why",
  "will", "with", "would", "you", "your",
]);

/**
 * The significant words of a question, used for lexical retrieval. Case and
 * order are dropped; nothing is stemmed, because "rate" and "rates" retrieve
 * differently and Postgres full-text search already handles stemming on its
 * side of the hybrid.
 */
export function questionTerms(raw: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const word of normalizeQuestion(raw).split(/[^a-z0-9$%&]+/)) {
    if (word.length < 2) continue;
    if (STOP_WORDS.has(word)) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    terms.push(word);
  }
  return terms;
}
