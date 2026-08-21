/**
 * NAAF / KYC / CRQ field extraction — spec 5.
 *
 * Extraction only ever PRE-FILLS the verification screen; it never decides
 * anything. A human confirms every value before a single rule runs, so the cost
 * of a blank field here is a few seconds of typing, while the cost of a wrong
 * guess is a reviewer rubber-stamping bad data. Everything below is therefore
 * biased hard toward returning null.
 *
 * FIELD NAMES ARE MEASURED, NOT GUESSED. Every name below was read out of the
 * real fillable forms committed to /public:
 *   - form-NAAF.pdf  V3-NAAF-2022, 4 pages, 365 AcroForm fields
 *   - form-KYC.pdf   Know Your Client Update, 3 pages, 275 fields
 *   - crq-individualaccountholder.pdf / -jointaccountholders.pdf /
 *     -corporateaccounts.pdf   v2-crq25, 3 pages, 57-61 fields
 *
 * Three measurements drive the shape of this file, and each one contradicts the
 * obvious guess:
 *
 *  1. NAAF and KYC share 255 of their 275 field names, so they are ONE code
 *     path. Only the printed section lettering differs, plus the KYC having no
 *     Outside Business Activities block at all.
 *
 *  2. Enumerated answers export an INDEX, not a label. `nIncome` yields "0".."7"
 *     and `RR1` yields "1".."5" — note the differing base. Matching these
 *     against the printed vocabulary as strings can never succeed, which is why
 *     every enum on a typed form used to extract as null.
 *
 *  3. On the plan block, `{n}PRiskTolerence_*_Per` is the CURRENT column and the
 *     `zper_*` mirrors are the NEW one — the reverse of what the names suggest.
 *     Confirmed by widget x-coordinates against the printed "Current | New"
 *     header. Getting this backwards would silently feed the wrong risk number
 *     to X2, the one rule that produces a serious finding.
 */

import { blankCrq, blankNaaf, blankAllocation } from "./blank";
import type { PdfReadResult } from "./pdf";
import type {
  CrqData,
  ExtractionResult,
  NaafData,
  RiskAllocation,
  SourceMap,
} from "./types";
import { assessTextLayer, detectCrqVersion, isSaneClientId } from "./validate";
import {
  CRQ_INCOME_BANDS_BY_VERSION,
  CRQ_RISK_RANKINGS,
  MAX_PLANS,
  NAAF_INCOME_BANDS,
  NAAF_RISK_TOLERANCES,
  NAAF_TIME_HORIZONS,
  docLabel,
  type CrqFormVersion,
  type DocKind,
  type NaafRiskTolerance,
} from "./vocab";

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Exact (normalized) field lookup. Returns null for absent or empty. */
function field(fields: Record<string, string>, ...names: string[]): string | null {
  for (const name of names) {
    const target = norm(name);
    for (const [key, value] of Object.entries(fields)) {
      if (norm(key) === target && value.trim() !== "") return value.trim();
    }
  }
  return null;
}

/** Is any field whose name matches `re` filled in? Used for signature blocks. */
function anyFilled(fields: Record<string, string>, re: RegExp): boolean {
  for (const [name, value] of Object.entries(fields)) {
    if (re.test(name) && value.trim() !== "") return true;
  }
  return false;
}

/**
 * Resolve an index-valued button field against a printed vocabulary.
 *
 * `base` is the export value of the FIRST printed option: 0 on the NAAF/KYC
 * (`nIncome`, `{n}PLiquidity`) and 1 on the CRQ (`5a`, `RR1`). Out-of-range
 * indices resolve to null rather than to a neighbouring option.
 */
function pickIndexed<T extends string>(
  raw: string | null,
  options: readonly T[],
  base: 0 | 1
): T | null {
  if (raw === null) return null;
  if (!/^\d+$/.test(raw.trim())) return null;
  const index = Number.parseInt(raw.trim(), 10) - base;
  return index >= 0 && index < options.length ? options[index] : null;
}

/** Percentages are advisor-entered; reject anything outside 0-100. */
function parsePercent(raw: string | null): number | null {
  if (raw === null) return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

/** Score totals are advisor-entered integers; reject anything out of range. */
function parseScore(raw: string | null): number | null {
  if (raw === null) return null;
  const cleaned = raw.replace(/[^0-9-]/g, "");
  if (!cleaned) return null;
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) && n >= 0 && n <= 200 ? n : null;
}

