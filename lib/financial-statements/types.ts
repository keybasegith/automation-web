/**
 * Domain types for the Financial Statement Generator.
 *
 * The whole feature is deterministic: the same Trial Balance and the same
 * mapping table always produce the same statements, the same validations and
 * the same exceptions. Nothing here is probabilistic, and no value on a
 * statement originates anywhere but the uploaded Trial Balance.
 */

import type { NormalizedAccount } from "./accounts/normalizeAccount";

export type StatementKind = "balance_sheet" | "income_statement";

/** Which side of the ledger a line naturally sits on, for presentation sign. */
export type NaturalBalance = "debit" | "credit";

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

/**
 * The four ways a rule may claim an account. There is deliberately no wildcard
 * and no regular expression: a finance user never types matching syntax, and
 * the engine never interprets one.
 */
export type MatchType =
  /** The whole account, including sub-account: "3100-K-I". */
  | "EXACT_FULL_CODE"
  /** One base GL code: "1000" claims 1000-K, 1000-K-I, ... */
  | "BASE_GL_CODE"
  /** An explicit list of base GL codes: ["1000", "1001", "1008"]. */
  | "GL_CODE_SET"
  /** An inclusive numeric span of base GL codes: 5420 through 5559. */
  | "NUMERIC_RANGE";

export type MappingStatusFlag = "active" | "inactive";

/**
 * A rule is either presentational (it places accounts on a statement line) or
 * an explicit exclusion (the accounts are known and deliberately kept off both
 * statements). An exclusion still appears in the reconciliation, so the money
 * is visible rather than silently gone.
 */
export interface MappingRule {
  id: string;
  statement: StatementKind;
  matchType: MatchType;

  /** EXACT_FULL_CODE */
  fullCode?: string;
  /** BASE_GL_CODE */
  baseCode?: string;
  /** GL_CODE_SET */
  accounts?: readonly string[];
  /** NUMERIC_RANGE (inclusive both ends) */
  from?: number;
  to?: number;

  /** Group1 in the legacy master, e.g. "Assets". */
  category: string;
  /** Group2 in the legacy master, e.g. "Current assets". */
  section: string;
  /** Group3 in the legacy master — the statement line this feeds. */
  statementLine: string;

  status: MappingStatusFlag;

  /** True when the accounts are deliberately kept off the statements. */
  excluded: boolean;
  exclusionReason?: string;

  /**
   * Control-only rules never claim an account during resolution. The single
   * use is the legacy "all P&L accounts" span, which exists to cross-check the
   * Income Statement's net income against the Balance Sheet.
   */
  role?: "current_period_earnings";

  source: "legacy_master" | "user";
  notes?: string;
}

export type MappingOutcome = "mapped" | "excluded" | "unmapped" | "ambiguous";

/** One Trial Balance row after the mapping table has been applied to it. */
export interface MappedEntry {
  row: TrialBalanceRow;
  outcome: MappingOutcome;
  /** The winning rule; null when unmapped or ambiguous. */
  rule: MappingRule | null;
  /** Every rule that claimed the account — populated when reporting ambiguity. */
  candidates: readonly MappingRule[];
}

// ---------------------------------------------------------------------------
// Trial Balance
// ---------------------------------------------------------------------------

export interface TrialBalanceRow {
  /** 1-based row in the source sheet, so an exception can point at it. */
  sourceRowNumber: number;
  account: NormalizedAccount;
  description: string;
  debitCents: bigint;
  creditCents: bigint;
  /** debitCents - creditCents. The single signed convention in the app. */
  netCents: bigint;
}

/** A row that looked like data but could not be read with certainty. */
export interface MalformedRow {
  sourceRowNumber: number;
  rawAccountCode: string;
  rawDescription: string;
  rawDebit: string;
  rawCredit: string;
  reason: string;
}

export type TrialBalanceFileType = "xlsx" | "xls" | "csv";

export interface ColumnMap {
  account: number;
  description: number;
  debit: number;
  credit: number;
}

export interface ParsedTrialBalance {
  fileType: TrialBalanceFileType;
  sheetName: string;
  headerRowNumber: number;
  columnMap: ColumnMap;
  rows: TrialBalanceRow[];
  malformedRows: MalformedRow[];
  totalDebitsCents: bigint;
  totalCreditsCents: bigint;
  /** The "Total:" line the report printed, when one was found. */
  reportedTotalDebitsCents: bigint | null;
  reportedTotalCreditsCents: bigint | null;
  /**
   * The "Net Income (Loss) for Accounts Listed" figure the source report prints
   * for itself, credit-positive. An independent control on our own arithmetic.
   */
  reportedNetIncomeCents: bigint | null;
  /** Free-text period detected in the report header, e.g. "2026-07-31". */
  detectedPeriodLabel: string | null;
}

export class TrialBalanceParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrialBalanceParseError";
  }
}

// ---------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------

/** One GL row behind a statement line, for the traceability drill-down. */
export interface StatementSourceRow {
  accountCode: string;
  description: string;
  /** Raw signed balance, debit-positive. */
  netCents: bigint;
  /** Contribution as presented on the statement (sign applied). */
  presentedCents: bigint;
}

export type StatementNodeKind = "heading" | "line" | "subtotal" | "total" | "spacer";
export type StatementEmphasis = "none" | "bold" | "underline" | "double-underline";

