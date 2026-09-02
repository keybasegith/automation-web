/**
 * One-time migration: legacy ExcelReport-Master workbook -> clean TypeScript
 * mapping configuration.
 *
 *   node scripts/migrate-legacy-fs-mappings.mjs "<path to .xlsm>"
 *
 * The generated files under lib/financial-statements/config/ are the runtime
 * source of truth. This script exists so the conversion is reproducible and
 * reviewable rather than hand-transcribed; it is not used at runtime and the
 * workbook is not needed to run, build or test the application.
 *
 * Legacy syntax translated here (and never carried into the app):
 *   1000%%      -> BASE_GL_CODE "1000"        (%% was a trailing wildcard)
 *   1000,1001   -> GL_CODE_SET  ["1000","1001"]
 *   4830:4832   -> NUMERIC_RANGE 4830..4832
 *   3100-K-I    -> EXACT_FULL_CODE "3100-K-I"
 *   "\" in Group3 -> an explicit EXCLUDED rule, visible in reconciliation
 */

import XLSX from "xlsx";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const workbookPath = process.argv[2];
if (!workbookPath) {
  console.error("Usage: node scripts/migrate-legacy-fs-mappings.mjs <workbook.xlsm>");
  process.exit(1);
}

/**
 * Curation applied on top of the raw workbook.
 *
 * The legacy engine documented "the first match will be used - if there are
 * multiple possible matches the second will be ignored". Rather than reproduce
 * first-match-wins at runtime (where a later edit could silently change a
 * statement), each collision the workbook actually contained is resolved once,
 * here, in a way that is behaviour-identical to the legacy result. The new
 * engine then treats any *remaining* same-tier collision as a blocking
 * ambiguity.
 */
const CURATION = {
  // Rules dropped because an earlier legacy row already claimed the accounts,
  // so under legacy first-match these never had any effect.
  dropRules: [
    { sheet: "IS", row: 46, why: "Shadowed by IS row 13 (Interco Admin Fees, 4950) under legacy first-match." },
    { sheet: "IS", row: 47, why: "Shadowed by IS row 45 (Income Tax Provision, 8000:8100) under legacy first-match." },
  ],
  // Tokens removed from a rule because an earlier legacy row claimed them.
  dropTokens: [
    { sheet: "IS", row: 42, token: "7750", why: "IS row 41 (Bonus) claims 7750 first under legacy first-match." },
  ],
  // Statement-line renames to the labels used on the reviewed July 2026 output.
  rename: [
    { sheet: "BS", from: "Registred Account Fees", to: "Registered Account Fees" },
    { sheet: "BS", from: "Intercompany KIAL", to: "Intercompany - KIAL" },
    { sheet: "IS", row: 41, from: "Bonus Provision", to: "Bonus" },
    { sheet: "IS", from: "Statement Fees from Reps", to: "Statement Fees Reps" },
    { sheet: "IS", from: "Occupancy & Equipment Rental", to: "Equipment Rental" },
    { sheet: "IS", from: "Payroll Costs", to: "Payroll Expenses" },
    { sheet: "IS", from: "Recovery from Reps - MFDA Fees WHS", to: "Recovery from Reps - MFDA Fees" },
    { sheet: "IS", from: "SDR Fees to Computershare", to: "SDR Fees to Computershare (MT)" },
    { sheet: "IS", from: "Client Acquisition", to: "Acquisition Expense" },
  ],
  // Lines the reviewed statement presents separately but the legacy master
  // lumped in. Each split is provable to the cent against the July 2026 output.
  addRules: [
    {
      sheet: "BS", id: "bs-right-of-use-asset-office",
      matchType: "GL_CODE_SET", accounts: ["1950", "2950"],
      category: "Assets", section: "Capital assets", statementLine: "Right of Use Asset-Office",
      why: "Reviewed statement shows the right-of-use asset and its accumulated amortization on their own line (1950 less 2950). A code set outranks the Capital Assets ranges, so no range needed changing.",
    },
    {
      sheet: "BS", id: "bs-lease-obligation",
      matchType: "BASE_GL_CODE", baseCode: "3600",
      category: "Liability and Shareholder Equity", section: "Current Liabilities", statementLine: "Lease Obligation",
      why: "Reviewed statement shows the office lease obligation separately from Accounts Payable & Accruals.",
    },
  ],
  // 3600 leaves the Accounts Payable set because bs-lease-obligation now claims
  // it; leaving it in both would be a same-tier ambiguity.
  removeFromSet: [
    { sheet: "BS", row: 22, token: "3600", why: "Moved to its own Lease Obligation line." },
  ],
  // The legacy "all P&L accounts" span. Kept as a control rule: it never claims
  // an account, it only cross-checks the Income Statement's net income.
  controlRules: [{ sheet: "BS", row: 50, role: "current_period_earnings" }],
};

