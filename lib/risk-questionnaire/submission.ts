/**
 * Building and sending a completed Client Risk Questionnaire.
 *
 * The payload always carries the selected option ids. Scores travel with it
 * for the client's own display, but the API route recalculates every total
 * from those ids before storing anything — a browser-supplied total is never
 * trusted for a compliance record.
 */

import { FORM_VERSION, RISK_QUESTIONS } from "./config";
import { deriveRiskProfile, pointsForAnswer } from "./scoring";
import type {
  QuestionnaireState,
  QuestionnaireSubmission,
  RecordedAnswer,
  ScoredQuestionId,
} from "./types";

/**
 * Assembles the submission payload. Returns null when any scored question is
 * unanswered — callers run validateQuestionnaire() first, so null here means a
 * programming error rather than a user-facing one.
 */
export function buildSubmission(
  state: QuestionnaireState,
  completedAt: Date = new Date(),
): QuestionnaireSubmission | null {
  const answers: Partial<Record<ScoredQuestionId, RecordedAnswer>> = {};

  for (const question of RISK_QUESTIONS) {
    const optionId = state.answers[question.id];
    const points = pointsForAnswer(question.id, optionId);
    if (!optionId || points === null) return null;
    answers[question.id] = { optionId, points };
  }

  const profile = deriveRiskProfile(state.answers);
  if (profile.capacity.score === null || profile.tolerance.score === null) {
    return null;
  }
  if (state.acknowledgementType === null || !state.accountHolderSignature) {
    return null;
  }

  const trimmedAccountName = state.acknowledgementAccountName.trim();

  return {
    formVersion: FORM_VERSION,
    accountHolderName: state.accountHolderName.trim(),
    clientId: state.clientId.trim(),
    portfolioPriorities: { ...state.portfolioPriorities },
    investmentCheckFrequency: state.investmentCheckFrequency,
    answers: answers as Record<ScoredQuestionId, RecordedAnswer>,
    riskCapacityScore: profile.capacity.score,
    riskCapacityLevel: profile.capacityLevel,
    riskToleranceScore: profile.tolerance.score,
    riskToleranceLevel: profile.toleranceLevel,
    finalRiskRanking: profile.finalRiskRanking,
    reviewNotice: profile.reviewNotice,
    notes: state.notes,
    acknowledgement: {
      type: state.acknowledgementType,
      accountName:
        state.acknowledgementType === "single_account"
          ? trimmedAccountName || null
          : null,
    },
    accountHolderSignature: state.accountHolderSignature,
    accountHolderDate: state.accountHolderDate,
    advisorName: state.advisorName.trim() || null,
    advisorSignature: state.advisorSignature,
    advisorDate: state.advisorDate.trim() || null,
    completedAt: completedAt.toISOString(),
  };
}

export interface SubmitResult {
  ok: boolean;
  /** False when the deployment has no configured storage for the record. */
  stored: boolean;
  /** Server-recalculated figures, when the server accepted the submission. */
  recalculated?: {
    riskCapacityScore: number;
    riskToleranceScore: number;
    finalRiskRanking: string | null;
  };
  error?: string;
}

export const SUBMIT_ENDPOINT = "/api/client-risk-questionnaire";

/**
 * The single seam between the form and persistence. Swap the body of this
 * function to route completed questionnaires somewhere else.
 */
export async function submitRiskQuestionnaire(
  payload: QuestionnaireSubmission,
): Promise<SubmitResult> {
  const response = await fetch(SUBMIT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Fall through to the status-based error below.
  }

  const data = (body ?? {}) as Partial<SubmitResult>;

  if (!response.ok) {
    return {
      ok: false,
      stored: false,
      error: data.error ?? `Submission failed (${response.status}).`,
    };
  }

  return {
    ok: true,
    stored: data.stored === true,
    recalculated: data.recalculated,
  };
}
