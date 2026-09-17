/**
 * The model-selection decision framework.
 *
 * Turns benchmark output into one comparable number so a choice can be argued
 * about explicitly rather than settled by whichever model felt best on the day.
 *
 * The weights are a starting point, not a law — they are data, they are
 * exported, and they are meant to be changed once we know what actually
 * matters in production. Change them deliberately and record why.
 *
 * Two rules the arithmetic enforces:
 *   1. Bigger is not automatically better. Latency and concurrency together
 *      carry more weight (40%) than answer quality (30%).
 *   2. A candidate that fails a hard gate cannot win on points. A model that
 *      falls over under load, or invents policies, is not a candidate at any
 *      score.
 */

export interface ScoringWeights {
  answerQuality: number;
  latency: number;
  concurrency: number;
  instructionFollowing: number;
  structuredOutput: number;
  operationalStability: number;
}

/** The agreed first-evaluation weights. Sum to 1. */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  answerQuality: 0.3,
  latency: 0.2,
  concurrency: 0.2,
  instructionFollowing: 0.1,
  structuredOutput: 0.1,
  operationalStability: 0.1,
};

/**
 * Each dimension is a 0–1 score. How to derive them from a benchmark run is
 * documented in benchmarks/internal-ai/README.md; they are inputs here so a
 * human can override any of them with judgement.
 */
export type CandidateScores = Record<keyof ScoringWeights, number>;

/**
 * Gates that disqualify regardless of weighted score.
 *
 * These are the failures that make a model unusable rather than merely worse,
 * so they are checked before, not blended into, the arithmetic.
 */
export interface HardGates {
  /** Did it stay up for the whole concurrency sweep? */
  survivedLoadTest: boolean;
  /** Did it decline to invent a policy it was not given? */
  refusedToFabricate: boolean;
  /** Did it fit in the GB10's unified memory at the target concurrency? */
  fitsInMemory: boolean;
  /** Did it return valid JSON when told to? */
  producedValidStructuredOutput: boolean;
}

export interface CandidateEvaluation {
  model: string;
  scores: CandidateScores;
  gates: HardGates;
}

export interface ScoredCandidate {
  model: string;
  /** Weighted total, 0–1. Meaningless on its own if `disqualified`. */
  weightedScore: number;
  disqualified: boolean;
  failedGates: string[];
  contributions: Record<keyof ScoringWeights, number>;
}

const GATE_LABELS: Record<keyof HardGates, string> = {
  survivedLoadTest: "fell over during the concurrency sweep",
  refusedToFabricate: "invented a policy it was not given",
  fitsInMemory: "did not fit in unified memory at the target concurrency",
  producedValidStructuredOutput: "could not produce valid JSON on request",
};

export function scoreCandidate(
  candidate: CandidateEvaluation,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): ScoredCandidate {
  const keys = Object.keys(weights) as (keyof ScoringWeights)[];

  const contributions = Object.fromEntries(
    keys.map((key) => {
      const raw = candidate.scores[key];
      const clamped = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0;
      return [key, clamped * weights[key]];
    })
  ) as Record<keyof ScoringWeights, number>;

  const failedGates = (Object.keys(candidate.gates) as (keyof HardGates)[])
    .filter((gate) => !candidate.gates[gate])
    .map((gate) => GATE_LABELS[gate]);

  return {
    model: candidate.model,
    weightedScore: keys.reduce((sum, key) => sum + contributions[key], 0),
    disqualified: failedGates.length > 0,
    failedGates,
    contributions,
  };
}

/**
 * Rank candidates. Anything that failed a gate sorts last regardless of score,
 * so a disqualified model can never appear to be the recommendation.
 */
export function rankCandidates(
  candidates: readonly CandidateEvaluation[],
  weights: ScoringWeights = DEFAULT_WEIGHTS
): ScoredCandidate[] {
  return candidates
    .map((candidate) => scoreCandidate(candidate, weights))
    .sort((a, b) => {
      if (a.disqualified !== b.disqualified) return a.disqualified ? 1 : -1;
      return b.weightedScore - a.weightedScore;
    });
}

/** Guard against a weights edit that silently stops summing to 1. */
export function weightsAreValid(weights: ScoringWeights): boolean {
  const values = Object.values(weights);
  if (values.some((value) => !Number.isFinite(value) || value < 0)) return false;
  return Math.abs(values.reduce((sum, value) => sum + value, 0) - 1) < 1e-9;
}
