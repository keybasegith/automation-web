/**
 * Reconciliation totals, exception derivation, and approval blockers.
 */

import type {
  FundservRecord,
  WinfundRecord,
  MatchResult,
  MatchStatus,
  ExceptionSeverity,
} from "./types";

export interface ReconciliationSummary {
  fundservCount: number;
  winfundCount: number;
  fundservTotalCents: number;
  winfundTotalCents: number;
  differenceCents: number;
  exactMatches: number;
  aggregateMatches: number;
  probableMatches: number;
  exceptions: number;
  unmatchedFundserv: number;
  unmatchedWinfund: number;
  counts: Partial<Record<MatchStatus, number>>;
}

const EXCEPTION_STATUSES: MatchStatus[] = [
  "AMOUNT_MISMATCH",
  "DATE_MISMATCH",
  "FUND_MISMATCH",
  "ACCOUNT_MISMATCH",
  "TRANSACTION_TYPE_MISMATCH",
  "CURRENCY_MISMATCH",
  "DEALER_MISMATCH",
  "BANK_CODE_MISSING",
  "DUPLICATE",
  "ALREADY_SETTLED",
  "MANUAL_ENTRY_REQUIRED",
  "REVIEW_REQUIRED",
  "UNMATCHED_FUNDSERV",
  "UNMATCHED_WINFUND",
  "PROBABLE_MATCH",
];

export function isExceptionStatus(s: MatchStatus): boolean {
  return EXCEPTION_STATUSES.includes(s);
}

export type MatchCategory =
  | "exact"
  | "possible"
  | "discrepancy"
  | "fundserv_only"
  | "winfund_only";

export function categoryOf(status: MatchStatus): MatchCategory {
  if (["EXACT_MATCH", "REFERENCE_MATCH", "COMPOSITE_MATCH", "AGGREGATE_MATCH"].includes(status))
    return "exact";
  if (status === "PROBABLE_MATCH") return "possible";
  if (status === "UNMATCHED_FUNDSERV") return "fundserv_only";
  if (status === "UNMATCHED_WINFUND") return "winfund_only";
  return "discrepancy";
}

export const SEVERITY_BY_STATUS: Partial<Record<MatchStatus, ExceptionSeverity>> = {
  CURRENCY_MISMATCH: "critical",
  DEALER_MISMATCH: "critical",
  DUPLICATE: "critical",
  ALREADY_SETTLED: "critical",
  AMOUNT_MISMATCH: "high",
  UNMATCHED_FUNDSERV: "high",
  UNMATCHED_WINFUND: "high",
  MANUAL_ENTRY_REQUIRED: "high",
  BANK_CODE_MISSING: "high",
  FUND_MISMATCH: "medium",
  ACCOUNT_MISMATCH: "medium",
  TRANSACTION_TYPE_MISMATCH: "medium",
  DATE_MISMATCH: "medium",
  PROBABLE_MATCH: "medium",
  REVIEW_REQUIRED: "low",
};

export function summarize(
  fundserv: FundservRecord[],
  winfund: WinfundRecord[],
  matches: MatchResult[]
): ReconciliationSummary {
  const fundservTotalCents = fundserv.reduce((s, f) => s + (f.settlementAmountCents ?? 0), 0);
  const winfundTotalCents = winfund.reduce((s, w) => s + (w.amountCents ?? 0), 0);
  const counts: Partial<Record<MatchStatus, number>> = {};
  for (const m of matches) counts[m.status] = (counts[m.status] ?? 0) + 1;

  return {
    fundservCount: fundserv.length,
    winfundCount: winfund.length,
    fundservTotalCents,
    winfundTotalCents,
    // Compare on absolute totals — sign conventions differ between systems.
    differenceCents: Math.abs(fundservTotalCents) - Math.abs(winfundTotalCents),
    exactMatches: (counts.EXACT_MATCH ?? 0) + (counts.REFERENCE_MATCH ?? 0) + (counts.COMPOSITE_MATCH ?? 0),
    aggregateMatches: counts.AGGREGATE_MATCH ?? 0,
    probableMatches: counts.PROBABLE_MATCH ?? 0,
    exceptions: matches.filter((m) => isExceptionStatus(m.status)).length,
    unmatchedFundserv: counts.UNMATCHED_FUNDSERV ?? 0,
    unmatchedWinfund: counts.UNMATCHED_WINFUND ?? 0,
    counts,
  };
}

export interface DerivedException {
  matchId: string;
  type: MatchStatus;
  severity: ExceptionSeverity;
  title: string;
  detail: string;
}

export function deriveExceptions(matches: MatchResult[]): DerivedException[] {
  return matches
    .filter((m) => isExceptionStatus(m.status))
    .map((m) => ({
      matchId: m.id,
      type: m.status,
      severity: SEVERITY_BY_STATUS[m.status] ?? "medium",
      title: m.status.replace(/_/g, " "),
      detail: m.explanation,
    }));
}

export interface ApprovalContext {
  summary: ReconciliationSummary;
  exceptions: DerivedException[];
  hasFundservFile: boolean;
  hasWinfundFile: boolean;
  runDealer: string;
  runCurrency: string;
}

/**
 * Hard blockers that prevent approval (§19/§34). Managers may override only
 * with a mandatory reason + audit event — enforced at the API layer.
 */
export function approvalBlockers(ctx: ApprovalContext): string[] {
  const blockers: string[] = [];
  if (!ctx.hasFundservFile) blockers.push("No Fundserv source data has been imported.");
  if (!ctx.hasWinfundFile) blockers.push("No Winfund source data has been imported.");
  if (ctx.summary.differenceCents !== 0)
    blockers.push("The total difference between Fundserv and Winfund is not zero.");
  const criticals = ctx.exceptions.filter((e) => e.severity === "critical");
  if (criticals.length > 0)
    blockers.push(`${criticals.length} critical exception(s) remain unresolved.`);
  return blockers;
}
