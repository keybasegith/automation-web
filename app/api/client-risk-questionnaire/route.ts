/**
 * Persists a completed Client Risk Questionnaire.
 *
 * The browser's own totals are read but never stored: every score, level and
 * ranking written to the database is recalculated here from the submitted
 * option ids. A mismatch is recorded on the row rather than accepted quietly,
 * so a tampered or stale client shows up in review instead of in a client's
 * official risk ranking.
 */

import { NextResponse } from "next/server";

import {
  FORM_VERSION,
  INVESTMENT_CHECK_VALUES,
  PORTFOLIO_PRIORITIES,
  RISK_QUESTIONS,
} from "@/lib/risk-questionnaire/config";
import { deriveRiskProfile } from "@/lib/risk-questionnaire/scoring";
import { isValidSignatureDataUrl } from "@/lib/signature";
import {
  getServerSupabase,
  isServerSupabaseConfigured,
} from "@/lib/supabaseClient";
import type {
  InvestmentCheckFrequency,
  PortfolioPriorityId,
  QuestionnaireSubmission,
  ScoredQuestionId,
} from "@/lib/risk-questionnaire/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "client_risk_questionnaires";

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

const bad = (message: string) =>
  NextResponse.json({ ok: false, stored: false, error: message }, { status: 400 });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON.");
  }

  const data = body as Partial<QuestionnaireSubmission>;

  const accountHolderName = text(data.accountHolderName, 200);
  if (!accountHolderName) return bad("Account holder's name is required.");

  // Rebuild the answer sheet from ids alone. Anything the client sent
  // alongside them (points, totals, levels) is ignored from here on.
  const answers: Partial<Record<ScoredQuestionId, string>> = {};
  for (const question of RISK_QUESTIONS) {
    const submitted = data.answers?.[question.id];
    const optionId = typeof submitted?.optionId === "string" ? submitted.optionId : null;
    if (!optionId || !question.options.some((o) => o.id === optionId)) {
      return bad(`Question ${question.number} is missing or has an unrecognised answer.`);
    }
    answers[question.id] = optionId;
  }

  const profile = deriveRiskProfile(answers);
  if (profile.capacity.score === null || profile.tolerance.score === null) {
    // Unreachable given the loop above, but a compliance record never gets
    // written off a partially scored questionnaire.
    return bad("The questionnaire is incomplete.");
  }

  const acknowledgementType = data.acknowledgement?.type;
  if (acknowledgementType !== "all_accounts" && acknowledgementType !== "single_account") {
    return bad("A client acknowledgement is required.");
  }
  const acknowledgementAccountName =
    acknowledgementType === "single_account"
      ? text(data.acknowledgement?.accountName, 200)
      : null;
  if (acknowledgementType === "single_account" && !acknowledgementAccountName) {
    return bad("Name the account this questionnaire applies to.");
  }

  if (!isValidSignatureDataUrl(data.accountHolderSignature)) {
    return bad("The account holder's signature is required.");
  }
  const accountHolderDate = text(data.accountHolderDate, 32);
  if (!accountHolderDate) return bad("The account holder's signing date is required.");

  const advisorSignature =
    data.advisorSignature && isValidSignatureDataUrl(data.advisorSignature)
      ? data.advisorSignature
      : null;

  const priorities: Record<string, number | null> = {};
  for (const priority of PORTFOLIO_PRIORITIES) {
    const raw = data.portfolioPriorities?.[priority.id as PortfolioPriorityId];
    priorities[priority.id] =
      typeof raw === "number" && Number.isInteger(raw) && raw >= 1 && raw <= PORTFOLIO_PRIORITIES.length
        ? raw
        : null;
  }

  const frequency = INVESTMENT_CHECK_VALUES.includes(
    data.investmentCheckFrequency as InvestmentCheckFrequency,
  )
    ? (data.investmentCheckFrequency as InvestmentCheckFrequency)
    : null;

  // Recording rather than rejecting: a disagreement is worth seeing.
  const clientTotalsDisagree =
    data.riskCapacityScore !== profile.capacity.score ||
    data.riskToleranceScore !== profile.tolerance.score ||
    data.finalRiskRanking !== profile.finalRiskRanking;

  const row = {
    form_version: FORM_VERSION,
    account_holder_name: accountHolderName,
    client_id: text(data.clientId, 100),
    portfolio_priorities: priorities,
    investment_check_frequency: frequency,
    answers: Object.fromEntries(
      RISK_QUESTIONS.map((q) => [
        q.id,
        {
          optionId: answers[q.id],
          points: q.options.find((o) => o.id === answers[q.id])!.points,
        },
      ]),
    ),
    risk_capacity_score: profile.capacity.score,
    risk_capacity_level: profile.capacityLevel,
    risk_tolerance_score: profile.tolerance.score,
    risk_tolerance_level: profile.toleranceLevel,
    final_risk_ranking: profile.finalRiskRanking,
    review_notice: profile.reviewNotice,
    notes: text(data.notes, 5000),
    acknowledgement_type: acknowledgementType,
    acknowledgement_account_name: acknowledgementAccountName,
    account_holder_signature: data.accountHolderSignature,
    account_holder_date: accountHolderDate,
    advisor_name: text(data.advisorName, 200),
    advisor_signature: advisorSignature,
    advisor_date: text(data.advisorDate, 32),
    completed_at: text(data.completedAt, 40) ?? new Date().toISOString(),
    metadata: { clientTotalsDisagree },
  };

  const recalculated = {
    riskCapacityScore: profile.capacity.score,
    riskToleranceScore: profile.tolerance.score,
    finalRiskRanking: profile.finalRiskRanking,
  };

  if (clientTotalsDisagree) {
    console.warn(
      "[client-risk-questionnaire] Client-supplied totals disagreed with the server recalculation; the server figures were stored.",
    );
  }

  if (!isServerSupabaseConfigured()) {
    console.warn(
      `[client-risk-questionnaire] Supabase is not configured — questionnaire for "${accountHolderName}" was scored but not persisted.`,
    );
    return NextResponse.json({ ok: true, stored: false, recalculated });
  }

  try {
    const supabase = getServerSupabase();
    const { error } = await supabase.from(TABLE).insert(row);
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("[client-risk-questionnaire] Failed to persist submission:", err);
    return NextResponse.json({ ok: true, stored: false, recalculated });
  }

  return NextResponse.json({ ok: true, stored: true, recalculated });
}
