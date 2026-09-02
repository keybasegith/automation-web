/**
 * Excel export.
 *
 * The workbook is a rendering of an already-generated statement result. It does
 * not aggregate, re-map or re-total anything: every number written here is read
 * straight off the same object the workspace displays, so an exported figure
 * cannot disagree with the reviewed one.
 *
 * Cents become a spreadsheet number at exactly one point — `centsToNumber` —
 * and are written as real numbers with an accounting format, not as text.
 */

import ExcelJS from "exceljs";

import type { GeneratedStatement, StatementNode } from "../types";
import { centsToNumber, formatCents } from "../money";
import type { ExportInput, ExportScope } from "./types";

/** Accounting presentation: negatives in parentheses, always two decimals. */
const MONEY_FORMAT = '$#,##0.00;($#,##0.00)';
const PLAIN_MONEY_FORMAT = '#,##0.00;(#,##0.00)';

/** Kept as an alias so existing callers and tests read unchanged. */
export type WorkbookInput = ExportInput;

function writeStatementSheet(sheet: ExcelJS.Worksheet, statement: GeneratedStatement) {
  sheet.columns = [{ width: 52 }, { width: 20 }];

  const title = sheet.addRow([statement.entityName]);
  title.font = { bold: true, size: 14 };
  const subtitle = sheet.addRow([statement.title]);
  subtitle.font = { bold: true, size: 12 };
  const period = sheet.addRow([statement.periodLabel]);
  period.font = { bold: true, size: 11 };
  sheet.addRow([]);

  for (const node of statement.nodes) {
    if (node.kind === "spacer") {
      sheet.addRow([]);
      continue;
    }

    const indent = "    ".repeat(node.indent);
    const row = sheet.addRow([
      `${indent}${node.label}`,
      node.amountCents === null ? null : centsToNumber(node.amountCents),
    ]);

    const amountCell = row.getCell(2);
    amountCell.numFmt = MONEY_FORMAT;
    amountCell.alignment = { horizontal: "right" };

    if (node.kind === "heading") row.font = { bold: true };
    if (node.kind === "subtotal") row.font = { bold: node.emphasis !== "none" };
    if (node.kind === "total") row.font = { bold: true };

    if (node.emphasis === "underline") {
      amountCell.border = { top: { style: "thin" } };
    } else if (node.emphasis === "double-underline") {
      amountCell.border = { top: { style: "thin" }, bottom: { style: "double" } };
    }
  }

  sheet.getColumn(1).alignment = { vertical: "middle" };
}