const clean = (v) => (v == null ? null : String(v).replace(/\s+/g, " ").trim());
const wb = XLSX.readFile(workbookPath, { raw: true });

function readSheet(name) {
  const grid = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null, blankrows: true });
  const out = [];
  for (let i = 1; i < grid.length; i++) {
    const r = grid[i];
    if (!r) continue;
    const accounts = clean(r[0]);
    // Everything below the table is prose notes; a mapping row starts with a digit.
    if (!accounts || !/^[0-9]/.test(accounts)) continue;
    const group3 = clean(r[1]);
    if (!group3) continue;
    out.push({ row: i + 1, accounts, statementLine: group3, section: clean(r[2]), category: clean(r[3]) });
  }
  return out;
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function buildRules(sheet, statement) {
  const rules = [];
  const seen = new Set();

  for (const legacy of readSheet(sheet)) {
    if (CURATION.dropRules.some((d) => d.sheet === sheet && d.row === legacy.row)) continue;

    const excluded = legacy.statementLine === "\\";
    let statementLine = excluded ? "" : legacy.statementLine;
    for (const rn of CURATION.rename) {
      if (rn.sheet !== sheet) continue;
      if (rn.row != null && rn.row !== legacy.row) continue;
      if (statementLine === rn.from) statementLine = rn.to;
    }

    const control = CURATION.controlRules.find((c) => c.sheet === sheet && c.row === legacy.row);

    let tokens = legacy.accounts.split(",").map((t) => t.trim()).filter(Boolean);
    tokens = tokens.filter((t) => {
      const base = t.replace(/%%$/, "");
      const dropped =
        CURATION.dropTokens.some((d) => d.sheet === sheet && d.row === legacy.row && d.token === base) ||
        CURATION.removeFromSet.some((d) => d.sheet === sheet && d.row === legacy.row && d.token === base);
      return !dropped;
    });

    const baseCodes = [];
    for (const token of tokens) {
      if (/^[0-9]{4}%%$/.test(token) || /^[0-9]{4}$/.test(token)) {
        baseCodes.push(token.replace(/%%$/, ""));
      } else if (/^[0-9]{4}:[0-9]{4}$/.test(token)) {
        const [from, to] = token.split(":").map(Number);
        rules.push({
          id: `${sheet.toLowerCase()}-${slug(excluded ? `excluded-${from}-${to}` : statementLine)}-r${from}-${to}`,
          statement, matchType: "NUMERIC_RANGE", from, to,
          category: legacy.category, section: legacy.section, statementLine,
          excluded, role: control?.role, legacyRow: legacy.row,
        });
      } else if (/^[0-9]{4}-[A-Z0-9]+(-[A-Z0-9]+)*$/.test(token)) {
        const key = `${sheet}|${token}|${statementLine}|${excluded}`;
        if (seen.has(key)) continue; // legacy listed 3100-K-X and -Y twice, identically
        seen.add(key);
        rules.push({
          id: `${sheet.toLowerCase()}-${slug(excluded ? `excluded-${token}` : `${statementLine}-${token}`)}`,
          statement, matchType: "EXACT_FULL_CODE", fullCode: token,
          category: legacy.category, section: legacy.section, statementLine,
          excluded, role: control?.role, legacyRow: legacy.row,
        });
      } else {
        throw new Error(`Unrecognised legacy token on ${sheet} row ${legacy.row}: ${JSON.stringify(token)}`);
      }
    }

    if (baseCodes.length === 1) {
      rules.push({
        id: `${sheet.toLowerCase()}-${slug(excluded ? `excluded-${baseCodes[0]}` : statementLine)}-${baseCodes[0]}`,
        statement, matchType: "BASE_GL_CODE", baseCode: baseCodes[0],
        category: legacy.category, section: legacy.section, statementLine,
        excluded, role: control?.role, legacyRow: legacy.row,
      });
    } else if (baseCodes.length > 1) {
      rules.push({
        id: `${sheet.toLowerCase()}-${slug(excluded ? `excluded-${legacy.row}` : statementLine)}-set`,
        statement, matchType: "GL_CODE_SET", accounts: baseCodes,
        category: legacy.category, section: legacy.section, statementLine,
        excluded, role: control?.role, legacyRow: legacy.row,
      });
    }
  }

  for (const add of CURATION.addRules.filter((a) => a.sheet === sheet)) {
    rules.push({
      id: add.id, statement, matchType: add.matchType,
      accounts: add.accounts, baseCode: add.baseCode, from: add.from, to: add.to,
      category: add.category, section: add.section, statementLine: add.statementLine,
      excluded: false, legacyRow: null, note: add.why,
    });
  }

  return rules;
}

