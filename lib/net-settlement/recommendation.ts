/**
 * Turns a matched/exception result into actionable operator guidance:
 * the identifying context (plan, fund, client, amounts) plus a required action
 * and — for amount mismatches — a computed required adjustment.
 *
 * Pure and dependency-light so it can run in both the UI and on the server.
 */

import type { FundservRecord, WinfundRecord, MatchResult, MatchStatus } from "./types";
import { formatMoney } from "./money";

/** Minimal record shapes so both full records (server) and the reconciliation
 *  subset (client) can be passed in. */
type FundservLike = Pick<FundservRecord, "id" | "dealerAccountId" | "fundId" | "settlementAmountCents">;
type WinfundLike = Pick<WinfundRecord, "id" | "planId" | "fundNumber" | "clientName" | "amountCents">;
type MatchLike = Pick<MatchResult, "status" | "fundservIds" | "winfundIds" | "amountDifferenceCents">;

export interface ExceptionRecommendation {
  plan: string | null;
  fund: string | null;
  client: string | null;
  fundservAmountCents: number | null;
  winfundAmountCents: number | null;
  /** e.g. "Check whether a manual trust entry is required" */
  action: string;
  /** Only for amount mismatches, e.g. "Increase Winfund amount by $50.00" */
  adjustment?: string;
}

const money = (cents: number) => `$${formatMoney(Math.abs(cents))}`;

export function recommendForMatch(
  m: MatchLike,
  fundserv: FundservLike[],
  winfund: WinfundLike[]
): ExceptionRecommendation {
  const fById = new Map(fundserv.map((r) => [r.id, r]));
  const wById = new Map(winfund.map((r) => [r.id, r]));
  const f = m.fundservIds.map((id) => fById.get(id)).filter(Boolean) as FundservRecord[];
  const w = m.winfundIds.map((id) => wById.get(id)).filter(Boolean) as WinfundRecord[];

  const plan = f[0]?.dealerAccountId ?? w[0]?.planId ?? null;
  const fund = f[0]?.fundId ?? w[0]?.fundNumber ?? null;
  const client = w[0]?.clientName ?? null;
  const fundservAmountCents = f.length ? f.reduce((s, r) => s + (r.settlementAmountCents ?? 0), 0) : null;
  const winfundAmountCents = w.length ? w.reduce((s, r) => s + (r.amountCents ?? 0), 0) : null;

  const base = { plan, fund, client, fundservAmountCents, winfundAmountCents };

  switch (m.status) {
    case "AMOUNT_MISMATCH": {
      // amountDifferenceCents = |fundserv| - |winfund|
      const diff = m.amountDifferenceCents;
      const adjustment =
        diff > 0
          ? `Increase Winfund amount by ${money(diff)}`
          : diff < 0
          ? `Decrease Winfund amount by ${money(diff)}`
          : "Amounts already equal";
      return { ...base, action: "Reconcile the amount difference between Fundserv and Winfund.", adjustment };
    }
    case "UNMATCHED_FUNDSERV":
      return { ...base, action: "Check whether a manual trust entry is required in Winfund." };
    case "UNMATCHED_WINFUND":
      return { ...base, action: "Confirm whether this transaction should be removed or excluded." };
    case "BANK_CODE_MISSING":
      return { ...base, action: "Add or confirm the bank code before settlement." };
    case "MANUAL_ENTRY_REQUIRED":
      return { ...base, action: "Prepare a manual Winfund entry and attach supporting evidence." };
    case "DUPLICATE":
      return { ...base, action: "Verify this is not a duplicate settlement before proceeding." };
    case "ALREADY_SETTLED":
      return { ...base, action: "Confirm the transaction has not already been settled." };
    case "DATE_MISMATCH":
      return { ...base, action: "Confirm the correct settlement date on both systems." };
    case "CURRENCY_MISMATCH":
      return { ...base, action: "Correct the currency — it must match the settlement run." };
    case "DEALER_MISMATCH":
      return { ...base, action: "Correct the dealer — it must match the settlement run." };
    case "FUND_MISMATCH":
      return { ...base, action: "Confirm the fund on both systems." };
    case "ACCOUNT_MISMATCH":
      return { ...base, action: "Confirm the plan / account on both systems." };
    case "TRANSACTION_TYPE_MISMATCH":
      return { ...base, action: "Confirm the transaction type on both systems." };
    case "PROBABLE_MATCH":
      return { ...base, action: "Confirm or reject this probable match." };
    default:
      return { ...base, action: "Review and resolve this exception." };
  }
}

/** A compact one-line description used for persisted detail + reports. */
export function recommendationSummary(r: ExceptionRecommendation): string {
  const parts: string[] = [];
  if (r.plan) parts.push(`Plan ${r.plan}`);
  if (r.fund) parts.push(`Fund ${r.fund}`);
  if (r.client) parts.push(r.client);
  const ctx = parts.length ? `${parts.join(" · ")}. ` : "";
  const adj = r.adjustment ? ` Required adjustment: ${r.adjustment}.` : "";
  return `${ctx}Required action: ${r.action}${adj}`;
}

export function isExceptionMatch(status: MatchStatus): boolean {
  return [
    "AMOUNT_MISMATCH", "DATE_MISMATCH", "FUND_MISMATCH", "ACCOUNT_MISMATCH",
    "TRANSACTION_TYPE_MISMATCH", "CURRENCY_MISMATCH", "DEALER_MISMATCH",
    "BANK_CODE_MISSING", "DUPLICATE", "ALREADY_SETTLED", "MANUAL_ENTRY_REQUIRED",
    "REVIEW_REQUIRED", "UNMATCHED_FUNDSERV", "UNMATCHED_WINFUND", "PROBABLE_MATCH",
  ].includes(status);
}
