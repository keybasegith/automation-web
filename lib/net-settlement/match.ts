/**
 * Deterministic, staged matching engine.
 *
 *   Stage 1  Exact reference match  (orderId/wireOrder/sourceId/contract)
 *   Stage 2  Exact composite match  (dealer+currency+fund+account+type+amount+date)
 *   Stage 3  Date-tolerant composite (±N business days, when configured)
 *   Stage 4  Aggregate match         (group totals equal on each side)
 *   Stage 5  Probable match          (same amount+fund, human confirmation only)
 *
 * A record is never reused across matches. Amount comparison is decimal-safe
 * (integer cents) and, because Fundserv/Winfund use opposite buy/sell sign
 * conventions, uses absolute value for the equality test while reporting the
 * signed difference.
 */

import type {
  FundservRecord,
  WinfundRecord,
  MatchResult,
  MatchStatus,
  MatchConfidence,
  MatchingRules,
} from "./types";
import { DEFAULT_MATCHING_RULES } from "./types";

interface Comparison {
  matched: string[];
  mismatched: string[];
  amountDiffCents: number; // |f| - |w|
  dateDiffDays: number | null;
  amountEqual: boolean;
}

function fundDate(f: FundservRecord): string | null {
  return f.settlementDate ?? f.tradeDate;
}
function winDate(w: WinfundRecord): string | null {
  return w.trustSettledDate ?? w.trustTransactionDate;
}

function dayDiff(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const da = Date.parse(a + "T00:00:00Z");
  const db = Date.parse(b + "T00:00:00Z");
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.abs(Math.round((da - db) / 86400000));
}

function compare(
  f: FundservRecord,
  w: WinfundRecord,
  rules: MatchingRules
): Comparison {
  const matched: string[] = [];
  const mismatched: string[] = [];

  const fAmt = f.settlementAmountCents;
  const wAmt = w.amountCents;
  const amountDiffCents =
    fAmt !== null && wAmt !== null ? Math.abs(fAmt) - Math.abs(wAmt) : NaN;
  const amountEqual =
    fAmt !== null && wAmt !== null &&
    Math.abs(amountDiffCents) <= rules.amountToleranceCents;
  (amountEqual ? matched : mismatched).push("amount");

  const eq = (a: string | null, b: string | null, field: string) => {
    if (a !== null && b !== null) (a === b ? matched : mismatched).push(field);
  };
  eq(f.currency, w.currency, "currency");
  eq(f.dealerCode, w.dealerCode, "dealer");
  eq(f.fundId, w.fundNumber, "fund");
  eq(f.dealerAccountId, w.planId, "account");
  eq(f.transactionType, w.transactionType, "transactionType");

  const dateDiffDays = dayDiff(fundDate(f), winDate(w));
  if (dateDiffDays !== null) {
    (dateDiffDays <= rules.dateToleranceDays ? matched : mismatched).push("date");
  }

  if (rules.requireBankCode && !w.bankCode) mismatched.push("bankCode");

  return {
    matched,
    mismatched,
    amountDiffCents: Number.isNaN(amountDiffCents) ? 0 : amountDiffCents,
    dateDiffDays,
    amountEqual,
  };
}

/** Decide the status of a linked pair from its comparison. */
function classify(cmp: Comparison, linkedByReference: boolean): MatchStatus {
  if (!cmp.amountEqual) return "AMOUNT_MISMATCH";
  if (cmp.mismatched.includes("currency")) return "CURRENCY_MISMATCH";
  if (cmp.mismatched.includes("dealer")) return "DEALER_MISMATCH";
  if (cmp.mismatched.includes("fund")) return "FUND_MISMATCH";
  if (cmp.mismatched.includes("account")) return "ACCOUNT_MISMATCH";
  if (cmp.mismatched.includes("transactionType")) return "TRANSACTION_TYPE_MISMATCH";
  if (cmp.mismatched.includes("date")) return "DATE_MISMATCH";
  if (cmp.mismatched.includes("bankCode")) return "BANK_CODE_MISSING";
  return linkedByReference ? "EXACT_MATCH" : "COMPOSITE_MATCH";
}

function confidenceFor(status: MatchStatus): MatchConfidence {
  switch (status) {
    case "EXACT_MATCH":
    case "REFERENCE_MATCH":
    case "COMPOSITE_MATCH":
      return "high";
    case "AGGREGATE_MATCH":
    case "DATE_MISMATCH":
      return "medium";
    case "PROBABLE_MATCH":
      return "low";
    default:
      return "medium";
  }
}

function refValues(f: FundservRecord): string[] {
  return [
    ...new Set(
      [f.orderId, f.sourceIdentifier, f.contractNumber, f.rawReference].filter(
        (v): v is string => !!v
      )
    ),
  ];
}
function winRefValues(w: WinfundRecord): string[] {
  return [...new Set([w.wireOrderNumber, w.sourceReference].filter((v): v is string => !!v))];
}

/** Dedupe records by id (a record may be indexed under multiple references). */
function uniqueById<T extends { id: string }>(records: T[]): T[] {
  return [...new Map(records.map((r) => [r.id, r])).values()];
}