export interface StatementNode {
  id: string;
  kind: StatementNodeKind;
  label: string;
  indent: number;
  /** null for headings and spacers. */
  amountCents: bigint | null;
  emphasis: StatementEmphasis;
  /** Present on "line" nodes — every Trial Balance row behind the number. */
  sourceRows?: StatementSourceRow[];
  /** Present on subtotal/total nodes — the node ids that were summed. */
  componentIds?: string[];
  /**
   * True when the value does not come from aggregating Trial Balance rows.
   * The only derived line is current-period earnings on the Balance Sheet,
   * which takes the Income Statement's net income verbatim.
   */
  derived?: boolean;
}

export interface GeneratedStatement {
  kind: StatementKind;
  entityName: string;
  title: string;
  periodLabel: string;
  nodes: StatementNode[];
}

export interface GeneratedIncomeStatement extends GeneratedStatement {
  kind: "income_statement";
  totals: {
    commissionIncomeCents: bigint;
    commissionExpenseCents: bigint;
    netCommissionIncomeCents: bigint;
    feesAndOtherIncomeCents: bigint;
    grossOperatingProfitCents: bigint;
    operatingExpenseCents: bigint;
    netProfitBeforeTaxCents: bigint;
    incomeTaxProvisionCents: bigint;
    netIncomeCents: bigint;
  };
}

export interface GeneratedBalanceSheet extends GeneratedStatement {
  kind: "balance_sheet";
  totals: {
    currentAssetsCents: bigint;
    totalAssetsCents: bigint;
    currentLiabilitiesCents: bigint;
    longTermLiabilitiesCents: bigint;
    totalLiabilitiesCents: bigint;
    commonSharesCents: bigint;
    retainedEarningsBeginningCents: bigint;
    currentPeriodEarningsCents: bigint;
    retainedEarningsTotalCents: bigint;
    totalShareholdersEquityCents: bigint;
    totalLiabilitiesAndEquityCents: bigint;
    differenceCents: bigint;
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ExceptionCode =
  | "unmapped_account"
  | "ambiguous_mapping"
  | "trial_balance_out_of_balance"
  | "balance_sheet_out_of_balance"
  | "duplicate_account"
  | "duplicate_mapping"
  | "invalid_amount"
  | "invalid_account"
  | "line_traceability_error"
  | "net_income_reconciliation_error"
  | "excluded_account_has_balance"
  | "reconciliation_incomplete"
  | "unexpected_debit_balance"
  | "unexpected_credit_balance";

export type ExceptionSeverity = "blocking" | "warning" | "info";
export type ExceptionStatus = "open" | "resolved" | "accepted";

export interface FinancialException {
  id: string;
  code: ExceptionCode;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  title: string;
  detail: string;
  /** Accounts involved, when the exception is about specific rows. */
  accountCodes: string[];
  amountCents: bigint | null;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export interface TrialBalanceValidation {
  totalDebitsCents: bigint;
  totalCreditsCents: bigint;
  differenceCents: bigint;
  isBalanced: boolean;
  rowCount: number;
  malformedRowCount: number;
}

export interface BalanceSheetValidation {
  totalAssetsCents: bigint;
  totalLiabilitiesAndEquityCents: bigint;
  differenceCents: bigint;
  isBalanced: boolean;
}

export interface IncomeStatementValidation {
  netIncomeCents: bigint;
  /** Net income re-derived from the legacy P&L span, as an independent check. */
  crossCheckCents: bigint;
  reconciles: boolean;
}

export interface TraceabilityFailure {
  nodeId: string;
  label: string;
  amountCents: bigint;
  sourceSumCents: bigint;
}

/** Where every dollar of the Trial Balance ended up. */
export interface ReconciliationReport {
  rowCount: number;
  balanceSheetCents: bigint;
  incomeStatementCents: bigint;
  excludedCents: bigint;
  unmappedCents: bigint;
  ambiguousCents: bigint;
  /** Sum of the buckets; must equal the Trial Balance net (always zero). */
  accountedCents: bigint;
  trialBalanceNetCents: bigint;
  isComplete: boolean;
  counts: Record<MappingOutcome, number>;
}

export interface FinalizationReadiness {
  trialBalanceBalanced: boolean;
  allAccountsMapped: boolean;
  noAmbiguousMappings: boolean;
  balanceSheetBalanced: boolean;
  netIncomeReconciles: boolean;
  traceabilityPasses: boolean;
  reconciliationComplete: boolean;
  noBlockingExceptions: boolean;
  canFinalize: boolean;
}

export type StatementStatus = "requires_review" | "ready" | "finalized";

// ---------------------------------------------------------------------------
// Packages, versions, audit
// ---------------------------------------------------------------------------

export interface StatementPackage {
  id: string;
  entityName: string;
  periodLabel: string;
  fiscalYear: number;
  sourceFileName: string;
  sourceFileType: TrialBalanceFileType;
  sourceFileSizeBytes: number;
  status: StatementStatus;
  currentVersion: number;
  mappingVersion: string;
  createdAt: string;
  updatedAt: string;
  finalizedAt: string | null;
  finalizedBy: string | null;
}

export type AuditEventType =
  | "trial_balance_uploaded"
  | "parsing_completed"
  | "statements_generated"
  | "statements_regenerated"
  | "mapping_changed"
  | "mapping_imported"
  | "exception_resolved"
  | "package_finalized"
  | "package_reopened"
  | "statements_exported"
  /** Retained so audit trails written before PDF export still read. */
  | "excel_exported";

export interface AuditEvent {
  id: string;
  packageId: string | null;
  type: AuditEventType;
  actor: string;
  at: string;
  summary: string;
  detail?: Record<string, string | number | boolean | null>;
}
