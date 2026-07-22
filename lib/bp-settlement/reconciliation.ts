/**
 * Deterministic Buy/Sell reconciliation (spec §"MATCHING LOGIC",
 * §"MISMATCH TYPES", §"BUY AND SELL SUMMARY", §"RESULT STATUS").
 *
 * Everything is derived from the uploaded files: expected figures from the
 * Fundserv Category Summary, detail totals from the Fundserv detail files, and
 * Not-Settled totals from the Winfund file — each shown independently, never one
 * substituting for another. Amounts are integer cents.
 */

import type {
  NormalizedTransaction,
  FundservCategorySummary,
  MatchRow,
  MismatchStatus,
  SideComparison,
  SettlementSide,
  TransactionType,
  AnalysisResult,
  OverallStatus,
  FieldComparison,
} from "./types";
import { AMOUNT_TOLERANCE_CENTS, LOW_CONFIDENCE_THRESHOLD } from "./constants";
import { amountsEqual, sumCents } from "./money";
import { isNotSettled } from "./normalize";

export interface ReconcileInput {
  category: FundservCategorySummary | null;
  fundservDetail: NormalizedTransaction[];
  winfund: NormalizedTransaction[];
  detailAvailable: boolean;
  winfundAvailable: boolean;
  usdExcludedCount: number;
  warnings: string[];
  blockingErrors?: string[];
}

const sideOf = (t: TransactionType): SettlementSide => (t === "BUY_SHARES" ? "BUY" : "SELL");
const idKey = (t: NormalizedTransaction) => [t.supplierCode, t.fundCode, t.planId].map((v) => v ?? "~").join("|");
const fullKey = (t: NormalizedTransaction) =>
  [t.supplierCode, t.fundCode, t.planId, t.transactionType, t.normalizedAmountCents].map((v) => v ?? "~").join("|");

function dayDiff(a?: string, b?: string): number | null {
  if (!a || !b) return null;
  const da = Date.parse(a + "T00:00:00Z");
  const db = Date.parse(b + "T00:00:00Z");
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.abs(Math.round((da - db) / 86400000));
}

function compareFields(f: NormalizedTransaction, w: NormalizedTransaction): { compared: FieldComparison[]; matched: string[]; different: string[] } {
  const compared: FieldComparison[] = [];
  const matched: string[] = [];
  const different: string[] = [];
  const push = (field: string, fv: string | null, wv: string | null, equal: boolean) => {
    compared.push({ field, fundservValue: fv, winfundValue: wv, equal });
    (equal ? matched : different).push(field);
  };
  push("supplier", f.supplierCode ?? null, w.supplierCode ?? null, f.supplierCode === w.supplierCode);
  push("fund", f.fundCode ?? null, w.fundCode ?? null, f.fundCode === w.fundCode);
  push("plan", f.planId ?? null, w.planId ?? null, f.planId === w.planId);
  push("workOrder", f.workOrderNumber ?? null, w.workOrderNumber ?? null, !!f.workOrderNumber && f.workOrderNumber === w.workOrderNumber);
  push("type", f.transactionType, w.transactionType, f.transactionType === w.transactionType);
  push("amount", (f.normalizedAmountCents / 100).toFixed(2), (w.normalizedAmountCents / 100).toFixed(2), amountsEqual(f.normalizedAmountCents, w.normalizedAmountCents, AMOUNT_TOLERANCE_CENTS));
  push("settlementDate", f.settlementDate ?? null, w.settlementDate ?? null, !!f.settlementDate && f.settlementDate === w.settlementDate);
  return { compared, matched, different };
}

const REASON: Record<MismatchStatus, string> = {
  EXACT_MATCH: "The Fundserv and Winfund transactions match on all identifying fields and amount.",
  MISSING_IN_WINFUND: "This Fundserv transaction was not found in the Winfund Not Settled export.",
  EXTRA_IN_WINFUND: "This Winfund unsettled transaction does not appear in the Fundserv detail file.",
  AMOUNT_MISMATCH: "The supplier, fund, plan and transaction type match, but the amounts differ.",
  WRONG_SETTLEMENT_DATE: "A matching transaction was found, but the Winfund settlement date differs.",
  WRONG_TRANSACTION_TYPE: "Identifying fields and amount match, but the transaction types differ.",
  DUPLICATE_IN_WINFUND: "Two or more Winfund rows match one Fundserv transaction.",
  DUPLICATE_IN_FUNDSERV: "Two or more Fundserv rows share the same comparison key.",
  WRONG_STATUS: "A matching Winfund transaction exists, but it is not marked Not Settled.",
  LOW_EXTRACTION_CONFIDENCE: "One or more fields could not be reliably extracted from the file.",
  MANUAL_REVIEW: "This transaction needs manual review.",
};