function compositeKey(
  parts: (string | number | null)[],
  withDate: boolean,
  date: string | null
): string {
  const base = parts.map((p) => (p === null ? "~" : String(p))).join("|");
  return withDate ? `${base}|${date ?? "~"}` : base;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `m_${idCounter}`;
}

export interface MatchOutput {
  matches: MatchResult[];
}

export function matchRecords(
  fundserv: FundservRecord[],
  winfund: WinfundRecord[],
  rules: MatchingRules = DEFAULT_MATCHING_RULES
): MatchOutput {
  idCounter = 0;
  const usedF = new Set<string>();
  const usedW = new Set<string>();
  const matches: MatchResult[] = [];

  const link = (
    f: FundservRecord,
    w: WinfundRecord,
    status: MatchStatus,
    ruleUsed: string,
    cmp: Comparison
  ) => {
    usedF.add(f.id);
    usedW.add(w.id);
    matches.push({
      id: nextId(),
      status,
      confidence: confidenceFor(status),
      ruleUsed,
      explanation: buildExplanation(status, cmp),
      fundservIds: [f.id],
      winfundIds: [w.id],
      matchedFields: cmp.matched,
      mismatchedFields: cmp.mismatched,
      amountDifferenceCents: cmp.amountDiffCents,
      dateDifferenceDays: cmp.dateDiffDays,
    });
  };

  // ---- Stage 1: exact reference ----
  const winByRef = new Map<string, WinfundRecord[]>();
  for (const w of winfund) {
    for (const r of winRefValues(w)) {
      (winByRef.get(r) ?? winByRef.set(r, []).get(r)!).push(w);
    }
  }
  for (const f of fundserv) {
    if (usedF.has(f.id)) continue;
    for (const r of refValues(f)) {
      const cands = uniqueById((winByRef.get(r) ?? []).filter((w) => !usedW.has(w.id)));
      if (cands.length === 1) {
        const cmp = compare(f, cands[0], rules);
        const status = classify(cmp, true);
        link(f, cands[0], status, "stage1:reference", cmp);
        break;
      }
    }
  }

  // ---- Stage 2: exact composite (with date) ----
  matchComposite(fundserv, winfund, usedF, usedW, rules, true, "stage2:composite", link);

  // ---- Stage 3: date-tolerant composite ----
  if (rules.dateToleranceDays > 0) {
    matchComposite(fundserv, winfund, usedF, usedW, rules, false, "stage3:date-tolerant", link);
  }

  // ---- Stage 4: aggregate ----
  if (rules.enableAggregate) {
    aggregateMatch(fundserv, winfund, usedF, usedW, rules, matches);
  }

  // ---- Stage 5: probable ----
  if (rules.enableProbable) {
    for (const f of fundserv) {
      if (usedF.has(f.id) || f.settlementAmountCents === null) continue;
      const w = winfund.find(
        (x) =>
          !usedW.has(x.id) &&
          x.amountCents !== null &&
          Math.abs(x.amountCents) === Math.abs(f.settlementAmountCents!) &&
          (x.fundNumber === f.fundId || x.planId === f.dealerAccountId)
      );
      if (w) {
        const cmp = compare(f, w, rules);
        usedF.add(f.id);
        usedW.add(w.id);
        matches.push({
          id: nextId(),
          status: "PROBABLE_MATCH",
          confidence: "low",
          ruleUsed: "stage5:probable",
          explanation:
            "Same amount and fund/account but no reference or full composite match. Requires human confirmation.",
          fundservIds: [f.id],
          winfundIds: [w.id],
          matchedFields: cmp.matched,
          mismatchedFields: cmp.mismatched,
          amountDifferenceCents: cmp.amountDiffCents,
          dateDifferenceDays: cmp.dateDiffDays,
        });
      }
    }
  }

  // ---- Leftovers ----
  for (const f of fundserv) {
    if (!usedF.has(f.id)) {
      matches.push({
        id: nextId(),
        status: "UNMATCHED_FUNDSERV",
        confidence: "high",
        ruleUsed: "unmatched",
        explanation: "No Winfund record matched this Fundserv transaction.",
        fundservIds: [f.id],
        winfundIds: [],
        matchedFields: [],
        mismatchedFields: [],
        amountDifferenceCents: f.settlementAmountCents ?? 0,
        dateDifferenceDays: null,
      });
    }
  }
  for (const w of winfund) {
    if (!usedW.has(w.id)) {
      matches.push({
        id: nextId(),
        status: "UNMATCHED_WINFUND",
        confidence: "high",
        ruleUsed: "unmatched",
        explanation: "No Fundserv record matched this Winfund transaction.",
        fundservIds: [],
        winfundIds: [w.id],
        matchedFields: [],
        mismatchedFields: [],
        amountDifferenceCents: -(w.amountCents ?? 0),
        dateDifferenceDays: null,
      });
    }
  }

  return { matches };
}

