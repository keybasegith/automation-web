/**
 * Trial Balance intake.
 *
 * The file type is decided by its signature first and its extension second — a
 * workbook saved with the wrong extension is still a workbook, and a file that
 * is not a workbook at all must never be coerced into looking like accounting
 * data. The header row is found by inspection rather than assumed to be at a
 * fixed offset, because the Sage export carries a variable-length report
 * preamble above it.
 *
 * Debit and credit are read from the columns the source provides and kept
 * exactly as found. Nothing here decides which side an amount belongs on.
 */

import * as XLSX from "xlsx";

import {
  TrialBalanceParseError,
  type ColumnMap,
  type MalformedRow,
  type ParsedTrialBalance,
  type TrialBalanceFileType,
  type TrialBalanceRow,
} from "../types";
import { normalizeAccountCode } from "../accounts/normalizeAccount";
import { parseMoneyToCents } from "../money";

const startsWith = (buffer: Buffer, bytes: number[]) =>
  bytes.every((b, i) => buffer[i] === b);

/** OLE2 compound document — legacy .xls. */
const isOle2 = (b: Buffer) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0]);
/** ZIP container — .xlsx / .xlsm. */
const isZip = (b: Buffer) => startsWith(b, [0x50, 0x4b]);
const isPdf = (b: Buffer) => startsWith(b, [0x25, 0x50, 0x44, 0x46]);

const EXTENSION_TYPES: Record<string, TrialBalanceFileType> = {
  xlsx: "xlsx",
  xlsm: "xlsx",
  xls: "xls",
  csv: "csv",
};

export function detectFileType(buffer: Buffer, fileName: string): TrialBalanceFileType | null {
  if (buffer.length === 0) return null;
  if (isPdf(buffer)) return null; // deliberately unsupported in V1
  if (isOle2(buffer)) return "xls";
  if (isZip(buffer)) return "xlsx";

  const extension = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  const byExtension = EXTENSION_TYPES[extension];
  // Only CSV may be identified by extension alone — it has no signature.
  return byExtension === "csv" ? "csv" : null;
}

type Cell = string | number | boolean | null;
type Grid = Cell[][];

const text = (cell: Cell): string =>
  cell === null || cell === undefined ? "" : String(cell).replace(/\s+/g, " ").trim();