/**
 * Record where a value came from. `origin` is "acroform" for a fillable form and
 * "ocr" for a flattened one read off its page image — the verification screen
 * marks the two differently because only one of them can be misread.
 */
const mark = (sources: SourceMap, key: string, origin: FieldOrigin): void => {
  sources[key] = origin === "ocr" ? "ocr" : "parsed";
};

export type FieldOrigin = "acroform" | "ocr";

/**
 * Every field starts life as "manual"; extraction upgrades the ones it can
 * prove. The verification screen highlights whatever is still manual.
 */
function allManual(keys: readonly string[]): SourceMap {
  const map: SourceMap = {};
  for (const k of keys) map[k] = "manual";
  return map;
}

const NAAF_KEYS = [
  "naaf_client_id",
  "naaf_client_name",
  "naaf_is_joint",
  "naaf_income_band",
  "naaf_net_worth",
  "naaf_tcp",
  "naaf_oba_description",
  "naaf_oba_not_applicable",
  "naaf_oba_primary_initials",
  "naaf_oba_joint_initials",
  "naaf_client_signatures",
  "naaf_advisor_name",
  "naaf_advisor_signature_present",
  "naaf_rep_code",
  "naaf_dealer_code",
  "naaf_plans",
] as const;

const CRQ_KEYS = [
  "crq_form_version",
  "crq_version",
  "crq_client_id",
  "crq_client_name",
  "crq_income_band",
  "crq_risk_capacity_total",
  "crq_risk_tolerance_total",
  "crq_checked_risk_ranking",
  "crq_advisor_name",
  "crq_client_signature_present",
  "crq_advisor_date_present",
] as const;

// ---------------------------------------------------------------------------
// Plan block field names
// ---------------------------------------------------------------------------

/**
 * Per-band field tokens. `current` spells out the band inside the
 * `{n}PRiskTolerence_<token>_Per` name; `new` is the short token used by the
 * `zper_*` mirrors.
 */
const RISK_BAND_TOKENS: Record<NaafRiskTolerance, { current: string; next: string }> = {
  Low: { current: "Low", next: "l" },
  "Low to Medium": { current: "LM", next: "lm" },
  Medium: { current: "Medium", next: "m" },
  "Medium to High": { current: "MH", next: "mh" },
  High: { current: "High", next: "h" },
};

/**
 * Candidate names for one band of the NEW risk column.
 *
 * The `zper_*` mirrors are named inconsistently — plan 1 is bare `zper_l` on the
 * NAAF but `1zper_l` on the KYC, and the KYC's third block mixes `3zper_l` with
 * `3zper_lm_c`. Every candidate below still carries either the right leading
 * plan digit or the right trailing block suffix, so no candidate can resolve to
 * a different plan's box.
 */
function newRiskNames(planIndex: number, token: string): string[] {
  const suffix = planIndex === 2 ? "_b" : planIndex === 3 ? "_c" : "";
  const names = [`${planIndex}zper_${token}`];
  if (suffix) {
    names.push(`${planIndex}zper_${token}${suffix}`, `zper_${token}${suffix}`);
  } else {
    names.push(`zper_${token}`);
  }
  return names;
}

/** The New time-horizon column: six separate checkboxes, one per printed range. */
function newHorizonNames(planIndex: number, optionIndex: number): string[] {
  const suffix = planIndex === 2 ? "_b" : planIndex === 3 ? "_c" : "";
  return [`zli${optionIndex}${suffix}`];
}

function readAllocation(
  fields: Record<string, string>,
  planIndex: number,
  column: "current" | "next"
): RiskAllocation {
  const alloc = blankAllocation();
  for (const band of NAAF_RISK_TOLERANCES) {
    const tokens = RISK_BAND_TOKENS[band];
    const raw =
      column === "current"
        ? field(fields, `${planIndex}PRiskTolerence_${tokens.current}_Per`)
        : field(fields, ...newRiskNames(planIndex, tokens.next));
    alloc[band] = parsePercent(raw);
  }
  return alloc;
}

// ---------------------------------------------------------------------------
// NAAF / KYC
// ---------------------------------------------------------------------------

