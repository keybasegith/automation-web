/**
 * CSV import and export for the GL mapping table.
 *
 * The file a finance user opens contains account numbers and plain words. There
 * is no wildcard, no regular expression and no separator syntax to learn: a set
 * is a space-separated list of account numbers, a range is a from and a to
 * column, and an exact account goes in its own column.
 */

import type { MappingRule, StatementKind } from "../types";

const COLUMNS = [
  "id", "statement", "match_type", "account", "accounts", "range_from", "range_to",
  "category", "section", "statement_line", "status", "excluded", "exclusion_reason",
  // Carried so an export/import round trip is lossless. A control rule that
  // came back as an ordinary one would claim every P&L account on the Balance
  // Sheet, which the validator would then (correctly) reject as a conflict.
  "role", "notes",
] as const;

const escape = (value: string): string =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export function mappingsToCsv(rules: readonly MappingRule[]): string {
  const lines = [COLUMNS.join(",")];

  for (const rule of rules) {
    lines.push(
      [
        rule.id,
        rule.statement === "balance_sheet" ? "Balance Sheet" : "Income Statement",
        rule.matchType,
        rule.matchType === "EXACT_FULL_CODE" ? (rule.fullCode ?? "") : (rule.baseCode ?? ""),
        rule.matchType === "GL_CODE_SET" ? (rule.accounts ?? []).join(" ") : "",
        rule.from?.toString() ?? "",
        rule.to?.toString() ?? "",
        rule.category,
        rule.section,
        rule.statementLine,
        rule.status,
        rule.excluded ? "yes" : "no",
        rule.exclusionReason ?? "",
        rule.role ?? "",
        rule.notes ?? "",
      ]
        .map((v) => escape(String(v)))
        .join(",")
    );
  }

  return lines.join("\n");
}

/** Minimal RFC-4180 reader: quoted fields, doubled quotes, CRLF or LF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += char;
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (char !== "\r") field += char;
  }

  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export interface CsvImportResult {
  rules: MappingRule[];
  errors: string[];
}

export function csvToMappings(text: string): CsvImportResult {
  const rows = parseCsv(text);
  const errors: string[] = [];
  if (rows.length === 0) return { rules: [], errors: ["The file is empty."] };

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const missing = ["id", "statement", "match_type", "section", "statement_line"].filter(
    (c) => !header.includes(c)
  );
  if (missing.length > 0) {
    return { rules: [], errors: [`The file is missing these columns: ${missing.join(", ")}.`] };
  }

  const at = (row: string[], column: string): string => {
    const index = header.indexOf(column);
    return index < 0 ? "" : (row[index] ?? "").trim();
  };

  const rules: MappingRule[] = [];

  rows.slice(1).forEach((row, offset) => {
    const lineNumber = offset + 2;
    const id = at(row, "id");
    if (!id) { errors.push(`Line ${lineNumber}: missing id.`); return; }

    const statementRaw = at(row, "statement").toLowerCase();
    const statement: StatementKind | null =
      statementRaw.includes("balance") ? "balance_sheet"
        : statementRaw.includes("income") ? "income_statement"
        : null;
    if (!statement) { errors.push(`Line ${lineNumber}: statement must be Balance Sheet or Income Statement.`); return; }

    const matchType = at(row, "match_type").toUpperCase() as MappingRule["matchType"];
    if (!["EXACT_FULL_CODE", "BASE_GL_CODE", "GL_CODE_SET", "NUMERIC_RANGE"].includes(matchType)) {
      errors.push(`Line ${lineNumber}: unknown match type "${at(row, "match_type")}".`);
      return;
    }

    const account = at(row, "account");
    const accounts = at(row, "accounts").split(/[\s;]+/).filter(Boolean);
    const from = at(row, "range_from");
    const to = at(row, "range_to");
    const excluded = /^(yes|true|y|1)$/i.test(at(row, "excluded"));

    rules.push({
      id,
      statement,
      matchType,
      fullCode: matchType === "EXACT_FULL_CODE" ? account.toUpperCase() : undefined,
      baseCode: matchType === "BASE_GL_CODE" ? account : undefined,
      accounts: matchType === "GL_CODE_SET" ? accounts : undefined,
      from: matchType === "NUMERIC_RANGE" && from !== "" ? Number(from) : undefined,
      to: matchType === "NUMERIC_RANGE" && to !== "" ? Number(to) : undefined,
      category: at(row, "category"),
      section: at(row, "section"),
      statementLine: at(row, "statement_line"),
      status: at(row, "status").toLowerCase() === "inactive" ? "inactive" : "active",
      excluded,
      exclusionReason: at(row, "exclusion_reason") || undefined,
      role: at(row, "role") === "current_period_earnings" ? "current_period_earnings" : undefined,
      source: "user",
      notes: at(row, "notes") || undefined,
    });
  });

  return { rules, errors };
}
