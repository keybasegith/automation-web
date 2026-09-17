/**
 * Transcript cleaning rules.
 *
 * Pure string functions with no browser, network or Node dependency: the whole
 * point of this tool is that a transcript never leaves the tab it was pasted
 * into, so the rules live here where they can be read and tested on their own.
 *
 * The pipeline is deliberately ordered — timestamps go first because they
 * create the segment boundaries the rest of the parse relies on, and speaker
 * labels are dropped last so that merging can still use them.
 */

export interface TranscriptOptions {
  removeTimestamps: boolean;
  keepSpeakerNames: boolean;
  mergeSameSpeaker: boolean;
  removeDuplicateBlankLines: boolean;
  fixLineBreaks: boolean;
}

export const DEFAULT_TRANSCRIPT_OPTIONS: TranscriptOptions = {
  removeTimestamps: true,
  keepSpeakerNames: true,
  mergeSameSpeaker: false,
  removeDuplicateBlankLines: true,
  fixLineBreaks: true,
};

/** One spoken block: who said it, and what they said. */
export interface TranscriptSegment {
  /** The label as it was written, without the colon. Null when none was found. */
  speaker: string | null;
  text: string;
  /** Blank lines that stood in front of this segment in the source. */
  blanksBefore: number;
}

/* ------------------------------------------------------------------ *
 * Timestamps
 *
 * Only three shapes are treated as transcript metadata: a line that is
 * nothing but timestamps, a range at the start of a line, and a bracketed
 * marker at the start of a line. A bare clock at the start of a line is
 * stripped only when it carries milliseconds, which no ordinary sentence
 * does — so "3:00 PM is the meeting time." survives, and every clock inside
 * a sentence is left alone entirely.
 * ------------------------------------------------------------------ */

const CLOCK = String.raw`\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?`;
const CLOCK_WITH_MS = String.raw`\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3}`;
const ARROW = String.raw`(?:-->|->|–>|—>|=>|→)`;
const BRACKETED = String.raw`\[\s*${CLOCK}\s*\]`;
const STAMP = String.raw`(?:${BRACKETED}|${CLOCK})`;
const GAP = String.raw`(?:\s*${ARROW}\s*|\s*[-–—|]\s*|\s+)`;

const TIMESTAMP_ONLY_LINE = new RegExp(
  String.raw`^\s*${STAMP}(?:${GAP}${STAMP})?\s*$`
);
const RANGE_PREFIX = new RegExp(String.raw`^\s*${STAMP}${GAP}${STAMP}\s*(?:[-–—|]\s*)?`);
const BRACKET_PREFIX = new RegExp(String.raw`^\s*${BRACKETED}\s*(?:[-–—|]\s*)?`);
const MILLISECOND_PREFIX = new RegExp(String.raw`^\s*${CLOCK_WITH_MS}\s+`);

/** Whether the line carries nothing but a timestamp or a timestamp range. */
export function isTimestampOnlyLine(line: string): boolean {
  return line.trim().length > 0 && TIMESTAMP_ONLY_LINE.test(line);
}

/**
 * Drop transcript timestamps.
 *
 * A timestamp-only line becomes an empty line rather than disappearing: it
 * marked the start of a new segment, and keeping that boundary as a blank line
 * is what stops two separate utterances being glued together later.
 */
export function removeTimestamps(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      if (isTimestampOnlyLine(line)) return "";
      return line
        .replace(RANGE_PREFIX, "")
        .replace(BRACKET_PREFIX, "")
        .replace(MILLISECOND_PREFIX, "");
    })
    .join("\n");
}

/* ------------------------------------------------------------------ *
 * Speakers
 * ------------------------------------------------------------------ */

