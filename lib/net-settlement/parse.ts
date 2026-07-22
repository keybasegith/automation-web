/**
 * Browser-local file parsing for settlement reconciliation.
 *
 * Everything runs in the browser — no upload, no server. Supports
 * .xlsx/.xls (multi-sheet), .csv/.txt (delimiter-detected), .html (all tables),
 * and .json. Every parsed row preserves its original 1-based row number.
 */

import * as XLSX from "xlsx";

export interface ParsedRow {
  rowNumber: number;
  cells: Record<string, unknown>;
}

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: ParsedRow[];
}

export type ParsedKind = "xlsx" | "csv" | "html" | "json" | "pdf" | "unknown";

export interface ParsedFile {
  kind: ParsedKind;
  sheets: ParsedSheet[];
  warnings: string[];
}

const EXT_RE = /\.([a-z0-9]+)$/i;

const isZip = (b: Uint8Array) => b[0] === 0x50 && b[1] === 0x4b; // "PK" — xlsx is a zip
const isPdf = (b: Uint8Array) =>
  b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // "%PDF"
const isOleXls = (b: Uint8Array) => b[0] === 0xd0 && b[1] === 0xcf; // legacy .xls

/** NUL bytes early in the file mean it isn't text/tabular. */
function looksBinary(b: Uint8Array): boolean {
  const n = Math.min(b.length, 1000);
  for (let i = 0; i < n; i++) if (b[i] === 0) return true;
  return false;
}

/** A real settlement table has at least 2 columns and 1 data row. This also
 *  stops binary garbage from being mistaken for a single-column table. */
const hasTable = (f: ParsedFile) =>
  f.sheets.some((s) => s.headers.length >= 2 && s.rows.length > 0);

/**
 * Parse raw bytes (from a dropped File.arrayBuffer()) entirely in the browser.
 *
 * Any file can be submitted: we try the format suggested by the extension
 * first, then fall back to content sniffing (zip/xlsx, HTML, JSON, delimited)
 * so a mislabelled or extension-less export still works. Only if nothing yields
 * a table do we report a clear error.
 */
export function parseSettlementBytes(data: ArrayBuffer, filename: string): ParsedFile {
  const ext = (filename.match(EXT_RE)?.[1] || "").toLowerCase();
  const bytes = new Uint8Array(data);

  if (isPdf(bytes) || ext === "pdf") {
    return {
      kind: "unknown",
      sheets: [],
      warnings: ["PDF is not supported by the in-browser tool — export the data as Excel or CSV."],
    };
  }

  // Binary that isn't a workbook container can't hold a table — say so plainly
  // rather than decoding it into garbage.
  if (looksBinary(bytes) && !isZip(bytes) && !isOleXls(bytes)) {
    return {
      kind: "unknown",
      sheets: [],
      warnings: [
        "This file doesn’t contain a readable table. Export it as Excel, CSV, or HTML and try again.",
      ],
    };
  }

  const asWorkbook = (): ParsedFile => ({ kind: "xlsx", sheets: parseWorkbook(data), warnings: [] });
  const asHtml = (): ParsedFile => ({ kind: "html", sheets: parseHtmlTables(decode(data)), warnings: [] });
  const asJson = (): ParsedFile => ({ kind: "json", sheets: [parseJson(decode(data))], warnings: [] });
  const asDelimited = (): ParsedFile => ({ kind: "csv", sheets: [parseDelimited(decode(data))], warnings: [] });

  const attempts: Array<() => ParsedFile> = [];

  // 1) Magic bytes beat the extension — a workbook renamed .csv is still a workbook.
  if (isZip(bytes) || isOleXls(bytes)) attempts.push(asWorkbook);

  // 2) What the extension claims.
  if (ext === "xlsx" || ext === "xls" || ext === "xlsm") attempts.push(asWorkbook);
  else if (ext === "html" || ext === "htm") attempts.push(asHtml);
  else if (ext === "json") attempts.push(asJson);
  else if (ext === "csv" || ext === "txt" || ext === "tsv") attempts.push(asDelimited);

  // 3) What the content looks like.
  const head = decode(data.slice(0, 4096)).trimStart();
  if (/<table|<html|<!doctype/i.test(head)) attempts.push(asHtml);
  if (/^[[{]/.test(head)) attempts.push(asJson);

  // 3) Last resorts.
  attempts.push(asDelimited, asWorkbook);

  for (const attempt of attempts) {
    try {
      const result = attempt();
      if (hasTable(result)) return result;
    } catch {
      // try the next strategy
    }
  }

  return {
    kind: "unknown",
    sheets: [],
    warnings: [
      looksBinary(bytes)
        ? "This file doesn’t contain a readable table. Export it as Excel, CSV, or HTML and try again."
        : "No recognizable table was found in this file.",
    ],
  };
}

function decode(data: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(data));
}

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

function parseWorkbook(data: ArrayBuffer): ParsedSheet[] {
  const wb = XLSX.read(new Uint8Array(data), { type: "array", cellDates: true });
  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    });
    return matrixToSheet(name, matrix as unknown[][]);
  }).filter((s) => s.headers.length > 0);
}

