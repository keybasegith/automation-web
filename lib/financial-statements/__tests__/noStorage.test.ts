/**
 * The tool has to work where nothing can be written.
 *
 * A serverless function root is read-only, so the upload flow must produce
 * complete statements without depending on storage, and the pages that read
 * history must degrade instead of throwing.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { beforeAll, describe, expect, it } from "vitest";

// Point the store at a location that cannot be created. Set before the store
// module is first imported, since the location is resolved once.
process.env.FINANCIAL_STATEMENTS_DATA_DIR = "/dev/null/financial-statements-unwritable";

const ROWS: (string | number | null)[][] = [
  ["Report", null, "Trial Balance as of 2031-03-31"],
  [],
  ["Account Number", "Description", "Debits", "Credits"],
  ["1000-K", "Cash operating", 500000, null],
  ["3300-K", "Accounts Payable", null, 40000],
  ["4000-K", "Common Shares", null, 100000],
  ["4400-K", "Retained Earnings", null, 200000],
  ["4500-K", "Commission Revenue", null, 300000],
  ["5000-K", "Commission Expenses", 120000, null],
  ["8000-K", "Income Tax Provision", 20000, null],
];

function trialBalanceBytes(): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(ROWS);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Sheet1");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" });
}

describe("running without writable storage", () => {
  let localStore: typeof import("../store/localStore");
  let service: typeof import("../service");
  let store: typeof import("../repo").store;

  beforeAll(async () => {
    localStore = await import("../store/localStore");
    service = await import("../service");
    ({ store } = await import("../repo"));
  });

  it("reports that persistence is unavailable", () => {
    expect(localStore.isPersistenceAvailable()).toBe(false);
  });

  it("still serves the checked-in mapping table", async () => {
    const mappings = await store.listMappings();
    expect(mappings.length).toBeGreaterThan(100);
    expect(await store.mappingVersion()).toMatch(/^[0-9a-f]{12}$/);
  });

  it("degrades history reads to empty instead of throwing", async () => {
    await expect(store.listPackages()).resolves.toEqual([]);
    await expect(store.getPackage("anything")).resolves.toBeNull();
    await expect(store.getLatestVersion("anything")).resolves.toBeNull();
    await expect(store.listAudit("anything")).resolves.toEqual([]);
  });

  it("generates complete statements from an upload and says nothing was kept", async () => {
    const upload = await service.uploadTrialBalance(
      trialBalanceBytes(),
      "synthetic.xlsx",
      { id: "test", name: "Test", role: "finance_admin" }
    );

    expect(upload.persisted).toBe(false);
    expect(upload.statementPackage.id).toMatch(/^ephemeral-/);
    expect(upload.statementPackage.periodLabel).toBe("March 2031");

    // The statements are complete and correct regardless of storage.
    expect(upload.result.trialBalanceValidation.isBalanced).toBe(true);
    expect(upload.result.balanceSheet.totals.totalAssetsCents).toBe(50000000n);
    expect(upload.result.balanceSheet.totals.differenceCents).toBe(0n);
    expect(upload.result.incomeStatement.totals.netIncomeCents).toBe(16000000n);
    expect(upload.result.reconciliation.counts.unmapped).toBe(0);
    expect(upload.result.readiness.canFinalize).toBe(true);
  });

  it("renders both export formats without any stored package", async () => {
    const { parseTrialBalanceFile } = await import("../parsers/parseTrialBalance");
    const { generateStatements } = await import("../engine/generateStatements");
    const { buildStatementWorkbook } = await import("../exports/excelExporter");
    const { buildStatementPdf } = await import("../exports/pdfExporter");

    const parsed = parseTrialBalanceFile(trialBalanceBytes(), "synthetic.xlsx");
    const result = generateStatements({
      parsed, rules: await store.listMappings(), periodLabel: "March 2031",
    });
    const input = {
      entityName: result.balanceSheet.entityName,
      periodLabel: "March 2031",
      sourceFileName: "synthetic.xlsx",
      generatedAt: "2031-04-01T00:00:00.000Z",
      balanceSheet: result.balanceSheet,
      incomeStatement: result.incomeStatement,
      entries: result.entries,
      exceptions: result.exceptions,
      reconciliation: result.reconciliation,
    };

    const xlsx = await buildStatementWorkbook(input, "package");
    const pdf = await buildStatementPdf(input, "package");
    expect(xlsx.subarray(0, 2).toString()).toBe("PK");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
