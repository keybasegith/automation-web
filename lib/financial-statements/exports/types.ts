/**
 * Shared contract for every export format.
 *
 * Both exporters take the same already-generated result and render it. Neither
 * aggregates, re-maps or re-totals anything, so an Excel figure, a PDF figure
 * and the figure on screen are the same number by construction.
 */

import type {
  FinancialException,
  GeneratedStatement,
  MappedEntry,
  ReconciliationReport,
} from "../types";

export type ExportScope =
  | "package"
  | "balance_sheet"
  | "income_statement"
  | "trial_balance"
  | "exceptions";

export type ExportFormat = "xlsx" | "pdf";

export interface ExportInput {
  entityName: string;
  periodLabel: string;
  sourceFileName: string;
  generatedAt: string;
  balanceSheet: GeneratedStatement;
  incomeStatement: GeneratedStatement;
  entries: readonly MappedEntry[];
  exceptions: readonly FinancialException[];
  reconciliation: ReconciliationReport;
}

export const SCOPE_LABELS: Record<ExportScope, string> = {
  package: "Financial Statements",
  balance_sheet: "Balance Sheet",
  income_statement: "Income Statement",
  trial_balance: "Trial Balance",
  exceptions: "Exceptions",
};

export const CONTENT_TYPES: Record<ExportFormat, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

/** "Keybase Balance Sheet - July-2026.pdf" */
export function exportFileName(
  periodLabel: string,
  scope: ExportScope,
  format: ExportFormat
): string {
  const period = periodLabel.replace(/[^0-9A-Za-z]+/g, "-").replace(/^-|-$/g, "");
  return `Keybase ${SCOPE_LABELS[scope]} - ${period}.${format}`;
}