let seq = 0;
const nextId = () => `m_${++seq}`;

function makeRow(
  status: MismatchStatus,
  f: NormalizedTransaction | null,
  ws: NormalizedTransaction[],
  extraReason?: string
): MatchRow {
  const w = ws[0];
  let comparedFields: FieldComparison[] = [];
  let matchedFields: string[] = [];
  let differentFields: string[] = [];
  if (f && w) {
    const cmp = compareFields(f, w);
    comparedFields = cmp.compared;
    matchedFields = cmp.matched;
    differentFields = cmp.different;
  }
  const fAmt = f ? f.normalizedAmountCents : null;
  const wAmt = w ? w.normalizedAmountCents : null;
  return {
    id: nextId(),
    status,
    side: sideOf(f?.transactionType ?? w!.transactionType),
    reason: extraReason ? `${REASON[status]} ${extraReason}` : REASON[status],
    fundservTransactionId: f?.id ?? null,
    winfundTransactionIds: ws.map((x) => x.id),
    matchedFields,
    differentFields,
    comparedFields,
    fundservAmountCents: fAmt,
    winfundAmountCents: ws.length ? sumCents(ws.map((x) => x.normalizedAmountCents)) : wAmt,
    amountDifferenceCents: fAmt !== null && wAmt !== null ? fAmt - sumCents(ws.map((x) => x.normalizedAmountCents)) : null,
    dateDifferenceDays: f && w ? dayDiff(f.settlementDate, w.settlementDate) : null,
  };
}