const bs = buildRules("BS", "balance_sheet");
const is = buildRules("IS", "income_statement");

// --- exhaustive same-tier collision check across the whole 0000-9999 space ---
const TIER = { EXACT_FULL_CODE: 1, BASE_GL_CODE: 2, GL_CODE_SET: 2, NUMERIC_RANGE: 3 };
function claimsBase(rule, base) {
  if (rule.role === "current_period_earnings") return false;
  switch (rule.matchType) {
    case "BASE_GL_CODE": return rule.baseCode === base;
    case "GL_CODE_SET": return rule.accounts.includes(base);
    case "NUMERIC_RANGE": return Number(base) >= rule.from && Number(base) <= rule.to;
    case "EXACT_FULL_CODE": return rule.fullCode.split("-")[0] === base;
    default: return false;
  }
}
const all = [...bs, ...is];
const collisions = [];
for (let n = 0; n < 10000; n++) {
  const base = String(n).padStart(4, "0");
  const hits = all.filter((r) => claimsBase(r, base) && r.matchType !== "EXACT_FULL_CODE");
  if (hits.length < 2) continue;
  const best = Math.min(...hits.map((r) => TIER[r.matchType]));
  const top = hits.filter((r) => TIER[r.matchType] === best);
  const distinct = new Set(top.map((r) => `${r.statement}|${r.statementLine}|${r.excluded}`));
  if (distinct.size > 1) collisions.push({ base, rules: top.map((r) => `${r.id}(${r.statementLine})`) });
}

console.log(`BS rules: ${bs.length}`);
console.log(`IS rules: ${is.length}`);
console.log(`same-tier collisions: ${collisions.length}`);
for (const c of collisions) console.log("  COLLISION", c.base, c.rules.join(" vs "));
if (collisions.length) {
  console.error("\nRefusing to emit a mapping table with unresolved collisions.");
  process.exit(1);
}

function serialise(rule) {
  const parts = [
    `id: ${JSON.stringify(rule.id)}`,
    `statement: ${JSON.stringify(rule.statement)}`,
    `matchType: ${JSON.stringify(rule.matchType)}`,
  ];
  if (rule.fullCode) parts.push(`fullCode: ${JSON.stringify(rule.fullCode)}`);
  if (rule.baseCode) parts.push(`baseCode: ${JSON.stringify(rule.baseCode)}`);
  if (rule.accounts) parts.push(`accounts: [${rule.accounts.map((a) => JSON.stringify(a)).join(", ")}]`);
  if (rule.from != null) parts.push(`from: ${rule.from}`, `to: ${rule.to}`);
  parts.push(
    `category: ${JSON.stringify(rule.category)}`,
    `section: ${JSON.stringify(rule.section)}`,
    `statementLine: ${JSON.stringify(rule.statementLine)}`,
    `status: "active"`,
    `excluded: ${rule.excluded}`
  );
  if (rule.excluded) {
    parts.push(
      `exclusionReason: ${JSON.stringify(
        `Legacy master (${rule.statement === "balance_sheet" ? "BS" : "IS"} row ${rule.legacyRow}) marked this account ignored.`
      )}`
    );
  }
  if (rule.role) parts.push(`role: ${JSON.stringify(rule.role)}`);
  parts.push(`source: ${JSON.stringify(rule.legacyRow == null ? "user" : "legacy_master")}`);
  const note = rule.note ?? (rule.legacyRow == null ? null : `Legacy master row ${rule.legacyRow}.`);
  if (note) parts.push(`notes: ${JSON.stringify(note)}`);
  return `  { ${parts.join(", ")} },`;
}

function emit(file, constName, rules, blurb) {
  const body = `/**
 * ${blurb}
 *
 * GENERATED by scripts/migrate-legacy-fs-mappings.mjs from the legacy
 * ExcelReport-Master workbook. Reviewed and checked in — this file, not the
 * workbook, is what the engine reads. No legacy wildcard syntax survives here.
 *
 * Edit through the GL Mapping screen, or regenerate and re-review.
 */

import type { MappingRule } from "../types";

export const ${constName}: readonly MappingRule[] = [
${rules.map(serialise).join("\n")}
];
`;
  writeFileSync(join(ROOT, file), body);
  console.log(`wrote ${file} (${rules.length} rules)`);
}

emit("lib/financial-statements/config/balanceSheetMappings.ts", "BALANCE_SHEET_MAPPINGS", bs,
  "Balance Sheet GL mapping table.");
emit("lib/financial-statements/config/incomeStatementMappings.ts", "INCOME_STATEMENT_MAPPINGS", is,
  "Income Statement GL mapping table.");
