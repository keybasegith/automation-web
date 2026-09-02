/**
 * End-to-end pipeline on a synthetic Trial Balance.
 *
 * The regression test that proves the engine against the reviewed July 2026
 * statements uses real client data and so is kept out of this repository. This
 * test exercises the same path — file bytes in, statements and both export
 * formats out — on invented figures, so the wiring stays covered here.
 */

import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { parseTrialBalanceFile } from "../parsers/parseTrialBalance";
import { generateStatements } from "../engine/generateStatements";
import { BALANCE_SHEET_MAPPINGS } from "../config/balanceSheetMappings";
import { INCOME_STATEMENT_MAPPINGS } from "../config/incomeStatementMappings";
import { buildStatementWorkbook } from "../exports/excelExporter";
import { buildStatementPdf } from "../exports/pdfExporter";
import type { ExportInput } from "../exports/types";
import { centsToNumber } from "../money";

const RULES = [...BALANCE_SHEET_MAPPINGS, ...INCOME_STATEMENT_MAPPINGS];

/** Invented figures, on real chart-of-accounts numbers so they map. */
const ROWS: (string | number | null)[][] = [
  ["Report  (GLTRLR1)", null, "Trial Balance as of 2031-03-31"],
  [],
  ["Account Number", "Description", "Debits", "Credits"],
  ["1000-K", "Cash operating", 500000, null],
  ["1200-K", "Prepaid Expenses", 10000, null],
  ["3300-K", "Accounts Payable", null, 40000],
  ["4000-K", "Common Shares", null, 100000],
  ["4400-K", "Retained Earnings", null, 210000],
  ["4500-K", "Commission Revenue", null, 300000],
  ["5000-K", "Commission Expenses", 120000, null],
  ["8000-K", "Income Tax Provision", 20000, null],
];

function build() {
  const sheet = XLSX.utils.aoa_to_sheet(ROWS);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Sheet1");
  const bytes: Buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" });

  const parsed = parseTrialBalanceFile(bytes, "synthetic-trial-balance.xlsx");
  const result = generateStatements({ parsed, rules: RULES, periodLabel: "March 2031" });
  return { parsed, result };
}

const exportInput = (result: ReturnType<typeof build>["result"]): ExportInput => ({
  entityName: result.balanceSheet.entityName,
  periodLabel: "March 2031",
  sourceFileName: "synthetic-trial-balance.xlsx",
  generatedAt: "2031-04-01T00:00:00.000Z",
  balanceSheet: result.balanceSheet,
  incomeStatement: result.incomeStatement,
  entries: result.entries,
  exceptions: result.exceptions,
  reconciliation: result.reconciliation,
});

const lineOf = (nodes: readonly { kind: string; label: string; amountCents: bigint | null }[], label: string) =>
  nodes.find((n) => n.kind === "line" && n.label === label)?.amountCents ?? null;

describe("full pipeline on a synthetic Trial Balance", () => {
  const { parsed, result } = build();

  it("parses the workbook without being told where anything is", () => {
    expect(parsed.fileType).toBe("xlsx");
    expect(parsed.headerRowNumber).toBe(3);
    expect(parsed.rows).toHaveLength(8);
    expect(parsed.malformedRows).toEqual([]);
    expect(parsed.detectedPeriodLabel).toBe("2031-03-31");
  });

  it("balances the Trial Balance", () => {
    expect(parsed.totalDebitsCents).toBe(65000000n);
    expect(parsed.totalCreditsCents).toBe(65000000n);
    expect(result.trialBalanceValidation.isBalanced).toBe(true);
  });

  it("maps every account through the checked-in mapping table", () => {
    expect(result.reconciliation.counts.unmapped).toBe(0);
    expect(result.reconciliation.counts.ambiguous).toBe(0);
    expect(result.reconciliation.isComplete).toBe(true);
  });

  it("builds the Income Statement", () => {
    const t = result.incomeStatement.totals;
    expect(t.commissionIncomeCents).toBe(30000000n);
    expect(t.commissionExpenseCents).toBe(12000000n);
    expect(t.netCommissionIncomeCents).toBe(18000000n);
    expect(t.grossOperatingProfitCents).toBe(18000000n);
    expect(t.incomeTaxProvisionCents).toBe(2000000n);
    expect(t.netIncomeCents).toBe(16000000n);
  });

  it("builds a Balance Sheet that balances", () => {
    const t = result.balanceSheet.totals;
    expect(lineOf(result.balanceSheet.nodes, "Cash")).toBe(50000000n);
    expect(lineOf(result.balanceSheet.nodes, "Prepaid Expenses")).toBe(1000000n);
    expect(t.currentAssetsCents).toBe(51000000n);
    expect(t.totalAssetsCents).toBe(51000000n);
    expect(t.currentLiabilitiesCents).toBe(4000000n);
    expect(t.commonSharesCents).toBe(10000000n);
    expect(t.retainedEarningsBeginningCents).toBe(21000000n);
    expect(t.retainedEarningsTotalCents).toBe(37000000n);
    expect(t.totalLiabilitiesAndEquityCents).toBe(51000000n);
    expect(t.differenceCents).toBe(0n);
  });

  it("carries one net income into both statements", () => {
    expect(result.balanceSheet.totals.currentPeriodEarningsCents).toBe(
      result.incomeStatement.totals.netIncomeCents
    );
    expect(result.incomeStatementValidation.reconciles).toBe(true);
  });

  it("traces every line and is ready to finalize", () => {
    expect(result.traceabilityFailures).toEqual([]);
    expect(result.readiness.canFinalize).toBe(true);
    expect(result.status).toBe("ready");
  });

  it("writes an Excel workbook holding exactly the model's figures", async () => {
    const bytes = await buildStatementWorkbook(exportInput(result), "package");
    const workbook = new ExcelJS.Workbook();
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    await workbook.xlsx.load(ab as ArrayBuffer);

    expect(workbook.worksheets.map((w) => w.name)).toEqual([
      "Balance Sheet", "Income Statement", "Trial Balance", "Exceptions",
    ]);

    for (const [name, statement] of [
      ["Balance Sheet", result.balanceSheet],
      ["Income Statement", result.incomeStatement],
    ] as const) {
      const written: number[] = [];
      workbook.getWorksheet(name)!.eachRow((row) => {
        const value = row.getCell(2).value;
        if (typeof value === "number") written.push(value);
      });
      expect(written).toEqual(
        statement.nodes
          .filter((n) => n.kind !== "spacer" && n.amountCents !== null)
          .map((n) => centsToNumber(n.amountCents!))
      );
    }
  });

  it("writes a PDF holding exactly the model's figures", async () => {
    const bytes = await buildStatementPdf(exportInput(result), "package");
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
    let text = "";
    for (let page = 1; page <= doc.numPages; page++) {
      const content = await (await doc.getPage(page)).getTextContent();
      text += content.items.map((i) => ("str" in i ? i.str : "")).join(" ") + " ";
    }

    for (const statement of [result.balanceSheet, result.incomeStatement]) {
      for (const node of statement.nodes) {
        if (node.amountCents === null || node.kind === "spacer") continue;
        const rendered = new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 2, maximumFractionDigits: 2,
        }).format(Math.abs(centsToNumber(node.amountCents)));
        expect(text, `"${node.label}" should appear`).toContain(rendered);
      }
    }
  });
});