/**
 * Which of the two client-side forms is this? The field names are all but
 * identical, so the printed wording is the only discriminator.
 *
 * The title alone is not enough. A flattened submission — the form filled, then
 * exported to a flat PDF — commonly keeps the body text but loses the header,
 * which is part of the page image. Such a file has no "Know Your Client Update"
 * anywhere in its text layer while still being one, so the SECTION HEADINGS are
 * consulted next: their letters differ between the two forms, which makes any
 * single one of them decisive.
 *
 * Matched against a whitespace-collapsed haystack rather than a stripped one,
 * because the section letter has to stay attached to its heading: strip the
 * punctuation and the ordinary sentence "...the Trusted Contact Person" starts
 * matching the KYC's "E. Trusted Contact Person".
 *
 * Defaults to NAAF, the stricter of the two: a NAAF read as a KYC would skip
 * the Outside Business Activities rule entirely, which is a missed deficiency.
 * A KYC read as a NAAF at worst raises one finding the reviewer can dismiss —
 * and the reviewer can correct the document type on the verification screen.
 */
/**
 * Signals that identify a revision, verified against every document we hold:
 * the two blank fillable forms, a flattened KYC, and a flattened V3-OB-2022.
 *
 * "New Account Application Form" is NOT among them, and its absence is the
 * point. That phrase appears in the body of the V3-OB-2022 onboarding form as
 * well as on the NAAF, so keying off it identified an unrelated revision as a
 * NAAF and quoted its section letters — which are shifted by several places on
 * that form — into a deficiency email.
 *
 * Titles are matched against a whitespace-STRIPPED haystack because the KYC's
 * header comes out of the text layer as "Know Your Client U pdate". Section
 * headings are matched against a merely collapsed one, so the letter stays
 * attached: strip the punctuation and the ordinary sentence "...the Trusted
 * Contact Person" starts matching the KYC's "E. Trusted Contact Person".
 */
const STRIPPED_SIGNALS: Array<[string, DocKind]> = [
  ["knowyourclientupdate", "KYC"],
  ["v3naaf2022", "NAAF"],
];

const SPACED_SIGNALS: Array<[RegExp, DocKind]> = [
  // Section headings unique to one revision.
  [/Know Your Client Information/i, "KYC"],
  [/\bE\.\s*Trusted Contact Person/i, "KYC"],
  [/\bF\.\s*Authorization/i, "KYC"],
  [/\bI\.\s*Trusted Contact Person/i, "NAAF"],
  [/\bL\.\s*Financial Advisor Outside Business Activities/i, "NAAF"],
  [/\bM\.\s*Account Agreement/i, "NAAF"],
];

/**
 * Which revision of the client-side form is this — or null when it is one this
 * tool has not been taught.
 *
 * Null rather than a best guess. An unrecognised revision has different section
 * lettering and a different page layout, so guessing costs the reviewer both a
 * wrong section reference in the advisor's email and a pre-fill read from the
 * wrong places on the page. Neither failure looks like a failure.
 */
export function detectDocKind(text: string): DocKind | null {
  const stripped = norm(text);
  for (const [needle, kind] of STRIPPED_SIGNALS) {
    if (stripped.includes(needle)) return kind;
  }
  const spaced = text.replace(/\s+/g, " ");
  for (const [pattern, kind] of SPACED_SIGNALS) {
    if (pattern.test(spaced)) return kind;
  }
  return null;
}