/** Match all Fundserv detail transactions against all Winfund transactions. */
export function matchTransactions(
  fundserv: NormalizedTransaction[],
  winfund: NormalizedTransaction[]
): MatchRow[] {
  seq = 0;
  const matches: MatchRow[] = [];
  const usedW = new Set<string>();

  // Duplicate-in-Fundserv detection.
  const fKeyCount = new Map<string, number>();
  for (const f of fundserv) fKeyCount.set(fullKey(f), (fKeyCount.get(fullKey(f)) ?? 0) + 1);

  // Index Winfund by work order and by identity key.
  const wByWO = new Map<string, NormalizedTransaction[]>();
  const wByIdKey = new Map<string, NormalizedTransaction[]>();
  for (const w of winfund) {
    if (w.workOrderNumber) (wByWO.get(w.workOrderNumber) ?? wByWO.set(w.workOrderNumber, []).get(w.workOrderNumber)!).push(w);
    (wByIdKey.get(idKey(w)) ?? wByIdKey.set(idKey(w), []).get(idKey(w))!).push(w);
  }

  for (const f of fundserv) {
    const candidateSet = new Map<string, NormalizedTransaction>();
    for (const w of [...(f.workOrderNumber ? wByWO.get(f.workOrderNumber) ?? [] : []), ...(wByIdKey.get(idKey(f)) ?? [])]) {
      if (!usedW.has(w.id)) candidateSet.set(w.id, w);
    }
    const cands = [...candidateSet.values()];

    const amtEq = (w: NormalizedTransaction) => amountsEqual(f.normalizedAmountCents, w.normalizedAmountCents, AMOUNT_TOLERANCE_CENTS);
    const dateEq = (w: NormalizedTransaction) => !!f.settlementDate && f.settlementDate === w.settlementDate;

    // Fundserv duplicate overrides everything else for this row.
    if ((fKeyCount.get(fullKey(f)) ?? 0) > 1) {
      matches.push(makeRow("DUPLICATE_IN_FUNDSERV", f, []));
      continue;
    }

    const clean = cands.filter((w) => w.transactionType === f.transactionType && amtEq(w) && dateEq(w) && isNotSettled(w.settlementStatus));
    if (clean.length === 1) {
      usedW.add(clean[0].id);
      matches.push(makeRow("EXACT_MATCH", f, [clean[0]]));
      continue;
    }
    if (clean.length > 1) {
      clean.forEach((w) => usedW.add(w.id));
      matches.push(makeRow("DUPLICATE_IN_WINFUND", f, clean));
      continue;
    }

    const sameTypeAmt = cands.filter((w) => w.transactionType === f.transactionType && amtEq(w));
    const wrongStatus = sameTypeAmt.find((w) => dateEq(w) && !isNotSettled(w.settlementStatus));
    if (wrongStatus) {
      usedW.add(wrongStatus.id);
      matches.push(makeRow("WRONG_STATUS", f, [wrongStatus], `Winfund status: ${wrongStatus.settlementStatus ?? "unknown"}.`));
      continue;
    }
    const wrongDate = sameTypeAmt.find((w) => !dateEq(w));
    if (wrongDate) {
      usedW.add(wrongDate.id);
      matches.push(makeRow("WRONG_SETTLEMENT_DATE", f, [wrongDate]));
      continue;
    }
    const amountDiff = cands.find((w) => w.transactionType === f.transactionType && !amtEq(w));
    if (amountDiff) {
      usedW.add(amountDiff.id);
      const detail = `Fundserv shows $${(f.normalizedAmountCents / 100).toFixed(2)} and Winfund shows $${(amountDiff.normalizedAmountCents / 100).toFixed(2)}.`;
      matches.push(makeRow("AMOUNT_MISMATCH", f, [amountDiff], detail));
      continue;
    }
    const wrongType = cands.find((w) => w.transactionType !== f.transactionType && amtEq(w));
    if (wrongType) {
      usedW.add(wrongType.id);
      matches.push(makeRow("WRONG_TRANSACTION_TYPE", f, [wrongType]));
      continue;
    }

    // Nothing found.
    const status: MismatchStatus =
      f.extractionConfidence < LOW_CONFIDENCE_THRESHOLD ? "LOW_EXTRACTION_CONFIDENCE" : "MISSING_IN_WINFUND";
    matches.push(makeRow(status, f, []));
  }

  // Leftover Winfund rows.
  for (const w of winfund) {
    if (usedW.has(w.id)) continue;
    matches.push(makeRow("EXTRA_IN_WINFUND", null, [w]));
  }

  return matches;
}

export function isMismatch(status: MismatchStatus): boolean {
  return status !== "EXACT_MATCH";
}

function buildSide(
  side: SettlementSide,
  input: ReconcileInput,
  matches: MatchRow[]
): SideComparison {
  const type: TransactionType = side === "BUY" ? "BUY_SHARES" : "SELL_SHARES";
  const fD = input.fundservDetail.filter((t) => t.transactionType === type);
  const wNS = input.winfund.filter((t) => t.transactionType === type && isNotSettled(t.settlementStatus));

  const detailCount = fD.length;
  const detailTotalCents = sumCents(fD.map((t) => t.normalizedAmountCents));
  const winfundCount = wNS.length;
  const winfundTotalCents = sumCents(wNS.map((t) => t.normalizedAmountCents));

  const line = input.category ? (side === "BUY" ? input.category.buy : input.category.sell) : null;
  const summaryTotalCents = line?.amountCents ?? null;
  const summaryCount = line?.txCount ?? null;

  const basis: SideComparison["basis"] =
    input.detailAvailable && fD.length > 0 ? "DETAIL" : summaryTotalCents !== null ? "SUMMARY" : "NONE";
  const fundservTotal = basis === "DETAIL" ? detailTotalCents : basis === "SUMMARY" ? summaryTotalCents : null;
  const fundservCount = basis === "DETAIL" ? detailCount : basis === "SUMMARY" ? summaryCount : null;

  const amountDifferenceCents = fundservTotal !== null && input.winfundAvailable ? fundservTotal - winfundTotalCents : null;
  const countDifference = fundservCount !== null && input.winfundAvailable ? fundservCount - winfundCount : null;
  const mismatchCount = matches.filter((m) => m.side === side && isMismatch(m.status)).length;

  const matched =
    amountDifferenceCents === 0 && countDifference === 0 && mismatchCount === 0;

  return {
    side,
    summaryCount,
    summaryTotalCents,
    summarySource: line?.source ?? null,
    detailCount,
    detailTotalCents,
    detailAvailable: input.detailAvailable,
    winfundCount,
    winfundTotalCents,
    winfundAvailable: input.winfundAvailable,
    basis,
    amountDifferenceCents,
    countDifference,
    mismatchCount,
    matched,
  };
}

