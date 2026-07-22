/**
 * NAAF / CRQ field extraction — spec 5.
 *
 * Extraction only ever PRE-FILLS the verification screen; it never decides
 * anything. A human confirms every value before a single rule runs, so the cost
 * of a blank field here is a few seconds of typing, while the cost of a wrong
 * guess is a reviewer rubber-stamping bad data. Everything below is therefore
 * biased hard toward returning null.
 *
 * Field-name patterns are matched loosely because the fillable exports of these
 * forms are not guaranteed to use stable field names across versions. Any value
 * that does not resolve to the exact vocabulary in ./vocab is discarded.
 */

import { blankCrq, blankNaaf } from "./blank";
import type { PdfReadResult } from "./pdf";
import type { CrqData, ExtractionResult, NaafData, SourceMap } from "./types";
import { assessTextLayer, detectCrqVersion, isSaneClientId } from "./validate";
import {
  CRQ_INCOME_BANDS,
  CRQ_RISK_RANKINGS,
  MAX_PLANS,
  NAAF_INCOME_BANDS,
  NAAF_RISK_TOLERANCES,
  NAAF_TIME_HORIZONS,
} from "./vocab";

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Find the first AcroForm field whose name matches every token in a pattern. */
function findField(
  fields: Record<string, string>,
  tokens: string[][]
): string | null {
  for (const group of tokens) {
    for (const [name, value] of Object.entries(fields)) {
      const n = norm(name);
      if (group.every((t) => n.includes(t)) && value.trim() !== "") {
        return value.trim();
      }
    }
  }
  return null;
}

/** Resolve a raw string to a member of a controlled vocabulary, or null. */
function matchEnum<T extends string>(
  raw: string | null,
  options: readonly T[]
): T | null {
  if (!raw) return null;
  const target = norm(raw);
  if (!target) return null;
  // Exact normalized match only — "Medium" must never absorb "Medium to High".
  return options.find((o) => norm(o) === target) ?? null;
}

/** Pull a labelled value out of reconstructed text, e.g. "Client ID: 12345". */
function findLabelled(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const re = new RegExp(
      `${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[:\\-]?\\s*([^\\n]{1,60})`,
      "i"
    );
    const m = text.match(re);
    const value = m?.[1]?.trim();
    if (value) return value;
  }
  return null;
}

const markParsed = (sources: SourceMap, key: string, hit: boolean): void => {
  sources[key] = hit ? "parsed" : "manual";
};

/**
 * Every field starts life as "manual"; extraction upgrades the ones it can
 * prove. The verification screen highlights whatever is still manual.
 */
function allManual(keys: string[]): SourceMap {
  const map: SourceMap = {};
  for (const k of keys) map[k] = "manual";
  return map;
}

const NAAF_KEYS = [
  "naaf_form_type",
  "naaf_client_id",
  "naaf_client_name",
  "naaf_is_joint",
  "naaf_income_band",
  "naaf_net_worth",
  "naaf_advisor_name",
  "naaf_rep_code",
  "naaf_dealer_code",
];

const CRQ_KEYS = [
  "crq_version",
  "crq_client_id",
  "crq_client_name",
  "crq_income_band",
  "crq_risk_capacity_total",
  "crq_risk_tolerance_total",
  "crq_checked_risk_ranking",
  "crq_advisor_name",
];

// ---------------------------------------------------------------------------
// NAAF
// ---------------------------------------------------------------------------