export function extractNaaf(
  read: PdfReadResult,
  origin: FieldOrigin = "acroform"
): ExtractionResult<NaafData> {
  const kind = detectDocKind(read.text);
  const data = blankNaaf(kind);
  const sources = allManual(NAAF_KEYS);
  const warnings: string[] = [];

  const verdict = assessTextLayer(read.text, "naaf");
  if (!verdict.usable) {
    // Spec 5.2/5.3: an untrustworthy text layer is treated as no text layer.
    return { mode: "manual", data, sources, warnings: [verdict.reason], pageCount: read.pageCount };
  }

  const { fields } = read;

  // --- Section A: identity -------------------------------------------------
  const clientId = field(fields, "CCode");
  if (clientId && isSaneClientId(clientId)) {
    data.naaf_client_id = clientId;
    mark(sources, "naaf_client_id", origin);
  }

  const surname = field(fields, "txtLastName");
  const firstName = field(fields, "txtFirstName");
  if (surname || firstName) {
    data.naaf_client_name = [surname, firstName].filter(Boolean).join(", ");
    mark(sources, "naaf_client_name", origin);
  }

  // Section B only exists on a joint account, so its presence is the signal.
  const jointSurname = field(fields, "11Joint_Surname");
  const jointFirst = field(fields, "11Joint_Name");
  if (jointSurname || jointFirst) {
    data.naaf_is_joint = true;
    data.naaf_client_b_name = [jointSurname, jointFirst].filter(Boolean).join(", ");
    data.naaf_client_signatures = [
      { signature_present: false, date_present: false },
      { signature_present: false, date_present: false },
    ];
    mark(sources, "naaf_is_joint", origin);
  }

  // --- Section C: KYC figures ----------------------------------------------
  const income = pickIndexed(field(fields, "nIncome"), NAAF_INCOME_BANDS, 0);
  if (income) {
    data.naaf_income_band = income;
    mark(sources, "naaf_income_band", origin);
  }

  const netWorth = field(fields, "txtTotalAsset");
  if (netWorth) {
    data.naaf_net_worth = netWorth;
    mark(sources, "naaf_net_worth", origin);
  }

  // --- Investment plans ----------------------------------------------------
  let anyPlanParsed = false;
  for (let i = 1; i <= MAX_PLANS; i++) {
    const plan = data.naaf_plans[i - 1];
    plan.plan_id = field(fields, `${i}PlanID`) ?? "";
    plan.risk_allocation_current = readAllocation(fields, i, "current");
    plan.risk_allocation_new = readAllocation(fields, i, "next");

    plan.time_horizon_current = pickIndexed(
      field(fields, `${i}PLiquidity`),
      NAAF_TIME_HORIZONS,
      0
    );

    // The New column is six checkboxes; the checked one's position is the answer.
    plan.time_horizon_new = null;
    for (let option = 1; option <= NAAF_TIME_HORIZONS.length; option++) {
      if (field(fields, ...newHorizonNames(i, option))) {
        plan.time_horizon_new = NAAF_TIME_HORIZONS[option - 1];
        break;
      }
    }

    if (
      plan.plan_id ||
      plan.time_horizon_current ||
      plan.time_horizon_new ||
      NAAF_RISK_TOLERANCES.some(
        (b) =>
          plan.risk_allocation_current[b] !== null ||
          plan.risk_allocation_new[b] !== null
      )
    ) {
      anyPlanParsed = true;
    }
  }
  if (anyPlanParsed) mark(sources, "naaf_plans", origin);

  // --- Trusted Contact Person ----------------------------------------------
  const tcp = {
    surname: field(fields, "1TrustedContactPersonLastName") ?? "",
    first_name: field(fields, "1TrustedContactPersonFirstName") ?? "",
    phone: field(fields, "1TrustedContactPersonCellPhone") ?? "",
    email: field(fields, "1TrustedContactPersonEmail") ?? "",
    relationship: field(fields, "1TrustedContactPersonRelationshipStr") ?? "",
  };
  if (Object.values(tcp).some(Boolean)) {
    data.naaf_tcp = tcp;
    mark(sources, "naaf_tcp", origin);
  }

  // --- Outside Business Activities (NAAF only) -----------------------------
  // The KYC Update has no such section, so there is nothing to read or to fail.
  //
  // `zchkPage411` is the "Not Applicable" box on the Section L heading line —
  // established by geometry, not by its name: its widget sits at x=449/y=497 on
  // page 3, alongside the printed "Not Applicable" at x=459/y=497.
  // Read only when we know the form has the section and where it is.
  if (kind === "NAAF") {
    const oba = field(fields, "oba");
    if (oba) {
      data.naaf_oba_description = oba;
      mark(sources, "naaf_oba_description", origin);
    }
    if (field(fields, "zchkPage411")) {
      data.naaf_oba_not_applicable = true;
      mark(sources, "naaf_oba_not_applicable", origin);
    }
    // "Primary / Joint Account Holder's Initials", the two boxes under the
    // Section L acknowledgement. They are named sigClient*_1 — see the note on
    // signature blocks below for why that is a trap.
    const primaryInitials = field(fields, "sigClient1_1");
    const jointInitials = field(fields, "sigClient2_1");
    if (primaryInitials) {
      data.naaf_oba_primary_initials = primaryInitials;
      mark(sources, "naaf_oba_primary_initials", origin);
    }
    if (jointInitials) {
      data.naaf_oba_joint_initials = jointInitials;
      mark(sources, "naaf_oba_joint_initials", origin);
    }
  }

  // --- Client signatures ---------------------------------------------------
  // On a typed form the signature blocks are real text fields, so unlike a scan
  // they CAN be read.
  //
  // WHICH BLOCK IS THE SIGNATURE DIFFERS BY FORM, and the names actively
  // mislead. On the NAAF, `sigClient1_1` is the Section L OBA initials box
  // (page 3, y=312) and the Section M signature is `sigClient1_2` (y=157). On
  // the KYC, which has no Section L, `sigClient1_1` IS the Section F signature.
  // Scanning every `sigClient{n}_*` block would therefore read a NAAF's OBA
  // initials as a client signature and report a missing signature as present —
  // a false clean on a rule that exists to catch exactly that.
  const signatureBlock = kind === "NAAF" ? "2" : "1";
  let anySignatureParsed = false;
  data.naaf_client_signatures = data.naaf_client_signatures.map((_, index) => {
    const holder = index + 1;
    const signature_present = !!field(fields, `sigClient${holder}_${signatureBlock}`);
    const date_present = !!field(fields, `sigClientDate${holder}_${signatureBlock}`);
    if (signature_present || date_present) anySignatureParsed = true;
    return { signature_present, date_present };
  });
  if (anySignatureParsed) mark(sources, "naaf_client_signatures", origin);

  // --- Dealer / Financial Advisor ------------------------------------------
  const repCode = field(fields, "txtRepCode");
  if (repCode) {
    data.naaf_rep_code = repCode;
    mark(sources, "naaf_rep_code", origin);
  }
  const dealerCode = field(fields, "txtDealerCode");
  if (dealerCode) {
    data.naaf_dealer_code = dealerCode;
    mark(sources, "naaf_dealer_code", origin);
  }
  const advisorName = field(fields, "txtRepNameFL");
  if (advisorName) {
    data.naaf_advisor_name = advisorName;
    mark(sources, "naaf_advisor_name", origin);
  }
  data.naaf_advisor_signature_present = anyFilled(fields, /^sigAdvisor\d+_/);
  data.naaf_advisor_date_present = anyFilled(fields, /^sigAdvisorDate\d+_/);
  if (data.naaf_advisor_signature_present || data.naaf_advisor_date_present) {
    mark(sources, "naaf_advisor_signature_present", origin);
  }

  const parsedCount = Object.values(sources).filter((s) => s === "parsed").length;
  if (parsedCount === 0) {
    warnings.push(flattenedOrUnmatched(read, docLabel(kind), origin));
    return { mode: "manual", data, sources, warnings, pageCount: read.pageCount };
  }

  warnings.push(
    origin === "ocr"
      ? "This form is flattened, so the values below were read off the page image and can be misread. Tick boxes — income band, time horizon, Not Applicable — are never read that way and are left for you. Confirm every field against the pages alongside."
      : "Checkbox sections that are not pre-filled below were left blank on the form or could not be read. Confirm every field against the page images."
  );

  return { mode: "parsed", data, sources, warnings, pageCount: read.pageCount };
}