function matchComposite(
  fundserv: FundservRecord[],
  winfund: WinfundRecord[],
  usedF: Set<string>,
  usedW: Set<string>,
  rules: MatchingRules,
  withDate: boolean,
  ruleName: string,
  link: (f: FundservRecord, w: WinfundRecord, s: MatchStatus, r: string, c: Comparison) => void
) {
  const keyF = (f: FundservRecord) =>
    compositeKey(
      [f.dealerCode, f.currency, f.fundId, f.dealerAccountId, f.transactionType, Math.abs(f.settlementAmountCents ?? NaN)],
      withDate,
      fundDate(f)
    );
  const keyW = (w: WinfundRecord) =>
    compositeKey(
      [w.dealerCode, w.currency, w.fundNumber, w.planId, w.transactionType, Math.abs(w.amountCents ?? NaN)],
      withDate,
      winDate(w)
    );

  const winByKey = new Map<string, WinfundRecord[]>();
  for (const w of winfund) {
    if (usedW.has(w.id) || w.amountCents === null) continue;
    const k = keyW(w);
    (winByKey.get(k) ?? winByKey.set(k, []).get(k)!).push(w);
  }
  for (const f of fundserv) {
    if (usedF.has(f.id) || f.settlementAmountCents === null) continue;
    const cands = (winByKey.get(keyF(f)) ?? []).filter((w) => !usedW.has(w.id));
    if (cands.length >= 1) {
      const w = cands[0];
      const cmp = compare(f, w, rules);
      // Only accept when nothing except (tolerated) date/bankCode differs.
      const blocking = cmp.mismatched.filter((m) => m !== "date" && m !== "bankCode");
      if (blocking.length === 0) {
        const status = classify(cmp, false);
        link(f, w, status, ruleName, cmp);
      }
    }
  }
}

function aggregateMatch(
  fundserv: FundservRecord[],
  winfund: WinfundRecord[],
  usedF: Set<string>,
  usedW: Set<string>,
  rules: MatchingRules,
  matches: MatchResult[]
) {
  const aggKey = (
    dealer: string | null,
    currency: string | null,
    fund: string | null,
    account: string | null,
    type: string | null
  ) => [dealer, currency, fund, account, type].map((p) => p ?? "~").join("|");

  const fGroups = new Map<string, FundservRecord[]>();
  for (const f of fundserv) {
    if (usedF.has(f.id) || f.settlementAmountCents === null) continue;
    const k = aggKey(f.dealerCode, f.currency, f.fundId, f.dealerAccountId, f.transactionType);
    (fGroups.get(k) ?? fGroups.set(k, []).get(k)!).push(f);
  }
  const wGroups = new Map<string, WinfundRecord[]>();
  for (const w of winfund) {
    if (usedW.has(w.id) || w.amountCents === null) continue;
    const k = aggKey(w.dealerCode, w.currency, w.fundNumber, w.planId, w.transactionType);
    (wGroups.get(k) ?? wGroups.set(k, []).get(k)!).push(w);
  }

  for (const [k, fs] of fGroups) {
    const ws = wGroups.get(k);
    if (!ws || ws.length === 0) continue;
    if (fs.length === 1 && ws.length === 1) continue; // handled by composite
    const fTotal = fs.reduce((s, f) => s + Math.abs(f.settlementAmountCents ?? 0), 0);
    const wTotal = ws.reduce((s, w) => s + Math.abs(w.amountCents ?? 0), 0);
    if (Math.abs(fTotal - wTotal) <= rules.amountToleranceCents) {
      fs.forEach((f) => usedF.add(f.id));
      ws.forEach((w) => usedW.add(w.id));
      idCounter += 1;
      matches.push({
        id: `m_${idCounter}`,
        status: "AGGREGATE_MATCH",
        confidence: "medium",
        ruleUsed: "stage4:aggregate",
        explanation: `Group totals equal (${fs.length} Fundserv ↔ ${ws.length} Winfund) for ${k}.`,
        fundservIds: fs.map((f) => f.id),
        winfundIds: ws.map((w) => w.id),
        matchedFields: ["amount", "dealer", "currency", "fund", "account", "transactionType"],
        mismatchedFields: [],
        amountDifferenceCents: fTotal - wTotal,
        dateDifferenceDays: null,
      });
    }
  }
}

function buildExplanation(status: MatchStatus, cmp: Comparison): string {
  switch (status) {
    case "EXACT_MATCH":
      return "Reference and all key fields match; amounts equal.";
    case "COMPOSITE_MATCH":
      return "Matched on dealer, currency, fund, account, type, amount and date.";
    case "AMOUNT_MISMATCH":
      return `Linked by reference/composite but amounts differ by ${cmp.amountDiffCents} cents.`;
    case "DATE_MISMATCH":
      return `Fields match but settlement dates differ by ${cmp.dateDiffDays ?? "?"} day(s).`;
    case "BANK_CODE_MISSING":
      return "Matched, but the Winfund record is missing a required bank code.";
    default:
      return `Linked with mismatched fields: ${cmp.mismatched.join(", ") || "none"}.`;
  }
}
