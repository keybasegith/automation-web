/**
 * The single configuration layer for Keybase Answer.
 *
 * Every environment variable the feature reads is read here and nowhere else,
 * so the model, the embedding model, the thresholds, and the limits can all be
 * changed without touching a route, a component, or the retrieval code. Model
 * names in particular appear exactly once in this repository — below.
 */

/** Generation model. Overridable per deployment via KEYBASE_ANSWER_MODEL. */
const DEFAULT_MODEL = "gpt-5.6-terra";

/** Retrieval embeddings. Swappable for text-embedding-3-large without code changes. */
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

function str(name: string, fallback: string): string {
  const raw = process.env[name];
  return raw && raw.trim() ? raw.trim() : fallback;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || !raw.trim()) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === "") return fallback;
  return raw === "true" || raw === "1" || raw === "yes";
}

export interface KeybaseAnswerConfig {
  enabled: boolean;
  useMock: boolean;
  model: string;
  embeddingModel: string;
  /** Cheap deterministic-classification fallback model. Unused unless enabled. */
  classificationModel: string;
  maxSources: number;
  maxQuestionLength: number;
  hourlyLimit: number;
  /** Seconds. How long a generated answer stays servable. */
  cacheTtlSeconds: number;
  /** Cosine similarity a chunk must clear to count as evidence at all. */
  minRelevance: number;
  /**
   * A single source at or above this blended score answers a question on its
   * own — one authoritative Keybase article beats an arbitrary two-source rule.
   */
  strongRelevance: number;
  /** How many distinct sources are normally required below `strongRelevance`. */
  minRelevantSources: number;
  /** Passages sent per source. Caps prompt size, and therefore cost. */
  maxPassagesPerSource: number;
  /** Days after which "latest"/"current" questions treat material as stale. */
  freshnessWindowDays: number;
  /** Half-life in days for the recency component of the ranking. */
  freshnessHalfLifeDays: number;
}

export function getConfig(): KeybaseAnswerConfig {
  return {
    enabled: bool("KEYBASE_ANSWER_ENABLED", true),
    useMock: bool("KEYBASE_ANSWER_USE_MOCK", false),
    model: str("KEYBASE_ANSWER_MODEL", DEFAULT_MODEL),
    embeddingModel: str(
      "KEYBASE_ANSWER_EMBEDDING_MODEL",
      DEFAULT_EMBEDDING_MODEL,
    ),
    classificationModel: str(
      "KEYBASE_ANSWER_CLASSIFICATION_MODEL",
      "gpt-5.6-luna",
    ),
    maxSources: Math.max(1, num("KEYBASE_ANSWER_MAX_SOURCES", 6)),
    maxQuestionLength: Math.max(
      40,
      num("KEYBASE_ANSWER_MAX_QUESTION_LENGTH", 600),
    ),
    hourlyLimit: Math.max(1, num("KEYBASE_ANSWER_HOURLY_LIMIT", 8)),
    cacheTtlSeconds: Math.max(0, num("KEYBASE_ANSWER_CACHE_TTL", 60 * 60 * 24 * 7)),
    minRelevance: num("KEYBASE_ANSWER_MIN_RELEVANCE", 0.34),
    strongRelevance: num("KEYBASE_ANSWER_STRONG_RELEVANCE", 0.58),
    minRelevantSources: Math.max(
      1,
      num("KEYBASE_ANSWER_MIN_RELEVANT_SOURCES", 2),
    ),
    maxPassagesPerSource: Math.max(
      1,
      num("KEYBASE_ANSWER_MAX_PASSAGES_PER_SOURCE", 3),
    ),
    freshnessWindowDays: Math.max(
      1,
      num("KEYBASE_ANSWER_FRESHNESS_WINDOW_DAYS", 120),
    ),
    freshnessHalfLifeDays: Math.max(
      1,
      num("KEYBASE_ANSWER_FRESHNESS_HALF_LIFE_DAYS", 240),
    ),
  };
}

/** Whether the feature should render at all. Checked by the page and the API. */
export function isFeatureEnabled(): boolean {
  return getConfig().enabled;
}

/**
 * Mock mode is a development affordance and must never be reachable in
 * production, where a missing key has to fail loudly rather than quietly serve
 * invented financial answers.
 */
export function isMockMode(): boolean {
  const { useMock } = getConfig();
  if (!useMock) return false;
  return process.env.NODE_ENV !== "production";
}

export function getOpenAiApiKey(): string | undefined {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key ? key : undefined;
}

/** The compliance disclaimer printed under every completed answer. */
export const ANSWER_DISCLAIMER =
  "Keybase Answer provides general information based on Keybase Financial Group's published content. It does not provide personalized financial, investment, tax, or legal advice.";