/**
 * Distinguish the two reasons a readable form yields nothing, because they call
 * for different things from the reviewer.
 *
 * A FLATTENED export has no AcroForm fields at all: the entered values are part
 * of the page image, so there is nothing to read however good the code is, and
 * the reviewer types them. A form that HAS fields but matches none of them is a
 * revision this tool has not been taught, which is a defect worth reporting.
 */
function flattenedOrUnmatched(
  read: PdfReadResult,
  formLabel: string,
  origin: FieldOrigin
): string {
  if (origin === "ocr") {
    return `This ${formLabel} is flattened and nothing could be read off the page image. Enter the fields manually from the pages alongside.`;
  }
  if (Object.keys(read.fields).length === 0) {
    return `This ${formLabel} has been flattened — the entered values are part of the page image rather than fillable form fields, so none of them can be read. Enter the fields manually from the pages alongside.`;
  }
  return `This ${formLabel} has fillable fields, but none of the expected ones could be matched — it may be a revision this tool does not know. Enter the fields manually and report the form version.`;
}

// ---------------------------------------------------------------------------
// CRQ
// ---------------------------------------------------------------------------

/**
 * All three CRQ layouts read through one path. Corporate is field-name-identical
 * to Individual; Joint adds only a second holder's name and signature. Notably
 * the Joint form still carries ONE `RR1` risk ranking, not one per holder, so a
 * single ranking is the correct model for every version.
 */