export function extractNaaf(read: PdfReadResult): ExtractionResult<NaafData> {
  const data = blankNaaf();
  const sources = allManual(NAAF_KEYS);
  const warnings: string[] = [];

  const verdict = assessTextLayer(read.text, "naaf");
  if (!verdict.usable) {
    // Spec 5.2/5.3: an untrustworthy text layer is treated as no text layer.
    return { mode: "manual", data, sources, warnings: [verdict.reason], pageCount: read.pageCount };
  }

  const { fields, text } = read;

  // --- Section A -----------------------------------------------------------
  const clientId =
    findField(fields, [["client", "id"], ["clienta", "id"], ["accountid"]]) ??
    findLabelled(text, ["Client ID", "Client Number", "Account Number"]);
  if (clientId && isSaneClientId(clientId)) {
    data.naaf_client_id = clientId;
    markParsed(sources, "naaf_client_id", true);
  }

  const surname = findField(fields, [["surname"], ["lastname"]]);
  const firstName = findField(fields, [["firstname"], ["givenname"]]);
  if (surname || firstName) {
    data.naaf_client_name = [surname, firstName].filter(Boolean).join(", ").trim();
    markParsed(sources, "naaf_client_name", true);
  } else {
    const named = findLabelled(text, ["Client Name", "Account Holder Name"]);
    if (named) {
      data.naaf_client_name = named;
      markParsed(sources, "naaf_client_name", true);
    }
  }

  // Section B only exists on a joint account, so its presence is the signal.
  const clientBSurname = findField(fields, [["clientb", "surname"], ["joint", "surname"]]);
  if (clientBSurname) {
    data.naaf_is_joint = true;
    data.naaf_client_b_name = clientBSurname;
    data.naaf_client_signatures = [
      { signature_present: false, date_present: false },
      { signature_present: false, date_present: false },
    ];
    markParsed(sources, "naaf_is_joint", true);
  }

  // --- Section C -----------------------------------------------------------
  const income = matchEnum(
    findField(fields, [["income"], ["approximateincome"]]),
    NAAF_INCOME_BANDS
  );
  if (income) {
    data.naaf_income_band = income;
    markParsed(sources, "naaf_income_band", true);
  }

  const netWorth = findField(fields, [["networth"], ["totalnetworth"]]);
  if (netWorth) {
    data.naaf_net_worth = netWorth;
    markParsed(sources, "naaf_net_worth", true);
  }

  // --- Investment plans ----------------------------------------------------
  // Field naming across plan blocks is the least stable part of these exports,
  // so a plan is only pre-filled when both of its enum values resolve exactly.
  for (let i = 1; i <= MAX_PLANS; i++) {
    const plan = data.naaf_plans[i - 1];
    plan.risk_tolerance_new = matchEnum(
      findField(fields, [[`plan${i}`, "risk", "new"], [`risktolerance${i}new`]]),
      NAAF_RISK_TOLERANCES
    );
    plan.risk_tolerance_current = matchEnum(
      findField(fields, [[`plan${i}`, "risk", "current"], [`risktolerance${i}current`]]),
      NAAF_RISK_TOLERANCES
    );
    plan.time_horizon_new = matchEnum(
      findField(fields, [[`plan${i}`, "horizon", "new"], [`timehorizon${i}new`]]),
      NAAF_TIME_HORIZONS
    );
    plan.time_horizon_current = matchEnum(
      findField(fields, [[`plan${i}`, "horizon", "current"], [`timehorizon${i}current`]]),
      NAAF_TIME_HORIZONS
    );
  }

  // --- Section R -----------------------------------------------------------
  const repCode = findField(fields, [["repcode"], ["rep", "code"]]);
  if (repCode) {
    data.naaf_rep_code = repCode;
    markParsed(sources, "naaf_rep_code", true);
  }
  const dealerCode = findField(fields, [["dealercode"], ["dealer", "code"]]);
  if (dealerCode) {
    data.naaf_dealer_code = dealerCode;
    markParsed(sources, "naaf_dealer_code", true);
  }
  const advisorName = findField(fields, [["advisor", "name"], ["advisorsname"]]);
  if (advisorName) {
    data.naaf_advisor_name = advisorName;
    markParsed(sources, "naaf_advisor_name", true);
  }

  const parsedCount = Object.values(sources).filter((s) => s === "parsed").length;
  if (parsedCount === 0) {
    warnings.push(
      "This NAAF has a readable text layer, but none of the expected fields could be matched. Enter the fields manually."
    );
    return { mode: "manual", data, sources, warnings, pageCount: read.pageCount };
  }

  warnings.push(
    "Signatures, dates, and checkbox sections cannot be read reliably from a PDF and are never pre-filled. Confirm every field against the page images."
  );

  return { mode: "parsed", data, sources, warnings, pageCount: read.pageCount };
}

