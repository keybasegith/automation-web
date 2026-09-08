/**
 * Hybrid ranking.
 *
 * Four signals, blended:
 *
 *   semantic   — cosine similarity to the question's embedding.
 *   keyword    — literal overlap. Financial questions turn on exact phrases
 *                ("Bank of Canada", "TFSA", "policy rate", "CPI") that a
 *                purely semantic search will happily answer with a passage
 *                about the Federal Reserve instead.
 *   freshness  — how recently the piece was published.
 *   authority  — a published article outranks a service page's marketing copy
 *                on the same topic.
 *
 * Freshness is a component of the blend rather than a filter, and it is
 * *reweighted*, not merely added, when the question asks for the current
 * position: without that, a two-year-old commentary with slightly better
 * wording overlap outranks this month's, which for rate and inflation
 * questions is not a small error.
 */

import { SOURCE_AUTHORITY } from "@/lib/keybase-answer/content-loader";
import { cosineSimilarity } from "@/lib/keybase-answer/embeddings";
import { questionTerms } from "@/lib/keybase-answer/normalize-question";
import type {
  KeybaseKnowledgeChunk,
  RetrievedSource,
  ScoredChunk,
} from "@/lib/keybase-answer/types";

export interface Weights {
  semantic: number;
  keyword: number;
  freshness: number;
  authority: number;
}

/** Balanced default: meaning leads, wording corrects it. */
export const DEFAULT_WEIGHTS: Weights = {
  semantic: 0.56,
  keyword: 0.24,
  freshness: 0.12,
  authority: 0.08,
};

/** "What is the latest…" — recency stops being a tiebreaker and starts mattering. */
export const FRESHNESS_WEIGHTS: Weights = {
  semantic: 0.44,
  keyword: 0.2,
  freshness: 0.28,
  authority: 0.08,
};

export function weightsFor(freshnessIntent: boolean): Weights {
  return freshnessIntent ? FRESHNESS_WEIGHTS : DEFAULT_WEIGHTS;
}

/**
 * Exponential decay on age. Undated material — an evergreen service page —
 * scores at the neutral midpoint rather than zero: it is not stale, it is
 * simply not news.
 */
export function freshnessScore(
  publishedAt: string | undefined,
  now: Date,
  halfLifeDays: number,
): number {
  if (!publishedAt) return 0.5;
  const time = Date.parse(publishedAt);
  if (Number.isNaN(time)) return 0.5;
  const ageDays = (now.getTime() - time) / 86_400_000;
  if (ageDays <= 0) return 1;
  return Math.pow(0.5, ageDays / halfLifeDays);
}

/** Contiguous word runs of the question, longest first, for phrase matching. */
function phrases(question: string): string[] {
  const words = question
    .toLowerCase()
    .split(/[^a-z0-9$%&]+/)
    .filter(Boolean);
  const out: string[] = [];
  for (const size of [4, 3, 2]) {
    for (let i = 0; i + size <= words.length; i += 1) {
      out.push(words.slice(i, i + size).join(" "));
    }
  }
  return out;
}

/** An intact run of this many words scores full marks for phrasing. */
const LONGEST_SCORED_PHRASE = 4;

/**
 * Literal overlap, 0–1. Two parts, weighted rather than added:
 *
 *   coverage — how many of the question's significant words the passage uses.
 *   phrasing — the longest run of the question's words the passage repeats
 *              intact, which is what separates a passage about the Bank of
 *              Canada from one that merely mentions banks and Canada.
 *
 * They are blended rather than summed because coverage saturates easily: on a
 * short question almost any relevant passage contains every significant word,
 * and a bonus added to a score already at 1 cannot distinguish anything.
 */
