import * as XLSX from "xlsx";
import { parseAmount, roundCents } from "./parseAmounts";
import type {
  ParsedSageExport,
  SageAccount,
  SageTransaction,
} from "./types";

type Row = (string | number | null | undefined)[];

// Account codes must contain at least one letter after the digits so that
// year subheader rows like "2026" and period rows like "03" are not picked up.
// Matches: 1100-K, 1100K, 1101-K, 1200-K. Rejects: 2026, 03, 5000.
const ACCOUNT_CODE_REGEX = /^\d{3,6}[-\s]?[A-Z][A-Z0-9]{0,3}$/;
const YEAR_ONLY_REGEX = /^(?:19|20|21)\d{2}$/;
const HEADER_KEYWORDS = [
  "account number",
  "year",
  "prd",
  "source",
  "doc. date",
  "doc date",
  "description",
  "reference",
  "posting seq",
  "batch-entry",
  "batch entry",
  "debits",
  "credits",
  "net change",
  "balance",
];
const TOTAL_KEYWORDS = [
  "total for account",
  "total debits",
  "total credits",
  "net change for period",
  "net change and ending balance",
  "ending balance",
  "opening balance",
  "beginning balance",
  "balance forward",
  "totals:",
  "totals for ",
];

interface ColumnMap {
  year?: number;
  prd?: number;
  source?: number;
  docDate?: number;
  description?: number;
  reference?: number;
  postingSeq?: number;
  batchEntry?: number;
  debit?: number;
  credit?: number;
  netChange?: number;
  balance?: number;
  accountNumber?: number;
}

interface ExtractedSheet {
  rows: Row[];
}

export function normalizeAccountNumber(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return formatDateValue(value);
  }
  if (typeof value === "number") return String(value);
  return String(value).trim();
}

function formatDateValue(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rowText(row: Row): string {
  return row.map(cellToString).join(" | ").toLowerCase();
}

function isAccountCode(value: string): boolean {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  return ACCOUNT_CODE_REGEX.test(v);
}

function isHeaderRow(row: Row): boolean {
  const text = rowText(row);
  if (!text.trim()) return false;
  let hits = 0;
  for (const k of HEADER_KEYWORDS) {
    if (text.includes(k)) hits += 1;
    if (hits >= 3) return true;
  }
  return false;
}

function isTotalsRow(row: Row): { kind: "total" | "ending" | "opening" } | null {
  const text = rowText(row);
  if (!text.trim()) return null;
  if (text.includes("ending balance")) return { kind: "ending" };
  if (text.includes("opening balance") || text.includes("beginning balance")) {
    return { kind: "opening" };
  }
  for (const k of TOTAL_KEYWORDS) {
    if (text.includes(k)) return { kind: "total" };
  }
  return null;
}

function buildColumnMap(headerRow: Row): ColumnMap {
  const map: ColumnMap = {};
  // The Sage 300 GL Account Details report puts Account Number, Year, and Prd.
  // in the same physical column (a stacked label). Each of those fields can
  // therefore map to the same column index — no `else if` chain.
  headerRow.forEach((cell, idx) => {
    const s = cellToString(cell).toLowerCase().replace(/\s+/g, " ").trim();
    if (!s) return;
    if (s.includes("account") && s.includes("number")) map.accountNumber = idx;
    if (s.includes("year")) map.year = idx;
    if (s.includes("prd") || s === "period") map.prd = idx;
    if (s === "source") map.source = idx;
    if (s.includes("doc") && s.includes("date")) map.docDate = idx;
    if (s.includes("description") || s.includes("reference")) {
      if (map.description === undefined) map.description = idx;
      else if (idx !== map.description) map.reference = idx;
    }
    if (s.includes("posting") && s.includes("seq")) map.postingSeq = idx;
    if (s.includes("batch")) map.batchEntry = idx;
    if (s.includes("debit")) map.debit = idx;
    if (s.includes("credit")) map.credit = idx;
    if (s.includes("net") && s.includes("change")) map.netChange = idx;
    if (s === "balance" || s.endsWith(" balance")) map.balance = idx;
  });
  return map;
}

function isYearOnlyRow(row: Row, columnMap: ColumnMap): number | null {
  const yearIdx = columnMap.accountNumber ?? columnMap.year ?? 0;
  const v = cellToString(row[yearIdx]).trim();
  if (!YEAR_ONLY_REGEX.test(v)) return null;
  // All other cells must be empty for this to count as a pure year subheader.
  for (let i = 0; i < row.length; i += 1) {
    if (i === yearIdx) continue;
    if (cellToString(row[i]).trim()) return null;
  }
  return Number(v);
}

function pickAccountCodeFromRow(row: Row): { code: string; nameHint: string } | null {
  for (let i = 0; i < Math.min(row.length, 4); i += 1) {
    const s = cellToString(row[i]);
    if (isAccountCode(s)) {
      // Account name often appears in the next non-empty cell or the same row
      let nameHint = "";
      for (let j = i + 1; j < row.length; j += 1) {
        const t = cellToString(row[j]);
        if (t && !isAccountCode(t)) {
          nameHint = t;
          break;
        }
      }
      return { code: s, nameHint };
    }
  }
  return null;
}

function sheetToRows(sheet: XLSX.WorkSheet): Row[] {
  return XLSX.utils.sheet_to_json<Row>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  });
}

