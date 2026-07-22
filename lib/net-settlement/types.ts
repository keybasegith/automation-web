/**
 * Shared domain types for Net Settlement Automation.
 *
 * The feature compares Fundserv N$M settlement data against Winfund trust
 * transaction data, matches transactions, flags exceptions, and drives an
 * operational review/approval workflow that produces settlement + reconciliation
 * reports for Accounting.
 */

import type { Currency } from "./money";

export type { Currency };

export type Dealer = string; // "9744", "3744", or future configurable codes

export type SettlementCycle =
  | "T+1"
  | "T+2"
  | "Advance"
  | "Commission"
  | "CashDistribution";

export type FundservCategory =
  | "TotalSettlement"
  | "NetMatchedAll"
  | "NetMatchedRecOnly"
  | "NetContract"
  | "IndividualMatch"
  | "Participant"
  | "Category"
  | "OrderContract"
  | "Commission"
  | "CashDistribution";

/** Source classification for an ingested file / dataset. */
export type SourceType =
  | "fundserv"
  | "winfund"
  | "supporting"
  | "commission"
  | "cash_distribution"
  | "manual_evidence"
  | "other";

/** Settlement details detected from the files (correctable by the user). */
export interface DetectedDetails {
  settlementDate: string | null;
  dealer: string | null;
  currency: string | null;
  cycle: string | null;
  category: string | null;
}

/** A single ingested/normalized Fundserv record. Raw values are preserved. */
export interface FundservRecord {
  id: string;
  sourceFileId: string | null;
  sourceRowNumber: number | null;
  dealerCode: string | null;
  settlementDate: string | null;
  currency: string | null;
  cycle: string | null;
  category: string | null;
  reportType: string | null;
  activityType: string | null;
  code: string | null;
  source: string | null;
  tradeDate: string | null;
  fundId: string | null;
  dealerAccountId: string | null;
  orderId: string | null;
  sourceIdentifier: string | null;
  transactionType: string | null;
  /** Amount in integer cents (decimal-safe). */
  settlementAmountCents: number | null;
  participant: string | null;
  contractNumber: string | null;
  rawReference: string | null;
  raw: Record<string, unknown>;
}

/** A single ingested/normalized Winfund trust record. Raw values preserved. */
export interface WinfundRecord {
  id: string;
  sourceFileId: string | null;
  sourceRowNumber: number | null;
  trustSettledDate: string | null;
  clientName: string | null;
  settledUserId: string | null;
  wireOrderNumber: string | null;
  supplier: string | null;
  fundNumber: string | null;
  planId: string | null;
  planType: string | null;
  trustTransactionDate: string | null;
  transactionType: string | null;
  repCode: string | null;
  /** Amount in integer cents (decimal-safe). */
  amountCents: number | null;
  transactionStatus: string | null;
  settlementStatus: string | null;
  userId: string | null;
  bankCode: string | null;
  dealerCode: string | null;
  currency: string | null;
  sourceReference: string | null;
  raw: Record<string, unknown>;
}

export type MatchStatus =
  | "EXACT_MATCH"
  | "REFERENCE_MATCH"
  | "COMPOSITE_MATCH"
  | "AGGREGATE_MATCH"
  | "PROBABLE_MATCH"
  | "UNMATCHED_FUNDSERV"
  | "UNMATCHED_WINFUND"
  | "AMOUNT_MISMATCH"
  | "DATE_MISMATCH"
  | "FUND_MISMATCH"
  | "ACCOUNT_MISMATCH"
  | "TRANSACTION_TYPE_MISMATCH"
  | "CURRENCY_MISMATCH"
  | "DEALER_MISMATCH"
  | "BANK_CODE_MISSING"
  | "DUPLICATE"
  | "ALREADY_SETTLED"
  | "MANUAL_ENTRY_REQUIRED"
  | "REVIEW_REQUIRED"
  | "READY_FOR_SETTLEMENT";

export type MatchConfidence = "high" | "medium" | "low";

export interface MatchResult {
  id: string;
  status: MatchStatus;
  confidence: MatchConfidence;
  ruleUsed: string;
  explanation: string;
  fundservIds: string[];
  winfundIds: string[];
  matchedFields: string[];
  mismatchedFields: string[];
  /** Fundserv total − Winfund total, in cents. */
  amountDifferenceCents: number;
  /** Absolute difference in days between the compared dates. */
  dateDifferenceDays: number | null;
}

export interface MatchingRules {
  /** Fields that, if equal, produce a direct reference match (stage 1). */
  referenceFields: string[];
  /** Amount tolerance in cents. Default 0 — exact equality required. */
  amountToleranceCents: number;
  /** Allowed date tolerance in business days for stage 3. */
  dateToleranceDays: 0 | 1 | 2;
  enableAggregate: boolean;
  enableProbable: boolean;
  /** When true, a Winfund record with no bank code becomes BANK_CODE_MISSING. */
  requireBankCode: boolean;
}

export const DEFAULT_MATCHING_RULES: MatchingRules = {
  referenceFields: [
    "orderId",
    "wireOrderNumber",
    "sourceIdentifier",
    "sourceReference",
    "contractNumber",
  ],
  amountToleranceCents: 0,
  dateToleranceDays: 0,
  enableAggregate: true,
  enableProbable: true,
  requireBankCode: true,
};

export type ExceptionSeverity = "critical" | "high" | "medium" | "low";