/**
 * Which printed revision of the CRQ is this?
 *
 * Both revisions stamp their code in the page footer — "crq24" and "v2-crq25" —
 * and that marker survives into the text layer, which makes it the one reliable
 * signal. Everything else about the two forms (field names included) is similar
 * enough to be indistinguishable.
 *
 * Returns null rather than guessing. A wrong version silently mis-decodes the
 * income band and mis-computes the risk ranking; a null version holds both back
 * for the reviewer, which is visible.
 */
export function detectCrqFormVersion(text: string): CrqFormVersion | null {
  const flat = norm(text);
  // Ordered: "v2crq25" also contains "crq25", never "crq24", so no overlap.
  if (flat.includes("v2crq25")) return "v2-crq25";
  if (flat.includes("crq25")) return "v2-crq25";
  if (flat.includes("crq24")) return "crq24";
  return null;
}

export function extractCrq(
  read: PdfReadResult,
  origin: FieldOrigin = "acroform"
): ExtractionResult<CrqData> {
  const data = blankCrq();
  const sources = allManual(CRQ_KEYS);
  const warnings: string[] = [];

  const verdict = assessTextLayer(read.text, "crq");
  if (!verdict.usable) {
    return { mode: "manual", data, sources, warnings: [verdict.reason], pageCount: read.pageCount };
  }

  const { fields } = read;

  const formVersion = detectCrqFormVersion(read.text);
  if (formVersion) {
    data.crq_form_version = formVersion;
    mark(sources, "crq_form_version", origin);
  }

  const version = detectCrqVersion(read.text);
  if (version) {
    data.crq_version = version;
    mark(sources, "crq_version", origin);
  }

  const clientId = field(fields, "CCode");
  if (clientId && isSaneClientId(clientId)) {
    data.crq_client_id = clientId;
    mark(sources, "crq_client_id", origin);
  }

  const clientName = field(fields, "txtNameFL");
  if (clientName) {
    data.crq_client_name = clientName;
    mark(sources, "crq_client_name", origin);
  }

  // The annual-income question is field `5a` on both revisions, but they offer
  // different bands behind it — six on crq24, eight on v2-crq25 — so the index
  // is only meaningful once the revision is known. Decoding "5" against the
  // wrong list yields a real-looking band two steps off the true answer, which
  // is worse than leaving it for the reviewer.
  if (formVersion) {
    const bands = CRQ_INCOME_BANDS_BY_VERSION[formVersion];
    const income = pickIndexed(field(fields, "5a"), bands, 1);
    if (income) {
      data.crq_income_band = income as CrqData["crq_income_band"];
      mark(sources, "crq_income_band", origin);
    }
  }

  const capacity = parseScore(field(fields, "Total1"));
  if (capacity !== null) {
    data.crq_risk_capacity_total = capacity;
    mark(sources, "crq_risk_capacity_total", origin);
  }

  const tolerance = parseScore(field(fields, "Total2"));
  if (tolerance !== null) {
    data.crq_risk_tolerance_total = tolerance;
    mark(sources, "crq_risk_tolerance_total", origin);
  }

  const ranking = pickIndexed(field(fields, "RR1"), CRQ_RISK_RANKINGS, 1);
  if (ranking) {
    data.crq_checked_risk_ranking = ranking;
    mark(sources, "crq_checked_risk_ranking", origin);
  }

  const advisorName = field(fields, "txtRepNameFL");
  if (advisorName) {
    data.crq_advisor_name = advisorName;
    mark(sources, "crq_advisor_name", origin);
  }

  data.crq_client_signature_present = anyFilled(fields, /^sigClient\d+_/);
  if (data.crq_client_signature_present) mark(sources, "crq_client_signature_present", origin);

  data.crq_advisor_date_present = anyFilled(fields, /^sigAdvisorDate\d+_/);
  if (data.crq_advisor_date_present) mark(sources, "crq_advisor_date_present", origin);

  const parsedCount = Object.values(sources).filter((s) => s === "parsed").length;
  if (parsedCount === 0) {
    warnings.push(flattenedOrUnmatched(read, "CRQ", origin));
    return { mode: "manual", data, sources, warnings, pageCount: read.pageCount };
  }

  warnings.push(
    "Checkbox sections that are not pre-filled below were left blank on the form or could not be read. Confirm every field against the page images."
  );

  return { mode: "parsed", data, sources, warnings, pageCount: read.pageCount };
}