/**
 * Convert an array-of-arrays into a sheet, detecting the header row even when
 * the file has title rows above the table.
 */
export function matrixToSheet(name: string, matrix: unknown[][]): ParsedSheet {
  const headerIdx = detectHeaderRowIndex(matrix);
  if (headerIdx < 0) return { name, headers: [], rows: [] };

  const rawHeaders = matrix[headerIdx].map((c, i) =>
    c === null || c === undefined || String(c).trim() === "" ? `column_${i + 1}` : String(c).trim()
  );
  const headers = dedupeHeaders(rawHeaders);

  const rows: ParsedRow[] = [];
  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    if (row.every((c) => c === null || c === undefined || String(c).trim() === "")) continue;
    const cells: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      cells[h] = row[i] ?? null;
    });
    rows.push({ rowNumber: r + 1, cells });
  }
  return { name, headers, rows };
}

/** First row with >= 2 non-empty, mostly-textual cells is treated as headers. */
function detectHeaderRowIndex(matrix: unknown[][]): number {
  for (let r = 0; r < Math.min(matrix.length, 25); r++) {
    const row = matrix[r] ?? [];
    const nonEmpty = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== "");
    if (nonEmpty.length < 2) continue;
    const textual = nonEmpty.filter((c) => typeof c === "string" && /[a-zA-Z]/.test(c)).length;
    if (textual >= Math.ceil(nonEmpty.length / 2)) return r;
  }
  return matrix.findIndex((row) =>
    (row ?? []).some((c) => c !== null && c !== undefined && String(c).trim() !== "")
  );
}

function dedupeHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((h) => {
    const n = seen.get(h) ?? 0;
    seen.set(h, n + 1);
    return n === 0 ? h : `${h}_${n + 1}`;
  });
}

// ---------------------------------------------------------------------------
// Delimited text (CSV / TSV)
// ---------------------------------------------------------------------------

export function detectDelimiter(sample: string): string {
  const firstLine = sample.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
  const counts: Record<string, number> = {
    "\t": (firstLine.match(/\t/g) || []).length,
    ",": (firstLine.match(/,/g) || []).length,
    ";": (firstLine.match(/;/g) || []).length,
    "|": (firstLine.match(/\|/g) || []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] || ",";
}

/** Parse delimited text with basic RFC-4180 quoting support. */
export function parseDelimited(text: string, delimiter?: string): ParsedSheet {
  const delim = delimiter ?? detectDelimiter(text);
  const rows = splitDelimited(text, delim);
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  return matrixToSheet("data", nonEmpty);
}

function splitDelimited(text: string, delim: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(cur);
      cur = "";
    } else if (ch === "\n") {
      row.push(cur);
      out.push(row);
      row = [];
      cur = "";
    } else if (ch === "\r") {
      // handled by \n
    } else cur += ch;
  }
  if (cur !== "" || row.length) {
    row.push(cur);
    out.push(row);
  }
  return out;
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

function parseJson(text: string): ParsedSheet {
  const data: unknown = JSON.parse(text);
  const arr: Record<string, unknown>[] = Array.isArray(data)
    ? (data as Record<string, unknown>[])
    : Array.isArray((data as { rows?: unknown })?.rows)
    ? (data as { rows: Record<string, unknown>[] }).rows
    : [];
  const headerSet = new Set<string>();
  for (const obj of arr) for (const k of Object.keys(obj ?? {})) headerSet.add(k);
  const headers = [...headerSet];
  const rows: ParsedRow[] = arr.map((obj, i) => ({
    rowNumber: i + 1,
    cells: Object.fromEntries(headers.map((h) => [h, obj?.[h] ?? null])),
  }));
  return { name: "data", headers, rows };
}

// ---------------------------------------------------------------------------
// HTML tables (Fundserv / Winfund list-view exports)
// ---------------------------------------------------------------------------

export function parseHtmlTables(html: string): ParsedSheet[] {
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  const sheets: ParsedSheet[] = [];
  tables.forEach((table, ti) => {
    const trs = table.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
    const matrix: string[][] = trs
      .map((tr) => {
        const cells = tr.match(/<t[hd][\s\S]*?<\/t[hd]>/gi) ?? [];
        return cells.map((c) => decodeHtml(c.replace(/<[^>]+>/g, "").trim()));
      })
      .filter((r) => r.some((c) => c !== ""));
    const deduped = dropRepeatedHeaderRows(matrix);
    const sheet = matrixToSheet(`table_${ti + 1}`, deduped);
    if (sheet.headers.length > 0 && sheet.rows.length > 0) sheets.push(sheet);
  });
  return sheets;
}

export function dropRepeatedHeaderRows(matrix: string[][]): string[][] {
  if (matrix.length === 0) return matrix;
  const header = JSON.stringify(matrix[0]);
  return matrix.filter((row, i) => i === 0 || JSON.stringify(row) !== header);
}

function decodeHtml(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

/** Parse pasted text (tab/comma/semicolon-delimited or an HTML table). */
export function parsePastedTable(text: string): ParsedSheet {
  if (/<table[\s\S]*?<\/table>/i.test(text)) {
    const sheets = parseHtmlTables(text);
    if (sheets[0]) return sheets[0];
  }
  return parseDelimited(text);
}
