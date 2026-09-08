/**
 * Vector embeddings for retrieval.
 *
 * The model name comes from configuration and appears nowhere else, so moving
 * from text-embedding-3-small to -large is an environment change. Dimension is
 * never assumed: vectors are compared by length at read time and a chunk
 * embedded under a different model is re-embedded by the indexer rather than
 * silently mis-scored.
 *
 * Embeddings are produced by the indexer and by one query per uncached
 * question — never per chunk per request.
 */

import { createHash } from "node:crypto";
import { getConfig, isMockMode } from "@/lib/keybase-answer/config";
import { KeybaseAnswerError } from "@/lib/keybase-answer/errors";
import { getOpenAiClient } from "@/lib/keybase-answer/openai-client";
import { questionTerms } from "@/lib/keybase-answer/normalize-question";

/** Dimension of the deterministic development vectors. Never used in production. */
export const MOCK_EMBEDDING_DIMENSION = 256;

/**
 * A deterministic stand-in for a real embedding: a hashed bag of words, unit
 * normalized. It ranks related passages above unrelated ones well enough to
 * exercise the whole pipeline offline, and it is stable across runs so tests
 * and the local index agree. It is not, and is not meant to be, semantic.
 */
export function mockEmbedding(text: string): number[] {
  const vector = new Array<number>(MOCK_EMBEDDING_DIMENSION).fill(0);
  const terms = questionTerms(text);
  for (const term of terms) {
    const digest = createHash("sha256").update(term).digest();
    // Two buckets per term, so unrelated terms rarely collide in both.
    const a = digest.readUInt16BE(0) % MOCK_EMBEDDING_DIMENSION;
    const b = digest.readUInt16BE(2) % MOCK_EMBEDDING_DIMENSION;
    vector[a] += 1;
    vector[b] += 0.5;
  }
  return normalize(vector);
}

export function normalize(vector: number[]): number[] {
  let sum = 0;
  for (const value of vector) sum += value * value;
  const length = Math.sqrt(sum);
  if (length === 0) return vector;
  return vector.map((value) => value / length);
}

/**
 * Cosine similarity. Vectors from the embeddings API arrive normalized, so this
 * is a dot product in practice, but the division is kept because the mock and
 * any future provider need not be.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Requests per embeddings call. Keeps payloads well inside provider limits. */
const BATCH_SIZE = 96;

export interface EmbeddingResult {
  vectors: number[][];
  model: string;
}

/**
 * Embed a batch of texts. Returns one vector per input, in input order.
 *
 * In mock mode this never touches the network; in production a missing key is
 * an error rather than a silent fallback, because a hashed bag of words must
 * never be mistaken for a semantic index.
 */
export async function embedTexts(texts: string[]): Promise<EmbeddingResult> {
  const { embeddingModel } = getConfig();
  if (texts.length === 0) return { vectors: [], model: embeddingModel };

  if (isMockMode()) {
    return {
      vectors: texts.map(mockEmbedding),
      model: `mock:${embeddingModel}`,
    };
  }

  const client = getOpenAiClient();
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    try {
      const response = await client.embeddings.create({
        model: embeddingModel,
        input: batch,
      });
      // The API documents index order, but the field exists — honour it.
      const ordered = [...response.data].sort((a, b) => a.index - b.index);
      for (const item of ordered) vectors.push(item.embedding as number[]);
    } catch (err) {
      throw new KeybaseAnswerError(
        "provider_failed",
        "Something went wrong while preparing your answer.",
        { cause: err, detail: `embeddings batch ${i / BATCH_SIZE} failed` },
      );
    }
  }
  return { vectors, model: embeddingModel };
}

export async function embedQuery(text: string): Promise<number[]> {
  const { vectors } = await embedTexts([text]);
  if (vectors.length !== 1) {
    throw new KeybaseAnswerError(
      "provider_failed",
      "Something went wrong while preparing your answer.",
      { detail: `expected one query vector, received ${vectors.length}` },
    );
  }
  return vectors[0];
}

/** The model label written alongside stored vectors, so a swap is detectable. */
export function embeddingModelLabel(): string {
  const { embeddingModel } = getConfig();
  return isMockMode() ? `mock:${embeddingModel}` : embeddingModel;
}
