/**
 * DEVELOPMENT + TEST fixtures only. These are never imported by the production
 * page or shown in a real analysis session (spec §"PRODUCTION DEMO DATA RULE").
 * They exist so the reconciliation logic can be unit-tested deterministically.
 */

import type {
  NormalizedTransaction,
  FundservCategorySummary,
  TransactionType,
  SourceRef,
} from "./types";
import type { ReconcileInput } from "./reconciliation";

const DATE = "2026-07-17";
const BUY_TOTAL = 47089305; // 470,893.05
const SELL_TOTAL = 9669992; // 96,699.92
const BUY_COUNT = 81;
const SELL_COUNT = 8;

function distribute(total: number, n: number, firstFixed?: number): number[] {
  const amounts: number[] = [];
  let running = 0;
  for (let i = 0; i < n - 1; i++) {
    const a = i === 0 && firstFixed !== undefined ? firstFixed : 300000 + ((i * 37) % 50) * 5000;
    amounts.push(a);
    running += a;
  }
  amounts.push(total - running);
  return amounts;
}

function fundservTx(seq: number, type: TransactionType, amount: number): NormalizedTransaction {
  return {
    id: `F${seq}`,
    source: "FUNDSERV",
    sourceFileName: "fundserv-detail.xlsx",
    sourceRow: seq + 2,
    sourceSheet: "Transactions",
    settlementDate: DATE,
    currency: "CAD",
    supplierCode: "PIM",
    fundCode: `${1000 + (seq % 40)}`,
    planId: `PL${100000 + seq}`,
    workOrderNumber: `WO${200000 + seq}`,
    transactionType: type,
    transactionStatus: "Matched",
    originalAmountCents: amount,
    normalizedAmountCents: amount,
    extractionConfidence: 0.95,
  };
}

function winfundTx(f: NormalizedTransaction, over: Partial<NormalizedTransaction> = {}): NormalizedTransaction {
  const signed = f.transactionType === "BUY_SHARES" ? -f.normalizedAmountCents : f.normalizedAmountCents;
  return {
    id: `W_${f.id}`,
    source: "WINFUND",
    sourceFileName: "winfund-not-settled.xlsx",
    sourceRow: (f.sourceRow as number) + 40,
    sourceSheet: "Transactions",
    settlementDate: DATE,
    currency: "CAD",
    supplierCode: f.supplierCode,
    fundCode: f.fundCode,
    planId: f.planId,
    workOrderNumber: f.workOrderNumber,
    transactionType: f.transactionType,
    transactionStatus: "Matched",
    settlementStatus: "Not Settled",
    originalAmountCents: signed,
    normalizedAmountCents: Math.abs(signed),
    extractionConfidence: 0.95,
    ...over,
  };
}

function catRef(row: string): SourceRef {
  return { fileName: "category-summary.pdf", documentType: "FUNDSERV_CATEGORY_SUMMARY", page: 1, row, originalValue: "", extractionStatus: "extracted" };
}

function category(): FundservCategorySummary {
  return {
    buy: { amountCents: BUY_TOTAL, txCount: BUY_COUNT, source: catRef("Net Matched - Pay Only") },
    sell: { amountCents: SELL_TOTAL, txCount: SELL_COUNT, source: catRef("Net Matched - Rec Only") },
    parsed: true,
    warnings: [],
  };
}

export type FixtureScenario =
  | "all_matched"
  | "missing_buy"
  | "buy_amount_mismatch"
  | "duplicate_sell"
  | "wrong_date"
  | "wrong_status";

/** Build a deterministic ReconcileInput for a scenario. Buy row 0 is exactly $500. */
export function buildFixture(scenario: FixtureScenario): ReconcileInput {
  const fundservDetail: NormalizedTransaction[] = [];
  const winfund: NormalizedTransaction[] = [];
  let seq = 0;

  const buys = distribute(BUY_TOTAL, BUY_COUNT, 50000); // buys[0] = $500.00
  buys.forEach((amt) => {
    const f = fundservTx(seq, "BUY_SHARES", amt);
    fundservDetail.push(f);
    winfund.push(winfundTx(f));
    seq++;
  });
  const sells = distribute(SELL_TOTAL, SELL_COUNT);
  sells.forEach((amt) => {
    const f = fundservTx(seq, "SELL_SHARES", amt);
    fundservDetail.push(f);
    winfund.push(winfundTx(f));
    seq++;
  });

  const winBuy0 = () => winfund.find((w) => w.id === "W_F0")!;
  const firstSellFundserv = fundservDetail.find((t) => t.transactionType === "SELL_SHARES")!;

  switch (scenario) {
    case "missing_buy": {
      const idx = winfund.findIndex((w) => w.id === "W_F0"); // $500 buy
      winfund.splice(idx, 1);
      break;
    }
    case "buy_amount_mismatch": {
      const w = winBuy0(); // fundserv $500 -> winfund $450 (diff $50)
      w.originalAmountCents = -45000;
      w.normalizedAmountCents = 45000;
      break;
    }
    case "duplicate_sell": {
      const dup = winfundTx(firstSellFundserv, { id: "W_DUP_SELL" });
      winfund.push(dup);
      break;
    }
    case "wrong_date": {
      winfund.find((w) => w.id === "W_F1")!.settlementDate = "2026-07-16";
      break;
    }
    case "wrong_status": {
      winfund.find((w) => w.id === "W_F2")!.settlementStatus = "Settled";
      break;
    }
    case "all_matched":
    default:
      break;
  }

  return {
    category: category(),
    fundservDetail,
    winfund,
    detailAvailable: true,
    winfundAvailable: true,
    usdExcludedCount: 0,
    warnings: [],
  };
}

/**
 * Text fixture for the Category Summary parser — mirrors the REAL Fundserv
 * "SETTLEMENT SUMMARY BY CATEGORY" layout (columns Payable | Receivable | Net
 * Settlement | Pay Tx | Rec Tx | Total, with 0.00 in empty money cells and the
 * "-All" hyphen spacing). This is the exact shape the tool must parse.
 */
export const SAMPLE_CATEGORY_SUMMARY_TEXT = `
SETTLEMENT SUMMARY BY CATEGORY
Settlement Date: Fri, Jul 17 2026
Currency: Canadian Dollar
Category                 Payable      Receivable   Net Settlement   Pay Tx   Rec Tx   Total
Net Matched -All         470,893.05   96,699.92    -374,193.13      81       8        89
Net Matched - Pay Only   470,893.05   0.00         -470,893.05      81       0        81
Net Matched - Rec Only   0.00         96,699.92    96,699.92        0        8        8
Net Contract             0.00         1,717.82     1,717.82         0        2        2
Individual Matched       389,250.00   68,339.75    -320,910.25      18       11       29

American Dollar
Net Matched - Pay Only   12,000.00    0.00         -12,000.00       3        0        3
`;