// ---------------------------------------------------------------------------
// CRQ
// ---------------------------------------------------------------------------

/** Score totals are advisor-entered integers; reject anything out of range. */
function parseScore(raw: string | null): number | null {
  if (!raw) return null;
  const m = raw.replace(/[^0-9-]/g, "");
  if (!m) return null;
  const n = Number.parseInt(m, 10);
  if (!Number.isFinite(n) || n < 0 || n > 200) return null;
  return n;
}

export function extractCrq(read: PdfReadResult): ExtractionResult<CrqData> {
  const data = blankCrq();
  const sources = allManual(CRQ_KEYS);
  const warnings: string[] = [];

  const verdict = assessTextLayer(read.text, "crq");
  if (!verdict.usable) {
    return { mode: "manual", data, sources, warnings: [verdict.reason], pageCount: read.pageCount };
  }

  const { fields, text } = read;

  const version = detectCrqVersion(read.text);
  if (version) {
    data.crq_version = version;
    markParsed(sources, "crq_version", true);
  }

  const clientId =
    findField(fields, [["client", "id"], ["accountid"]]) ??
    findLabelled(text, ["Client ID", "Client Number"]);
  if (clientId && isSaneClientId(clientId)) {
    data.crq_client_id = clientId;
    markParsed(sources, "crq_client_id", true);
  }

  const clientName =
    findField(fields, [["client", "name"], ["entity", "name"], ["surname"]]) ??
    findLabelled(text, ["Client Name", "Entity Name"]);
  if (clientName) {
    data.crq_client_name = clientName;
    markParsed(sources, "crq_client_name", true);
  }

  const income = matchEnum(findField(fields, [["income"], ["q3"]]), CRQ_INCOME_BANDS);
  if (income) {
    data.crq_income_band = income;
    markParsed(sources, "crq_income_band", true);
  }

  const capacity = parseScore(
    findField(fields, [["riskcapacity", "total"], ["capacity", "score"]])
  );
  if (capacity !== null) {
    data.crq_risk_capacity_total = capacity;
    markParsed(sources, "crq_risk_capacity_total", true);
  }

  const tolerance = parseScore(
    findField(fields, [["risktolerance", "total"], ["tolerance", "score"]])
  );
  if (tolerance !== null) {
    data.crq_risk_tolerance_total = tolerance;
    markParsed(sources, "crq_risk_tolerance_total", true);
  }

  const ranking = matchEnum(
    findField(fields, [["riskranking"], ["ranking"], ["finalrisk"]]),
    CRQ_RISK_RANKINGS
  );
  if (ranking) {
    data.crq_checked_risk_ranking = ranking;
    markParsed(sources, "crq_checked_risk_ranking", true);
  }

  const advisorName = findField(fields, [["advisor", "name"]]);
  if (advisorName) {
    data.crq_advisor_name = advisorName;
    markParsed(sources, "crq_advisor_name", true);
  }

  const parsedCount = Object.values(sources).filter((s) => s === "parsed").length;
  if (parsedCount === 0) {
    warnings.push(
      "This CRQ has a readable text layer, but none of the expected fields could be matched. Enter the fields manually."
    );
    return { mode: "manual", data, sources, warnings, pageCount: read.pageCount };
  }

  warnings.push(
    "Signatures and dates cannot be read reliably from a PDF and are never pre-filled. Confirm every field against the page images."
  );

  return { mode: "parsed", data, sources, warnings, pageCount: read.pageCount };
}