function readWorkbookFromBuffer(buf: Buffer): XLSX.WorkBook {
  return XLSX.read(buf, { type: "buffer", cellDates: true });
}

function readCsvFromBuffer(buf: Buffer): XLSX.WorkBook {
  // SheetJS handles CSV when given the string content and { type: "string" }.
  return XLSX.read(buf.toString("utf8"), { type: "string", cellDates: true });
}

function extractSheet(workbook: XLSX.WorkBook): ExtractedSheet {
  // Sage 300 exports usually have a single sheet but be safe.
  const allRows: Row[] = [];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const rows = sheetToRows(sheet);
    allRows.push(...rows);
  }
  return { rows: allRows };
}

function detectFileKind(filename: string): "csv" | "excel" {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  return "excel";
}

function parseRowToTransaction(
  row: Row,
  columnMap: ColumnMap,
  rowIndex: number,
  account: { number: string; numberRaw: string; name: string; fiscalYear?: number }
): SageTransaction | null {
  const getCell = (idx?: number): string => {
    if (idx === undefined) return "";
    return cellToString(row[idx]);
  };
  const getNumber = (idx?: number): number | undefined => {
    if (idx === undefined) return undefined;
    return parseAmount(row[idx]);
  };

  const docDate = getCell(columnMap.docDate);
  const fiscalPeriod = getCell(columnMap.prd);
  const description = getCell(columnMap.description);
  const reference = getCell(columnMap.reference);
  const debit = getNumber(columnMap.debit);
  const credit = getNumber(columnMap.credit);
  const netChange = getNumber(columnMap.netChange);
  const balance = getNumber(columnMap.balance);

  // A valid transaction has at minimum a Doc. Date (Sage transaction lines
  // always carry one) AND either a description/reference OR a debit/credit.
  // Period-only or balance-only rows are header/totals artifacts and skipped.
  const hasAmount =
    debit !== undefined ||
    credit !== undefined ||
    netChange !== undefined;

  if (!docDate) return null;
  if (!description && !reference && !hasAmount) return null;

  const source = getCell(columnMap.source);
  const postingSeq = getCell(columnMap.postingSeq);
  const batchEntry = getCell(columnMap.batchEntry);
  // The Year column shares physical position with Account Number / Prd. in
  // Sage 300 exports — on a transaction row that cell holds the period, not
  // a year. Only accept a 4-digit year-shaped value here.
  const yearStr = getCell(columnMap.year);
  const yearNum = yearStr && YEAR_ONLY_REGEX.test(yearStr) ? Number(yearStr) : NaN;
  const year = Number.isFinite(yearNum) ? yearNum : account.fiscalYear;

  return {
    accountNumber: account.number,
    accountNumberRaw: account.numberRaw,
    accountName: account.name,
    fiscalYear: Number.isFinite(year) ? (year as number) : account.fiscalYear,
    fiscalPeriod: fiscalPeriod || undefined,
    source: source || undefined,
    docDate: docDate || undefined,
    description: description || undefined,
    reference: reference || undefined,
    postingSeq: postingSeq || undefined,
    batchEntry: batchEntry || undefined,
    debit,
    credit,
    netChange,
    balance,
    rawRowIndex: rowIndex,
  };
}

function findAmountInRow(row: Row, columnMap: ColumnMap): number | undefined {
  if (columnMap.balance !== undefined) {
    const v = parseAmount(row[columnMap.balance]);
    if (v !== undefined) return v;
  }
  if (columnMap.netChange !== undefined) {
    const v = parseAmount(row[columnMap.netChange]);
    if (v !== undefined) return v;
  }
  // Fall back to scanning numeric cells right-to-left (balances usually rightmost).
  for (let i = row.length - 1; i >= 0; i -= 1) {
    const v = parseAmount(row[i]);
    if (v !== undefined) return v;
  }
  return undefined;
}