const SPEAKER_LINE = /^([A-Za-z0-9][^:\n]{0,59}?)\s*:\s?(.*)$/;
const URL_SCHEMES = /^(?:https?|ftps?|mailto|tel|sms|file|data|wss?|about|chrome)$/i;
/** Lowercase words that legitimately sit inside a name or team label. */
const LABEL_CONNECTORS = new Set(["of", "and", "the", "for", "de", "la", "van", "von", "da", "du"]);
const LABEL_WORD = /^[A-Z0-9][\p{L}\p{N}.'’&()\-/]*$/u;
const SINGLE_LOWERCASE_NAME = /^[\p{L}][\p{L}.'’-]{0,29}$/u;

/**
 * Whether the text in front of a colon reads as a speaker label rather than
 * as the first half of an ordinary sentence.
 *
 * Labels are short, and their words are capitalised or numeric — "Keybase
 * Argosy Wealth", "Speaker 2", "Maria". "So here is the thing" is not, which
 * is how a mid-sentence colon avoids being mistaken for an attribution.
 */
function looksLikeSpeakerLabel(label: string): boolean {
  if (label.length === 0 || label.length > 60) return false;
  if (URL_SCHEMES.test(label)) return false;

  const words = label.split(/\s+/);
  if (words.length > 5) return false;
  if (words.length === 1 && SINGLE_LOWERCASE_NAME.test(words[0])) return true;

  return words.every(
    (word, index) =>
      LABEL_WORD.test(word) || (index > 0 && LABEL_CONNECTORS.has(word.toLowerCase()))
  );
}

/** The speaker label and the spoken text on a line, or null when there is no label. */
export function detectSpeaker(line: string): { speaker: string; text: string } | null {
  const match = SPEAKER_LINE.exec(line.trim());
  if (!match) return null;

  const speaker = match[1].trim();
  const text = match[2].trim();
  // "https://example.com" splits into a scheme and "//example.com".
  if (text.startsWith("//")) return null;
  if (!looksLikeSpeakerLabel(speaker)) return null;

  return { speaker, text };
}

/** The line with its speaker label removed, or unchanged when it has none. */
export function removeSpeakerPrefix(line: string): string {
  const found = detectSpeaker(line);
  return found ? found.text : line.trim();
}

/* ------------------------------------------------------------------ *
 * Structure
 * ------------------------------------------------------------------ */

/** Line endings, stray BOM, exotic spaces and trailing whitespace. Punctuation is never touched. */
export function normalizeSource(text: string): string {
  return text
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[   ]/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");
}

/**
 * Split cleaned lines into segments.
 *
 * With `joinWrappedLines` on, a line that does not open a new speaker attaches
 * to the segment above it — that is the fix for transcripts copied out of a
 * narrow window, where one sentence arrives as three lines. A blank line, a
 * new speaker label, or a leftover timestamp line always starts a new segment,
 * so two people never end up sharing a paragraph.
 */
export function parseSegments(text: string, joinWrappedLines: boolean): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  let pendingBlanks = 0;
  let openForContinuation = false;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();

    if (line.length === 0) {
      if (segments.length > 0) pendingBlanks += 1;
      openForContinuation = false;
      continue;
    }

    const found = detectSpeaker(line);
    const startsSegment =
      !joinWrappedLines || !openForContinuation || found !== null || isTimestampOnlyLine(line);

    if (startsSegment) {
      segments.push({
        speaker: found ? found.speaker : null,
        text: found ? found.text : line,
        blanksBefore: segments.length === 0 ? 0 : pendingBlanks,
      });
      pendingBlanks = 0;
      openForContinuation = true;
      continue;
    }

    const previous = segments[segments.length - 1];
    previous.text = previous.text.length > 0 ? `${previous.text} ${line}` : line;
  }

  return segments;
}

/**
 * Fold consecutive segments from the same speaker into one paragraph.
 *
 * Only neighbours merge, and only when both carry a label: an unattributed
 * segment is left where it is rather than guessed at. The first label's
 * original spelling is the one that survives.
 */
export function mergeSameSpeakerSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  const merged: TranscriptSegment[] = [];

  for (const segment of segments) {
    const previous = merged[merged.length - 1];
    const sameSpeaker =
      previous !== undefined &&
      previous.speaker !== null &&
      segment.speaker !== null &&
      previous.speaker.trim().toLowerCase() === segment.speaker.trim().toLowerCase();

    if (!sameSpeaker) {
      merged.push({ ...segment });
      continue;
    }

    previous.text =
      previous.text.length > 0 && segment.text.length > 0
        ? `${previous.text} ${segment.text}`
        : previous.text + segment.text;
  }

  return merged;
}

/** Collapse runs of empty lines to a single blank line and trim the ends. */
export function normalizeBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "").replace(/\n+$/, "");
}

/**
 * Turn segments back into text.
 *
 * With even spacing on, every segment is separated by exactly one blank line —
 * that both collapses the long gaps a raw transcript is full of and gives the
 * segments that arrived jammed together room to read. With it off the source's
 * own spacing is reproduced line for line.
 */
export function renderSegments(
  segments: TranscriptSegment[],
  options: { keepSpeakerNames: boolean; evenSpacing: boolean }
): string {
  const lines = segments
    .map((segment) =>
      options.keepSpeakerNames && segment.speaker
        ? `${segment.speaker}:${segment.text.length > 0 ? ` ${segment.text}` : ""}`
        : segment.text
    )
    .map((line) => line.trim());

  let out = "";
  segments.forEach((segment, index) => {
    const line = lines[index];
    if (line.length === 0) return;
    if (out.length > 0) {
      out += options.evenSpacing ? "\n\n" : `\n${"\n".repeat(segment.blanksBefore)}`;
    }
    out += line;
  });

  return out;
}

/** Repair sentences broken across lines by a narrow copy window. */
export function fixLineBreaks(text: string): string {
  return renderSegments(parseSegments(normalizeSource(text), true), {
    keepSpeakerNames: true,
    evenSpacing: false,
  });
}

/** Clean a pasted transcript. The single entry point the UI calls. */
export function formatTranscript(raw: string, options: TranscriptOptions): string {
  let text = normalizeSource(raw);
  if (options.removeTimestamps) text = removeTimestamps(text);

  let segments = parseSegments(text, options.fixLineBreaks);
  if (options.mergeSameSpeaker) segments = mergeSameSpeakerSegments(segments);

  const rendered = renderSegments(segments, {
    keepSpeakerNames: options.keepSpeakerNames,
    evenSpacing: options.removeDuplicateBlankLines,
  });

  return options.removeDuplicateBlankLines ? normalizeBlankLines(rendered) : rendered.trim();
}

/** Words in a block of text, for the counters under each editor. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}
