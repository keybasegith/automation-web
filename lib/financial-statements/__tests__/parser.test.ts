import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { detectFileType, parseTrialBalanceFile } from "../parsers/parseTrialBalance";
import { TrialBalanceParseError } from "../types";

/** Build a workbook in memory so column/header variants can be exercised. */
function workbook(rows: (string | number | null)[][], type: "xlsx" | "csv" = "xlsx"): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Sheet1");
  return XLSX.write(book, { type: "buffer", bookType: type });
}

describe("detectFileType", () => {
  it("trusts the file signature over the extension", () => {
    const xlsx = workbook([["Account", "Description", "Debit", "Credit"]]);
    expect(detectFileType(xlsx, "trial-balance.xls")).toBe("xlsx");
    // An OLE2 compound document is a legacy .xls whatever it is named.
    const ole2 = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0]), Buffer.alloc(64)]);
    expect(detectFileType(ole2, "mislabelled.xlsx")).toBe("xls");
  });

  it("accepts CSV by extension, since it has no signature", () => {
    expect(detectFileType(Buffer.from("Account,Debit,Credit\n"), "tb.csv")).toBe("csv");
  });

  it("refuses a PDF, which V1 does not support", () => {
    expect(detectFileType(Buffer.from("%PDF-1.4\n"), "statements.pdf")).toBeNull();
  });

  it("refuses anything it cannot identify rather than guessing", () => {
    expect(detectFileType(Buffer.from("not a spreadsheet"), "notes.txt")).toBeNull();
    expect(detectFileType(Buffer.alloc(0), "empty.xlsx")).toBeNull();
  });

  it("never interprets unidentifiable bytes as accounting data", () => {
    expect(() => parseTrialBalanceFile(Buffer.from([0x00, 0x01, 0x02]), "junk.dat"))
      .toThrow(TrialBalanceParseError);
  });
});

describe("header detection", () => {
  const withHeader = (header: string[]) =>
    parseTrialBalanceFile(
      workbook([
        ["Some Report Preamble"], [], ["Company", "[K]"], [],
        header,
        ["1000-K", "Cash", 100, null],
        ["3300-K", "Payables", null, 100],
      ]),
      "tb.xlsx"
    );

  it("finds the header below a variable-length preamble", () => {
    const parsed = withHeader(["Account", "Description", "Debit", "Credit"]);
    expect(parsed.headerRowNumber).toBe(5);
    expect(parsed.rows).toHaveLength(2);
  });

  it("accepts the header spellings these reports actually use", () => {
    for (const header of [
      ["Account", "Description", "Debit", "Credit"],
      ["Account Number", "Description", "Debits", "Credits"],
      ["Account No.", "Account Description", "Debit", "Credit"],
      ["GL Account", "Description", "Debits", "Credits"],
      ["Account Code", "Description", "Debit", "Credit"],
    ]) {
      expect(withHeader(header).rows).toHaveLength(2);
    }
  });

  it("refuses a sheet with no recognisable columns", () => {
    expect(() => parseTrialBalanceFile(workbook([["a", "b"], ["1000-K", 5]]), "tb.xlsx"))
      .toThrow(/couldn't find the Trial Balance columns/i);
  });

  it("refuses a sheet with a header but no rows", () => {
    expect(() => parseTrialBalanceFile(workbook([["Account", "Description", "Debit", "Credit"]]), "tb.xlsx"))
      .toThrow(/no Trial Balance rows/i);
  });
});

describe("row reading", () => {
  it("keeps the source debit and credit columns exactly as given", () => {
    const parsed = parseTrialBalanceFile(
      workbook([
        ["Account", "Description", "Debit", "Credit"],
        ["1000-K", "Cash", 1234.56, null],
        ["3300-K", "Payables", null, 999.99],
        ["1101-K", "Odd", 10, 4],
      ]),
      "tb.xlsx"
    );

    expect(parsed.rows[0]).toMatchObject({ debitCents: 123456n, creditCents: 0n, netCents: 123456n });
    expect(parsed.rows[1]).toMatchObject({ debitCents: 0n, creditCents: 99999n, netCents: -99999n });
    // Both columns populated is preserved rather than collapsed.
    expect(parsed.rows[2]).toMatchObject({ debitCents: 1000n, creditCents: 400n, netCents: 600n });
  });

  it("reads a CSV the same way as a workbook", () => {
    const csv = Buffer.from(
      "Trial Balance\n\nAccount,Description,Debit,Credit\n1000-K,Cash,\"1,234.56\",\n3300-K,Payables,,999.99\n"
    );
    const parsed = parseTrialBalanceFile(csv, "tb.csv");
    expect(parsed.fileType).toBe("csv");
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].debitCents).toBe(123456n);
    expect(parsed.totalDebitsCents).toBe(123456n);
    expect(parsed.totalCreditsCents).toBe(99999n);
  });

  it("flags an unreadable amount instead of dropping the row", () => {
    const parsed = parseTrialBalanceFile(
      workbook([
        ["Account", "Description", "Debit", "Credit"],
        ["1000-K", "Cash", 100, null],
        ["3300-K", "Payables", "not a number", null],
      ]),
      "tb.xlsx"
    );
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.malformedRows).toHaveLength(1);
    expect(parsed.malformedRows[0]).toMatchObject({ sourceRowNumber: 3, rawAccountCode: "3300-K" });
  });

  it("flags an amount that has no account number", () => {
    const parsed = parseTrialBalanceFile(
      workbook([
        ["Account", "Description", "Debit", "Credit"],
        ["1000-K", "Cash", 100, null],
        [null, "Orphaned amount", 55, null],
      ]),
      "tb.xlsx"
    );
    expect(parsed.malformedRows).toHaveLength(1);
    expect(parsed.malformedRows[0].reason).toMatch(/no account number/i);
  });

  it("ignores report furniture that carries no money", () => {
    const parsed = parseTrialBalanceFile(
      workbook([
        ["Account", "Description", "Debit", "Credit"],
        ["1000-K", "Cash", 100, null],
        ["163 accounts printed", null, null, null],
        ["Page 2", null, null, null],
      ]),
      "tb.xlsx"
    );
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.malformedRows).toHaveLength(0);
  });
});