export function parseSageExport(
  buffer: Buffer,
  filename: string
): ParsedSageExport {
  const kind = detectFileKind(filename);
  const workbook =
    kind === "csv" ? readCsvFromBuffer(buffer) : readWorkbookFromBuffer(buffer);
  const { rows } = extractSheet(workbook);

  const accountsByNumber = new Map<string, SageAccount>();
  let currentAccount: SageAccount | null = null;
  let currentColumnMap: ColumnMap = {};
  let lastSeenHeader: Row | null = null;
  const fiscalYears = new Set<number>();

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.every((c) => cellToString(c) === "")) continue;

    if (isHeaderRow(row)) {
      currentColumnMap = buildColumnMap(row);
      lastSeenHeader = row;
      continue;
    }

    // Year subheader rows (just "2026" alone in the account-number column) —
    // capture the fiscal year onto the current account, then skip.
    if (currentAccount) {
      const yr = isYearOnlyRow(row, currentColumnMap);
      if (yr !== null) {
        if (!currentAccount.fiscalYear) currentAccount.fiscalYear = yr;
        fiscalYears.add(yr);
        continue;
      }
    }

    // Account header: usually a row where one of the first cells is an
    // account code; the description column carries the account name; the
    // Balance column (if populated) gives the brought-forward opening balance.
    const acctHit = pickAccountCodeFromRow(row);
    if (acctHit) {
      const normalized = normalizeAccountNumber(acctHit.code);
      const yearCell =
        currentColumnMap.year !== undefined
          ? cellToString(row[currentColumnMap.year])
          : "";
      const yearCandidate = yearCell ? Number(yearCell) : NaN;
      const fiscalYear =
        Number.isFinite(yearCandidate) &&
        !YEAR_ONLY_REGEX.test(acctHit.code) // exclude when col A WAS the code
          ? yearCandidate
          : undefined;
      if (fiscalYear) fiscalYears.add(fiscalYear);

      // Balance column on the account header row = opening / brought-forward
      // balance for this section. Only treat it as opening when no debit or
      // credit cell is also populated (otherwise it's a transaction line).
      let headerOpeningBalance: number | undefined;
      if (currentColumnMap.balance !== undefined) {
        const headerBal = parseAmount(row[currentColumnMap.balance]);
        const headerDebit =
          currentColumnMap.debit !== undefined
            ? parseAmount(row[currentColumnMap.debit])
            : undefined;
        const headerCredit =
          currentColumnMap.credit !== undefined
            ? parseAmount(row[currentColumnMap.credit])
            : undefined;
        if (
          headerBal !== undefined &&
          headerDebit === undefined &&
          headerCredit === undefined
        ) {
          headerOpeningBalance = headerBal;
        }
      }

      const existing = accountsByNumber.get(normalized);
      if (existing) {
        currentAccount = existing;
        if (!existing.fiscalYear && fiscalYear) existing.fiscalYear = fiscalYear;
        // Only set opening balance the FIRST time the account is seen — the
        // first occurrence is the start-of-export carry-forward.
        if (
          existing.openingBalance === undefined &&
          headerOpeningBalance !== undefined
        ) {
          existing.openingBalance = headerOpeningBalance;
        }
      } else {
        const account: SageAccount = {
          accountNumber: normalized,
          accountNumberRaw: acctHit.code,
          accountName: acctHit.nameHint || normalized,
          fiscalYear,
          openingBalance: headerOpeningBalance,
          transactions: [],
        };
        accountsByNumber.set(normalized, account);
        currentAccount = account;
      }

      // Ensure we still have a column map (header may not repeat per account).
      if (Object.keys(currentColumnMap).length === 0 && lastSeenHeader) {
        currentColumnMap = buildColumnMap(lastSeenHeader);
      }
      continue;
    }

    if (!currentAccount) continue;

    const totals = isTotalsRow(row);
    if (totals) {
      const amount = findAmountInRow(row, currentColumnMap);
      if (amount !== undefined) {
        if (totals.kind === "opening") {
          currentAccount.openingBalance = amount;
        } else if (totals.kind === "ending") {
          currentAccount.endingBalance = amount;
        }
      }
      continue;
    }

    const tx = parseRowToTransaction(row, currentColumnMap, i, {
      number: currentAccount.accountNumber,
      numberRaw: currentAccount.accountNumberRaw,
      name: currentAccount.accountName,
      fiscalYear: currentAccount.fiscalYear,
    });
    if (tx) {
      currentAccount.transactions.push(tx);
      if (tx.fiscalYear) fiscalYears.add(tx.fiscalYear);
    }
  }

  // Compute fallback totals if Sage didn't include explicit totals rows.
  for (const account of accountsByNumber.values()) {
    const totalDebits = account.transactions.reduce(
      (sum, t) => sum + (t.debit ?? 0),
      0
    );
    const totalCredits = account.transactions.reduce(
      (sum, t) => sum + (t.credit ?? 0),
      0
    );
    account.totalDebits = roundCents(totalDebits);
    account.totalCredits = roundCents(totalCredits);
    account.netChange = roundCents(totalDebits - totalCredits);

    if (account.endingBalance === undefined) {
      const last = account.transactions[account.transactions.length - 1];
      if (last?.balance !== undefined) {
        account.endingBalance = last.balance;
      }
    }
  }

  return {
    accounts: Array.from(accountsByNumber.values()).sort((a, b) =>
      a.accountNumber.localeCompare(b.accountNumber)
    ),
    parsedAt: new Date().toISOString(),
    filename,
    detectedFiscalYears: Array.from(fiscalYears).sort((a, b) => a - b),
  };
}
