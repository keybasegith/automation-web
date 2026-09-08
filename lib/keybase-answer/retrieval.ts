/**
 * Retrieval — the only thing the answer pipeline knows about the knowledge base.
 *
 * Callers pass a question and get back ranked, citable Keybase sources. Whether
 * that came from cosine over jsonb vectors, pgvector, a hosted vector store, or
 * plain keyword search is decided in index-store.ts and is invisible from here
 * up. Nothing above this module has ever seen a chunk.
 *
 * The hybrid is a union, not a re-rank of one list: semantic search proposes
 * the passages that mean the same thing, keyword search proposes the ones that
 * say the same words, and everything either of them proposed is then scored on
 * the same scale. A question containing "Bank of Canada" therefore cannot lose
 * the Bank of Canada article merely because forty other passages embedded a
 * little closer.
 */

import { getConfig, isMockMode } from "@/lib/keybase-answer/config";
import { DEFAULT_CHUNK_OPTIONS, chunkSections } from "@/lib/keybase-answer/chunking";
import { loadApprovedDocuments } from "@/lib/keybase-answer/content-loader";
import { embedQuery, embeddingModelLabel, mockEmbedding } from "@/lib/keybase-answer/embeddings";
import { KeybaseAnswerError } from "@/lib/keybase-answer/errors";
import {
  getKnowledgeIndex,
  newIndexVersion,
  type IndexableDocument,
} from "@/lib/keybase-answer/index-store";
import { groupIntoSources, rankChunks } from "@/lib/keybase-answer/ranking";
import type {
  KeybaseKnowledgeChunk,
  RetrievedSource,
} from "@/lib/keybase-answer/types";

/** Passages the semantic half proposes before ranking. */
const SEMANTIC_CANDIDATES = 40;
/** Passages the keyword half proposes before ranking. */
const KEYWORD_CANDIDATES = 24;
/** Backstop on the in-process chunk cache, independent of version changes. */
const CHUNK_CACHE_MAX_AGE_MS = 5 * 60_000;

interface ChunkCache {
  indexVersion: string;
  loadedAt: number;
  chunks: KeybaseKnowledgeChunk[];
}

let chunkCache: ChunkCache | null = null;

/** Drop the in-process chunk cache. Used by the indexer and by tests. */
export function invalidateRetrievalCache(): void {
  chunkCache = null;
}

/**
 * Build a throwaway index in memory from the approved content, for a local
 * checkout with no database. Only ever reached in mock mode — a production
 * process with no index must fail loudly, not quietly answer from a corpus it
 * assembled on the spot with hashed pseudo-embeddings.
 */
async function bootstrapMemoryIndex(): Promise<void> {
  const index = getKnowledgeIndex();
  const { documents } = await loadApprovedDocuments();
  const indexable: IndexableDocument[] = documents.map(({ document, sections }) => ({
    document,
    chunks: chunkSections(sections, DEFAULT_CHUNK_OPTIONS).map((chunk, i) => ({
      chunkIndex: i,
      heading: chunk.heading,
      text: chunk.text,
      embedding: mockEmbedding(chunk.text),
    })),
  }));
  await index.write(indexable, {
    indexVersion: newIndexVersion(),
    embeddingModel: embeddingModelLabel(),
  });
}

async function loadChunks(): Promise<{
  chunks: KeybaseKnowledgeChunk[];
  indexVersion: string;
}> {
  const index = getKnowledgeIndex();
  await index.ensureReady();

  let meta = await index.getMeta();
  if ((!meta || meta.chunkCount === 0) && index.kind === "memory" && isMockMode()) {
    await bootstrapMemoryIndex();
    meta = await index.getMeta();
  }

  if (!meta || meta.chunkCount === 0) {
    throw new KeybaseAnswerError(
      "index_unavailable",
      "Keybase Answer is being updated. Please try again shortly.",
      {
        detail:
          "the knowledge index is empty — run `npm run keybase-answer:index`",
      },
    );
  }

  const cached = chunkCache;
  const fresh =
    cached !== null &&
    cached.indexVersion === meta.indexVersion &&
    Date.now() - cached.loadedAt < CHUNK_CACHE_MAX_AGE_MS;
  if (fresh) return { chunks: cached.chunks, indexVersion: cached.indexVersion };

  const loaded: ChunkCache = {
    indexVersion: meta.indexVersion,
    loadedAt: Date.now(),
    chunks: await index.allChunks(),
  };
  chunkCache = loaded;
  return { chunks: loaded.chunks, indexVersion: loaded.indexVersion };
}

/** The version of the corpus currently answerable. A cache-key ingredient. */
export async function getContentIndexVersion(): Promise<string> {
  const index = getKnowledgeIndex();
  await index.ensureReady();
  const meta = await index.getMeta();
  if (meta) return meta.indexVersion;
  if (index.kind === "memory" && isMockMode()) {
    await bootstrapMemoryIndex();
    return (await index.getMeta())?.indexVersion ?? "empty";
  }
  return "empty";
}

export interface RetrieveArgs {
  query: string;
  /** Maximum sources returned. Defaults to KEYBASE_ANSWER_MAX_SOURCES. */
  limit?: number;
  /** Categories to nudge upward, not to filter by. */
  categories?: string[];
  /** True when the question asks for the current position. */
  freshnessIntent?: boolean;
  now?: Date;
}

export interface RetrievalResult {
  sources: RetrievedSource[];
  indexVersion: string;
  /** How many passages were considered. Logged; never shown. */
  candidatesConsidered: number;
  latencyMs: number;
}

export async function retrieveKeybaseSources(
  args: RetrieveArgs,
): Promise<RetrievalResult> {
  const started = Date.now();
  const config = getConfig();
  const now = args.now ?? new Date();

  const { chunks, indexVersion } = await loadChunks();
  const queryVector = await embedQuery(args.query);

  const rankOptions = {
    question: args.query,
    queryVector,
    now,
    freshnessIntent: args.freshnessIntent ?? false,
    halfLifeDays: config.freshnessHalfLifeDays,
    preferredCategories: args.categories,
  };

  // Semantic half: rank everything, keep the strongest passages.
  const semanticTop = rankChunks(chunks, rankOptions).slice(0, SEMANTIC_CANDIDATES);

  // Keyword half: exact wording the embedding may have smoothed away.
  const keywordIds = await getKnowledgeIndex().keywordCandidates(
    args.query,
    KEYWORD_CANDIDATES,
  );
  const byId = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const candidates = new Map(semanticTop.map((entry) => [entry.chunk.id, entry.chunk]));
  for (const id of keywordIds) {
    const chunk = byId.get(id);
    if (chunk) candidates.set(id, chunk);
  }

  const ranked = rankChunks([...candidates.values()], rankOptions);
  const sources = groupIntoSources(ranked, {
    maxSources: args.limit ?? config.maxSources,
    maxPassagesPerSource: config.maxPassagesPerSource,
  });

  return {
    sources,
    indexVersion,
    candidatesConsidered: candidates.size,
    latencyMs: Date.now() - started,
  };
}
