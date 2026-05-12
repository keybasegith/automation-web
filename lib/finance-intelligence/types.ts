export interface SageTransaction {
  accountNumber: string;
  accountNumberRaw: string;
  accountName: string;
  fiscalYear?: number;
  fiscalPeriod?: string;
  source?: string;
  docDate?: string;
  description?: string;
  reference?: string;
  postingSeq?: string;
  batchEntry?: string;
  debit?: number;
  credit?: number;
  netChange?: number;
  balance?: number;
  rawRowIndex: number;
}

export interface SageAccount {
  accountNumber: string;
  accountNumberRaw: string;
  accountName: string;
  fiscalYear?: number;
  transactions: SageTransaction[];
  openingBalance?: number;
  endingBalance?: number;
  totalDebits?: number;
  totalCredits?: number;
  netChange?: number;
}

export interface ParsedSageExport {
  accounts: SageAccount[];
  parsedAt: string;
  filename: string;
  detectedFiscalYears: number[];
}

export interface AccountSummary {
  accountNumber: string;
  accountNumberRaw: string;
  accountName: string;
  fiscalYear?: number;
  transactionCount: number;
  openingBalance?: number;
  endingBalance?: number;
  /** ISO YYYY-MM-DD of the latest detected transaction for this account. */
  latestTransactionDate?: string;
}

export interface MonthlyAnalysisLine {
  dateLabel: string;
  description: string;
  amount: number;
  sourceRowIndex?: number;
}

export type ValidationStatus =
  | "matched"
  | "review_required"
  | "missing_sage_ending_balance";

export interface MonthlyAnalysisResult {
  accountNumber: string;
  accountNumberRaw: string;
  accountName: string;
  asAtDate: string;
  fiscalYear: number;
  fiscalPeriod: string;
  openingBalance: number;
  lines: MonthlyAnalysisLine[];
  generatedEndingBalance: number;
  sageEndingBalance?: number;
  difference?: number;
  validationStatus: ValidationStatus;
  warnings: string[];
}

export interface PreviewRow {
  rowIndex: number;
  date?: string;
  source?: string;
  description?: string;
  reference?: string;
  batchEntry?: string;
  debit?: number;
  credit?: number;
  netChange?: number;
  balance?: number;
}

export interface AccountPreview {
  account: AccountSummary;
  rows: PreviewRow[];
  warnings: string[];
  generatedEndingBalance: number;
  sageEndingBalance?: number;
  difference?: number;
  validationStatus: ValidationStatus;
}
