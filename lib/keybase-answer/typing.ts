/**
 * The pacing and truncation rules behind the answer typewriter.
 *
 * Kept out of the components because both are policy rather than rendering:
 * how fast an answer should appear to be written is a product decision, and
 * where a partially-written string may be cut is a correctness one.
 */

/** Comfortable reading-speed typing for a short answer. */
export const CHARS_PER_SECOND = 170;
/** Even a one-line answer should look written, not pasted. */
export const MIN_DURATION_MS = 700;
/** Nobody should wait longer than this to read an answer they can already see. */
export const MAX_DURATION_MS = 6500;

/**
 * How long the whole answer should take to write.
 *
 * A short answer types at reading speed; a long one compresses to fit the
 * ceiling rather than running for half a minute. The alternative — a constant
 * rate — makes the length of an answer decide how long a reader is made to
 * wait, which is backwards.
 */
export function typingDurationMs(totalChars: number): number {
  if (totalChars <= 0) return 0;
  return Math.min(
    MAX_DURATION_MS,
    Math.max(MIN_DURATION_MS, (totalChars / CHARS_PER_SECOND) * 1000),
  );
}

/**
 * The leading `maxChars` characters of `text`, never ending inside a citation
 * marker.
 *
 * The strip is the point. Mid-animation the cut lands inside a `[12]` roughly
 * as often as anywhere else, and rendering `[1` as literal prose for two frames
 * before it becomes a button is exactly the flicker that makes a typing effect
 * look broken. A partial marker is held back until it is whole.
 */
export function revealText(text: string, maxChars?: number): string {
  if (maxChars === undefined || maxChars >= text.length) return text;
  return text.slice(0, Math.max(0, maxChars)).replace(/\[\d{0,2}$/, "");
}