function writeTrialBalanceSheet(sheet: ExcelJS.Worksheet, input: WorkbookInput) {
  sheet.columns = [
    { header: "Account", width: 18 },
    { header: "Description", width: 42 },
    { header: "Debit", width: 16 },
    { header: "Credit", width: 16 },
    { header: "Net (debit positive)", width: 20 },
    { header: "Status", width: 12 },
    { header: "Statement", width: 18 },
    { header: "Statement Line", width: 34 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const entry of input.entries) {
    const row = sheet.addRow([
      entry.row.account.normalizedFullCode,
      entry.row.description,
      centsToNumber(entry.row.debitCents),
      centsToNumber(entry.row.creditCents),
      centsToNumber(entry.row.netCents),
      entry.outcome,
      entry.rule ? (entry.rule.statement === "balance_sheet" ? "Balance Sheet" : "Income Statement") : "",
      entry.rule?.excluded ? "(excluded)" : (entry.rule?.statementLine ?? ""),
    ]);
    for (const col of [3, 4, 5]) row.getCell(col).numFmt = PLAIN_MONEY_FORMAT;
    if (entry.outcome === "unmapped" || entry.outcome === "ambiguous") {
      row.getCell(6).font = { bold: true, color: { argb: "FFB00020" } };
    }
  }

  sheet.addRow([]);
  const totals = sheet.addRow([
    "Total",
    "",
    centsToNumber(input.entries.reduce((a, e) => a + e.row.debitCents, 0n)),
    centsToNumber(input.entries.reduce((a, e) => a + e.row.creditCents, 0n)),
    centsToNumber(input.entries.reduce((a, e) => a + e.row.netCents, 0n)),
  ]);
  totals.font = { bold: true };
  for (const col of [3, 4, 5]) {
    totals.getCell(col).numFmt = PLAIN_MONEY_FORMAT;
    totals.getCell(col).border = { top: { style: "thin" }, bottom: { style: "double" } };
  }
}

function writeExceptionsSheet(sheet: ExcelJS.Worksheet, input: WorkbookInput) {
  sheet.columns = [
    { header: "Severity", width: 12 },
    { header: "Code", width: 30 },
    { header: "Status", width: 11 },
    { header: "Title", width: 52 },
    { header: "Accounts", width: 26 },
    { header: "Amount", width: 16 },
    { header: "Detail", width: 90 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const order = { blocking: 0, warning: 1, info: 2 } as const;
  const sorted = [...input.exceptions].sort((a, b) => order[a.severity] - order[b.severity]);

  for (const exception of sorted) {
    const row = sheet.addRow([
      exception.severity,
      exception.code,
      exception.status,
      exception.title,
      exception.accountCodes.join(", "),
      exception.amountCents === null ? null : centsToNumber(exception.amountCents),
      exception.detail,
    ]);
    row.getCell(6).numFmt = PLAIN_MONEY_FORMAT;
    if (exception.severity === "blocking") {
      row.getCell(1).font = { bold: true, color: { argb: "FFB00020" } };
    }
  }

  // Reconciliation: where every dollar of the Trial Balance ended up.
  sheet.addRow([]);
  const heading = sheet.addRow(["Reconciliation"]);
  heading.font = { bold: true, size: 12 };
  const r = input.reconciliation;
  const rows: [string, bigint | number][] = [
    ["Trial Balance rows", r.rowCount],
    ["Mapped to Balance Sheet", r.balanceSheetCents],
    ["Mapped to Income Statement", r.incomeStatementCents],
    ["Approved exclusions", r.excludedCents],
    ["Unmapped", r.unmappedCents],
    ["Ambiguous", r.ambiguousCents],
    ["Accounted for (net)", r.accountedCents],
    ["Trial Balance net", r.trialBalanceNetCents],
  ];
  for (const [label, value] of rows) {
    const row = sheet.addRow([label, "", "", "", "", typeof value === "bigint" ? centsToNumber(value) : value]);
    row.getCell(1).font = { bold: true };
    if (typeof value === "bigint") row.getCell(6).numFmt = PLAIN_MONEY_FORMAT;
  }
}

export async function buildStatementWorkbook(
  input: WorkbookInput,
  scope: ExportScope = "package"
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Keybase Financial Statement Generator";
  workbook.created = new Date(input.generatedAt);

  const include = (which: ExportScope) => scope === "package" || scope === which;

  if (include("balance_sheet")) {
    writeStatementSheet(workbook.addWorksheet("Balance Sheet"), input.balanceSheet);
  }
  if (include("income_statement")) {
    writeStatementSheet(workbook.addWorksheet("Income Statement"), input.incomeStatement);
  }
  if (include("trial_balance")) {
    writeTrialBalanceSheet(workbook.addWorksheet("Trial Balance"), input);
  }
  if (include("exceptions")) {
    writeExceptionsSheet(workbook.addWorksheet("Exceptions"), input);
  }

  if (workbook.worksheets.length === 0) {
    throw new Error(`Nothing to export for scope "${scope}".`);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}


/** Used by the workspace to show the same figure the export will contain. */
export const displayCents = (cents: bigint): string =>
  formatCents(cents, { parentheses: true });

/** Every node the export will render, for a pre-export equality check. */
export function exportableNodes(statement: GeneratedStatement): StatementNode[] {
  return statement.nodes.filter((n) => n.kind !== "spacer");
}