export function analyze(input: ReconcileInput): AnalysisResult {
  const warnings = [...input.warnings];
  const blockingErrors = [...(input.blockingErrors ?? [])];

  // Settlement date must come from the files; differing dates block analysis.
  const dates = new Set<string>();
  for (const t of [...input.fundservDetail, ...input.winfund]) if (t.settlementDate) dates.add(t.settlementDate);
  let settlementDate: string | null = null;
  if (dates.size === 1) settlementDate = [...dates][0];
  else if (dates.size > 1) blockingErrors.push(`Uploaded files contain different settlement dates (${[...dates].join(", ")}).`);

  // Currency confirmation (CAD-only). If nothing CAD could be confirmed, block.
  const anyCad = input.fundservDetail.length > 0 || input.winfund.length > 0 || (input.category?.parsed ?? false);
  if (!anyCad) blockingErrors.push("Canadian Dollar currency could not be confirmed from the uploaded files.");

  const matches = matchTransactions(input.fundservDetail, input.winfund);
  const buy = buildSide("BUY", input, matches);
  const sell = buildSide("SELL", input, matches);

  const missingRequired =
    !input.category?.parsed || !input.detailAvailable || !input.winfundAvailable;

  let overallStatus: OverallStatus;
  if (blockingErrors.length > 0 || missingRequired) {
    overallStatus = "FILE_REVIEW_REQUIRED";
  } else {
    const b = !buy.matched;
    const s = !sell.matched;
    overallStatus = b && s ? "BUY_AND_SELL_MISMATCH" : b ? "BUY_MISMATCH" : s ? "SELL_MISMATCH" : "MATCHED";
  }

  return {
    overallStatus,
    overallExplanation: explain(overallStatus, buy, sell, blockingErrors, missingRequired, input),
    settlementDate,
    buy,
    sell,
    matches,
    usdExcludedCount: input.usdExcludedCount,
    warnings,
    blockingErrors,
  };
}

function money(cents: number | null): string {
  if (cents === null) return "unavailable";
  const neg = cents < 0;
  const abs = Math.abs(cents);
  return `${neg ? "-" : ""}$${Math.floor(abs / 100).toLocaleString("en-CA")}.${String(abs % 100).padStart(2, "0")}`;
}

function explain(
  status: OverallStatus,
  buy: SideComparison,
  sell: SideComparison,
  blockingErrors: string[],
  missingRequired: boolean,
  input: ReconcileInput
): string {
  if (blockingErrors.length > 0) return blockingErrors[0];
  if (missingRequired) {
    const missing: string[] = [];
    if (!input.category?.parsed) missing.push("Fundserv Category Summary");
    if (!input.detailAvailable) missing.push("Fundserv transaction details");
    if (!input.winfundAvailable) missing.push("Winfund Not Settled transactions");
    return `File review required — could not read: ${missing.join(", ")}.`;
  }
  if (status === "MATCHED") return "All Buy and Sell totals match.";
  const parts: string[] = [];
  const describe = (label: string, s: SideComparison) => {
    if (s.matched) return;
    if (s.amountDifferenceCents && s.amountDifferenceCents !== 0) {
      parts.push(`${label} total differs by ${money(Math.abs(s.amountDifferenceCents))}${s.mismatchCount ? ` across ${s.mismatchCount} transaction(s)` : ""}.`);
    } else if (s.mismatchCount > 0) {
      parts.push(`${label} total matches, but ${s.mismatchCount} transaction(s) differ (offsetting).`);
    } else if (s.countDifference && s.countDifference !== 0) {
      parts.push(`${label} count differs by ${Math.abs(s.countDifference)}.`);
    }
  };
  describe("Buy", buy);
  describe("Sell", sell);
  return parts.join(" ") || "A difference was found between Fundserv and Winfund.";
}