export function keywordScore(question: string, text: string): number {
  const terms = questionTerms(question);
  if (terms.length === 0) return 0;
  const haystack = ` ${text.toLowerCase().replace(/[^a-z0-9$%&]+/g, " ")} `;

  let hits = 0;
  for (const term of terms) if (haystack.includes(` ${term} `)) hits += 1;
  const coverage = hits / terms.length;

  let longestPhrase = 0;
  for (const phrase of phrases(question)) {
    if (haystack.includes(` ${phrase} `)) {
      longestPhrase = Math.max(longestPhrase, phrase.split(" ").length);
    }
  }
  const phrasing = Math.min(1, longestPhrase / LONGEST_SCORED_PHRASE);

  return Math.min(1, 0.7 * coverage + 0.3 * phrasing);
}

export interface RankOptions {
  question: string;
  queryVector: number[];
  now: Date;
  freshnessIntent: boolean;
  halfLifeDays: number;
  /** Categories to nudge upward. From question classification. May be empty. */
  preferredCategories?: string[];
}

/** Score one chunk. Exported so the evidence tests can assert on a single row. */
export function scoreChunk(
  chunk: KeybaseKnowledgeChunk,
  options: RankOptions,
): ScoredChunk {
  const weights = weightsFor(options.freshnessIntent);
  const semantic = chunk.embedding
    ? Math.max(0, cosineSimilarity(options.queryVector, chunk.embedding))
    : 0;
  const keyword = keywordScore(options.question, chunk.text);
  const freshness = freshnessScore(
    chunk.metadata.publishedAt,
    options.now,
    options.halfLifeDays,
  );
  const authority = SOURCE_AUTHORITY[chunk.metadata.contentType] ?? 0.5;

  let score =
    weights.semantic * semantic +
    weights.keyword * keyword +
    weights.freshness * freshness +
    weights.authority * authority;

  // A small nudge, never a reordering: the classifier's guess about which part
  // of the site to look in should not override what the passage actually says.
  if (options.preferredCategories?.includes(chunk.metadata.category)) {
    score = Math.min(1, score * 1.05);
  }

  return { chunk, semantic, keyword, freshness, authority, score };
}

export function rankChunks(
  chunks: KeybaseKnowledgeChunk[],
  options: RankOptions,
): ScoredChunk[] {
  return chunks
    .map((chunk) => scoreChunk(chunk, options))
    .sort((a, b) => b.score - a.score);
}

export interface GroupOptions {
  maxSources: number;
  maxPassagesPerSource: number;
}

/**
 * Collapse ranked chunks into citable sources, one per document.
 *
 * A document's score is its best chunk's, not the sum of its chunks': a long
 * page would otherwise beat a short, precise article purely by having more
 * text. The passages kept are the document's best few, restored to document
 * order so the model reads them the way they were written.
 */
export function groupIntoSources(
  ranked: ScoredChunk[],
  options: GroupOptions,
): RetrievedSource[] {
  const byDocument = new Map<string, ScoredChunk[]>();
  for (const scored of ranked) {
    const list = byDocument.get(scored.chunk.documentId);
    if (list) list.push(scored);
    else byDocument.set(scored.chunk.documentId, [scored]);
  }

  const sources = [...byDocument.entries()].map(([documentId, chunks]) => {
    const best = chunks[0];
    const kept = chunks
      .slice(0, options.maxPassagesPerSource)
      .sort((a, b) => a.chunk.chunkIndex - b.chunk.chunkIndex);
    return {
      documentId,
      title: best.chunk.metadata.title,
      canonicalUrl: best.chunk.metadata.canonicalUrl,
      category: best.chunk.metadata.category,
      contentType: best.chunk.metadata.contentType,
      publishedAt: best.chunk.metadata.publishedAt,
      passages: kept.map((entry) => entry.chunk.text),
      score: best.score,
      semantic: best.semantic,
      keyword: best.keyword,
      freshness: best.freshness,
    };
  });

  return sources
    .sort((a, b) => b.score - a.score)
    .slice(0, options.maxSources)
    .map((source, i) => ({
      // The opaque handle the model is allowed to cite. Assigned here, after
      // ranking, so it never carries information about the underlying page.
      id: `SRC_${String(i + 1).padStart(3, "0")}`,
      ...source,
    }));
}
