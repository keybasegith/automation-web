/**
 * Daily Settlement Check — domain types.
 *
 * A pure, local, file-based reconciliation tool. It compares Fundserv and
 * Winfund exports for Buy Shares and Sell of Shares (Canadian Dollar only) and
 * explains why the totals differ. Every value shown is derived from an uploaded
 * file — nothing is invented, defaulted, or fetched. Amounts are integer cents.
 */

export type SettlementFileType =
  | "FUNDSERV_CATEGORY_SUMMARY"
  | "FUNDSERV_DETAIL"
  | "WINFUND_UNSETTLED"
  | "UNKNOWN";

export type TransactionSource = "FUNDSERV" | "WINFUND";

export type TransactionType = "BUY_SHARES" | "SELL_SHARES";

export type SettlementSide = "BUY" | "SELL";

export type MismatchStatus =
  | "EXACT_MATCH"
  | "MISSING_IN_WINFUND"
  | "EXTRA_IN_WINFUND"
  | "AMOUNT_MISMATCH"
  | "WRONG_SETTLEMENT_DATE"
  | "WRONG_TRANSACTION_TYPE"
  | "DUPLICATE_IN_WINFUND"
  | "DUPLICATE_IN_FUNDSERV"
  | "WRONG_STATUS"
  | "LOW_EXTRACTION_CONFIDENCE"
  | "MANUAL_REVIEW";

export type ExtractionStatus = "extracted" | "unavailable";

/** Where a single extracted value came from — always preserved for traceability. */
export interface SourceRef {
  fileName: string;
  documentType: SettlementFileType;
  page?: number; // PDF page (1-based)
  sheet?: string; // Excel sheet name
  row?: number | string; // Excel row (1-based) or a report row label
  originalValue: string; // exactly as extracted, before normalization
  normalizedValue?: string;
  extractionStatus: ExtractionStatus;
}

/** A normalized transaction from either system. Raw values preserved. */
export interface NormalizedTransaction {
  id: string;
  source: TransactionSource;
  sourceFileName: string;
  sourcePage?: number;
  sourceRow?: number | string;
  sourceSheet?: string;

  settlementDate?: string;
  currency: "CAD";

  supplierCode?: string;
  fundCode?: string;
  planId?: string;
  workOrderNumber?: string;
  contractNumber?: string;

  transactionType: TransactionType;
  transactionStatus?: string;
  settlementStatus?: string;

  originalAmountCents: number; // signed, as extracted
  normalizedAmountCents: number; // absolute value used for comparison

  extractionConfidence: number; // 0..1
  rawData?: Record<string, unknown>;
}

/** One category line read from the Fundserv Settlement Summary by Category. */
export interface CategoryLine {
  amountCents: number | null;
  txCount: number | null;
  source: SourceRef;
}

/** Expected Buy/Sell figures read from the Fundserv Category Summary. */
export interface FundservCategorySummary {
  /** Buy = Net Matched - Pay Only (Payable + Pay Tx). */
  buy: CategoryLine;
  /** Sell = Net Matched - Rec Only (Receivable + Rec Tx). */
  sell: CategoryLine;
  /** Net Matched - All — secondary validation only. */
  netMatchedAll?: {
    payableCents: number | null;
    receivableCents: number | null;
    payTx: number | null;
    recTx: number | null;
    source: SourceRef;
  };
  parsed: boolean;
  warnings: string[];
}

export interface FieldComparison {
  field: string;
  fundservValue: string | null;
  winfundValue: string | null;
  equal: boolean;
}

/** One reconciliation row (a mismatch, or a matched pair). */
export interface MatchRow {
  id: string;
  status: MismatchStatus;
  side: SettlementSide;
  reason: string;
  fundservTransactionId: string | null;
  winfundTransactionIds: string[];
  matchedFields: string[];
  differentFields: string[];
  comparedFields: FieldComparison[];
  fundservAmountCents: number | null;
  winfundAmountCents: number | null;
  amountDifferenceCents: number | null;
  dateDifferenceDays: number | null;
}

/** Independent Buy or Sell comparison across the three sources. */
export interface SideComparison {
  side: SettlementSide;
  // Fundserv Category Summary (expected)
  summaryCount: number | null;
  summaryTotalCents: number | null;
  summarySource: SourceRef | null;
  // Fundserv transaction details
  detailCount: number;
  detailTotalCents: number;
  detailAvailable: boolean;
  // Winfund Not Settled
  winfundCount: number;
  winfundTotalCents: number;
  winfundAvailable: boolean;
  // Differences (Fundserv basis − Winfund)
  basis: "DETAIL" | "SUMMARY" | "NONE";
  amountDifferenceCents: number | null;
  countDifference: number | null;
  mismatchCount: number;
  matched: boolean;
}

export type OverallStatus =
  | "MATCHED"
  | "BUY_MISMATCH"
  | "SELL_MISMATCH"
  | "BUY_AND_SELL_MISMATCH"
  | "FILE_REVIEW_REQUIRED";

export interface AnalysisResult {
  overallStatus: OverallStatus;
  overallExplanation: string;
  settlementDate: string | null;
  buy: SideComparison;
  sell: SideComparison;
  matches: MatchRow[]; // mismatches + exact matches
  usdExcludedCount: number;
  warnings: string[];
  blockingErrors: string[];
}
