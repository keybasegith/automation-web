/**
 * Deterministic scoring for the Client Risk Questionnaire.
 *
 * Pure functions only — no I/O, no randomness, no model calls. Everything here
 * reads structured point values from ./config.ts; nothing parses display text.
 *
 * The pipeline is:
 *   selected option ids -> point values -> section totals -> band lookup
 *   -> lower of the two levels.
 */

import {
  CAPACITY_QUESTION_IDS,
  QUESTIONS_BY_ID,
  RISK_LEVEL_BANDS,
  RISK_LEVEL_ORDER,
  TOLERANCE_QUESTION_IDS,
  UNBANDED_SCORE_NOTICE,
} from "./config";
import type {
  RiskLevel,
  RiskLevelResolution,
  RiskSection,
  ScoredQuestionId,
  SectionScore,
} from "./types";

/** Question ids belonging to a section, in printed order. */
export function questionIdsForSection(
  section: RiskSection,
): readonly ScoredQuestionId[] {
  return section === "capacity" ? CAPACITY_QUESTION_IDS : TOLERANCE_QUESTION_IDS;
}

/**
 * Points for one answered question, or null when it is unanswered or the
 * stored option id does not belong to that question.
 */
export function pointsForAnswer(
  questionId: ScoredQuestionId,
  optionId: string | undefined,
): number | null {
  if (!optionId) return null;
  const option = QUESTIONS_BY_ID[questionId]?.options.find((o) => o.id === optionId);
  return option ? option.points : null;
}

/**
 * Section total. Returns `score: null` until every question in the section is
 * answered — an unanswered question must never be silently treated as a zero
 * and produce a finished risk level.
 */
export function calculateSectionScore(
  answers: Partial<Record<ScoredQuestionId, string>>,
  section: RiskSection,
): SectionScore {
  const ids = questionIdsForSection(section);
  let total = 0;
  let answered = 0;

  for (const id of ids) {
    const points = pointsForAnswer(id, answers[id]);
    if (points === null) continue;
    total += points;
    answered += 1;
  }

  const complete = answered === ids.length;
  return { score: complete ? total : null, answered, total: ids.length, complete };
}

/**
 * Band lookup. Returns null for a score that falls in no printed band — see
 * the score-12 gap documented in config.ts. Callers must handle null rather
 * than defaulting it to a level.
 */
export function getRiskLevel(score: number): RiskLevel | null {
  const band = RISK_LEVEL_BANDS.find((b) => score >= b.min && score <= b.max);
  return band ? band.level : null;
}

/** getRiskLevel with the reason attached, for anything user-facing. */
export function resolveRiskLevel(score: number): RiskLevelResolution {
  const level = getRiskLevel(score);
  return level === null
    ? { status: "requires_review", score, reason: UNBANDED_SCORE_NOTICE(score) }
    : { status: "resolved", level };
}

/** The lower (more conservative) of two risk levels. */
export function getLowerRiskLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_LEVEL_ORDER[a] <= RISK_LEVEL_ORDER[b] ? a : b;
}

/**
 * "Your risk ranking is determined by the lower of the two Risk Levels derived
 * from your Risk Capacity and Risk Tolerance scores above."
 *
 * Never an average, never a sum, never the higher of the two. Null until both
 * levels are known.
 */
export function getFinalRiskRanking(
  capacityLevel: RiskLevel | null,
  toleranceLevel: RiskLevel | null,
): RiskLevel | null {
  if (capacityLevel === null || toleranceLevel === null) return null;
  return getLowerRiskLevel(capacityLevel, toleranceLevel);
}

export interface RiskProfile {
  capacity: SectionScore;
  tolerance: SectionScore;
  capacityLevel: RiskLevel | null;
  toleranceLevel: RiskLevel | null;
  finalRiskRanking: RiskLevel | null;
  /** Set when a completed section's score fell outside every printed band. */
  reviewNotice: string | null;
}

/** The whole derivation in one pass. The only place the UI reads results from. */
export function deriveRiskProfile(
  answers: Partial<Record<ScoredQuestionId, string>>,
): RiskProfile {
  const capacity = calculateSectionScore(answers, "capacity");
  const tolerance = calculateSectionScore(answers, "tolerance");

  const capacityResolution =
    capacity.score === null ? null : resolveRiskLevel(capacity.score);
  const toleranceResolution =
    tolerance.score === null ? null : resolveRiskLevel(tolerance.score);

  const capacityLevel =
    capacityResolution?.status === "resolved" ? capacityResolution.level : null;
  const toleranceLevel =
    toleranceResolution?.status === "resolved" ? toleranceResolution.level : null;

  const notices = [capacityResolution, toleranceResolution]
    .filter((r) => r?.status === "requires_review")
    .map((r) => (r as { reason: string }).reason);

  return {
    capacity,
    tolerance,
    capacityLevel,
    toleranceLevel,
    finalRiskRanking: getFinalRiskRanking(capacityLevel, toleranceLevel),
    reviewNotice: notices.length > 0 ? notices.join(" ") : null,
  };
}
