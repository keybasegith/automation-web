/**
 * Semantic chunking.
 *
 * Documents are cut on their own section boundaries — a heading and the
 * paragraphs beneath it — rather than every N characters. A fixed-width cut
 * routinely severs a definition from the sentence that qualifies it, and the
 * retrieved half then reads as a firmer claim than the article makes. That
 * matters more here than in a general knowledge base, because the halves are
 * about interest rates and contribution limits.
 *
 * Where a section is longer than one chunk, consecutive chunks overlap by one
 * paragraph, so a passage split across the boundary is still whole in one of
 * them.
 */

/** A document reduced to its headings and the prose under each. */
export interface DocumentSection {
  /** Absent for the lede — the paragraphs before the first heading. */
  heading?: string;
  paragraphs: string[];
}

export interface ChunkText {
  /** The section this came from, carried into the chunk's own text. */
  heading?: string;
  text: string;
}

export interface ChunkOptions {
  /** Preferred chunk size. Chunks land near this, not exactly on it. */
  targetChars: number;
  /** Hard ceiling. A single paragraph longer than this is split on sentences. */
  maxChars: number;
  /** Below this, a trailing chunk is folded back into the one before it. */
  minChars: number;
}

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = {
  targetChars: 1100,
  maxChars: 1600,
  minChars: 320,
};

/** Split an over-long paragraph on sentence ends, never mid-sentence. */
function splitLongParagraph(paragraph: string, maxChars: number): string[] {
  if (paragraph.length <= maxChars) return [paragraph];
  const sentences = paragraph.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [
    paragraph,
  ];
  const out: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > maxChars) {
      out.push(current.trim());
      current = "";
    }
    current += sentence;
    // A single sentence longer than the ceiling is left whole: cutting it would
    // produce a fragment that reads as a complete claim, which is worse.
    if (current.length > maxChars) {
      out.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/**
 * Cut one document's sections into retrievable chunks. Every chunk opens with
 * its heading, so a passage retrieved on its own still says what it is about.
 */
export function chunkSections(
  sections: DocumentSection[],
  options: ChunkOptions = DEFAULT_CHUNK_OPTIONS,
): ChunkText[] {
  const { targetChars, maxChars, minChars } = options;
  const chunks: ChunkText[] = [];

  for (const section of sections) {
    const paragraphs = section.paragraphs
      .flatMap((p) => splitLongParagraph(p.trim(), maxChars))
      .filter((p) => p.length > 0);
    if (paragraphs.length === 0) continue;

    const sectionChunks: string[] = [];
    let buffer: string[] = [];
    let length = 0;

    const flush = () => {
      if (buffer.length === 0) return;
      sectionChunks.push(buffer.join("\n\n"));
      // Carry the last paragraph forward so a claim split across the boundary
      // survives whole on one side of it.
      const carry = buffer[buffer.length - 1];
      buffer = carry.length <= targetChars / 2 ? [carry] : [];
      length = buffer.reduce((n, p) => n + p.length, 0);
    };

    for (const paragraph of paragraphs) {
      if (length > 0 && length + paragraph.length > targetChars) flush();
      buffer.push(paragraph);
      length += paragraph.length;
    }
    if (buffer.length > 0) sectionChunks.push(buffer.join("\n\n"));

    // A stub tail (a one-line closing sentence, say) belongs to the chunk above
    // it, not to a chunk of its own that retrieves on almost nothing.
    if (sectionChunks.length > 1) {
      const last = sectionChunks[sectionChunks.length - 1];
      if (last.length < minChars) {
        sectionChunks.pop();
        const previous = sectionChunks[sectionChunks.length - 1];
        if (!previous.endsWith(last)) {
          sectionChunks[sectionChunks.length - 1] = `${previous}\n\n${last}`;
        }
      }
    }

    for (const body of sectionChunks) {
      chunks.push({
        heading: section.heading,
        text: section.heading ? `${section.heading}\n\n${body}` : body,
      });
    }
  }

  return chunks;
}

/** Rough token count for cost and context budgeting. Deliberately approximate. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