/** Header labels we accept, in the order columns are searched for. */
const HEADER_PATTERNS = {
  account: /^(gl\s*)?account(\s*(number|no\.?|code|#))?$/i,
  description: /^(account\s*)?description$/i,
  debit: /^debits?$/i,
  credit: /^credits?$/i,
};

interface HeaderMatch {
  rowIndex: number;
  columnMap: ColumnMap;
}

/**
 * Find the header row by looking for a row that names an account column plus
 * both amount columns. Scanning stops well before the data so a stray word in
 * the body cannot be mistaken for a header.
 */
function findHeaderRow(grid: Grid): HeaderMatch | null {
  const limit = Math.min(grid.length, 60);

  for (let rowIndex = 0; rowIndex < limit; rowIndex++) {
    const row = grid[rowIndex];
    if (!row) continue;

    let account = -1;
    let description = -1;
    let debit = -1;
    let credit = -1;

    for (let col = 0; col < row.length; col++) {
      const value = text(row[col]);
      if (value === "") continue;
      if (account < 0 && HEADER_PATTERNS.account.test(value)) account = col;
      else if (description < 0 && HEADER_PATTERNS.description.test(value)) description = col;
      else if (debit < 0 && HEADER_PATTERNS.debit.test(value)) debit = col;
      else if (credit < 0 && HEADER_PATTERNS.credit.test(value)) credit = col;
    }

    if (account >= 0 && debit >= 0 && credit >= 0) {
      return {
        rowIndex,
        columnMap: { account, description: description >= 0 ? description : account + 1, debit, credit },
      };
    }
  }

  return null;
}

/** Pull "Trial Balance as of 2026-07-31" style text out of the report preamble. */
function detectPeriodLabel(grid: Grid, headerRowIndex: number): string | null {
  for (let rowIndex = 0; rowIndex < headerRowIndex; rowIndex++) {
    for (const cell of grid[rowIndex] ?? []) {
      const value = text(cell);
      const asOf = /as of\s+(.+)$/i.exec(value);
      if (asOf) return asOf[1].trim();
      const yearPeriod = /^\[(\d{4})\s*-\s*(\d{1,2})\]$/.exec(value);
      if (yearPeriod) return `${yearPeriod[1]}-${yearPeriod[2].padStart(2, "0")}`;
    }
  }
  return null;
}

const TOTAL_ROW = /^total\s*:?$/i;
/** The Sage report prints its own net income beneath the totals. */
const NET_INCOME_ROW = /^net\s+(income|loss|profit)\b.*$/i;

function readWorkbook(buffer: Buffer, fileType: TrialBalanceFileType) {
  try {
    return XLSX.read(buffer, { type: "buffer", raw: true, cellDates: false });
  } catch (cause) {
    throw new TrialBalanceParseError(
      `This ${fileType.toUpperCase()} file could not be opened. It may be corrupted or password protected.`
    );
  }
}

export interface ParseOptions {
  sheetName?: string;
}

export function parseTrialBalanceFile(
  buffer: Buffer,
  fileName: string,
  options: ParseOptions = {}
): ParsedTrialBalance {
  const fileType = detectFileType(buffer, fileName);
  if (fileType === null) {
    throw new TrialBalanceParseError(
      "We couldn't read this file. Please upload a Trial Balance as .xlsx, .xls or .csv."
    );
  }

  const workbook = readWorkbook(buffer, fileType);
  const sheetName = options.sheetName ?? workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) throw new TrialBalanceParseError("The file contains no readable worksheet.");

  const grid = XLSX.utils.sheet_to_json<Cell[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  });

  const header = findHeaderRow(grid);
  if (!header) {
    throw new TrialBalanceParseError(
      "We couldn't find the Trial Balance columns. The sheet needs a header row naming an account column and both a debit and a credit column."
    );
  }

  const { columnMap } = header;
  const rows: TrialBalanceRow[] = [];
  const malformedRows: MalformedRow[] = [];
  let reportedTotalDebitsCents: bigint | null = null;
  let reportedTotalCreditsCents: bigint | null = null;
  let reportedNetIncomeCents: bigint | null = null;

  for (let rowIndex = header.rowIndex + 1; rowIndex < grid.length; rowIndex++) {
    const raw = grid[rowIndex];
    if (!raw) continue;

    const rawAccount = text(raw[columnMap.account]);
    const rawDescription = text(raw[columnMap.description]);
    const rawDebit = text(raw[columnMap.debit]);
    const rawCredit = text(raw[columnMap.credit]);

    // The report prints its own "Total:" line; capture it as a control figure.
    const totalMarker = raw.some((cell) => TOTAL_ROW.test(text(cell)));
    if (totalMarker) {
      const debit = parseMoneyToCents(raw[columnMap.debit]);
      const credit = parseMoneyToCents(raw[columnMap.credit]);
      if (debit.ok && !debit.isBlank) reportedTotalDebitsCents = debit.cents;
      if (credit.ok && !credit.isBlank) reportedTotalCreditsCents = credit.cents;
      continue;
    }

    // The report's own net-income footer. Captured as a control figure rather
    // than flagged: it carries an amount but is not a Trial Balance entry.
    if (raw.some((cell) => NET_INCOME_ROW.test(text(cell)))) {
      const debit = parseMoneyToCents(raw[columnMap.debit]);
      const credit = parseMoneyToCents(raw[columnMap.credit]);
      if (debit.ok && credit.ok) reportedNetIncomeCents = credit.cents - debit.cents;
      continue;
    }

    if (rawAccount === "" && rawDebit === "" && rawCredit === "") continue;

    const account = normalizeAccountCode(rawAccount);
    if (!account) {
      // Trailing report furniture ("163 accounts printed", net-income lines)
      // carries no account code and no amounts we can attribute. Only flag it
      // when money is attached, which would mean a row we failed to read.
      const debit = parseMoneyToCents(raw[columnMap.debit]);
      const credit = parseMoneyToCents(raw[columnMap.credit]);
      const hasMoney = (debit.ok && !debit.isBlank && debit.cents !== 0n) ||
        (credit.ok && !credit.isBlank && credit.cents !== 0n);
      if (hasMoney) {
        malformedRows.push({
          sourceRowNumber: rowIndex + 1,
          rawAccountCode: rawAccount,
          rawDescription,
          rawDebit,
          rawCredit,
          reason: rawAccount === ""
            ? "The row carries an amount but no account number."
            : `"${rawAccount}" is not a valid GL account code.`,
        });
      }
      continue;
    }

    const debit = parseMoneyToCents(raw[columnMap.debit]);
    const credit = parseMoneyToCents(raw[columnMap.credit]);

    if (!debit.ok || !credit.ok) {
      malformedRows.push({
        sourceRowNumber: rowIndex + 1,
        rawAccountCode: rawAccount,
        rawDescription,
        rawDebit,
        rawCredit,
        reason: debit.ok ? (credit.reason ?? "Unreadable credit amount.") : (debit.reason ?? "Unreadable debit amount."),
      });
      continue;
    }

    rows.push({
      sourceRowNumber: rowIndex + 1,
      account,
      description: rawDescription,
      debitCents: debit.cents,
      creditCents: credit.cents,
      netCents: debit.cents - credit.cents,
    });
  }

  if (rows.length === 0) {
    throw new TrialBalanceParseError(
      "No Trial Balance rows were found beneath the header row."
    );
  }

  let totalDebitsCents = 0n;
  let totalCreditsCents = 0n;
  for (const row of rows) {
    totalDebitsCents += row.debitCents;
    totalCreditsCents += row.creditCents;
  }

  return {
    fileType,
    sheetName,
    headerRowNumber: header.rowIndex + 1,
    columnMap,
    rows,
    malformedRows,
    totalDebitsCents,
    totalCreditsCents,
    reportedTotalDebitsCents,
    reportedTotalCreditsCents,
    reportedNetIncomeCents,
    detectedPeriodLabel: detectPeriodLabel(grid, header.rowIndex),
  };
}
