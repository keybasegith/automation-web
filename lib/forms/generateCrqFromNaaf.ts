import type {
  CrqDraft,
  CrqField,
  CrqFields,
  ExtractedNAAFData,
  FieldSource,
} from "@/lib/forms/types";
import { CRQ_SUBJECTIVE_FIELDS } from "@/lib/forms/types";

function emptyCrqFields(): CrqFields {
  return {
    clientFullName: "",
    accountType: "",
    accountNumber: "",
    advisorName: "",
    advisorCode: "",
    date: "",
    riskTolerance: "",
    investmentObjective: "",
    timeHorizon: "",
    investmentKnowledge: "",
    comfortWithLoss: "",
    reactionToMarketDrop: "",
    primaryInvestmentGoal: "",
    liquidityNeeds: "",
    investmentExperience: "",
    capacityForLoss: "",
    fundsNeededWithin: "",
    volatilityComfort: "",
    incomeNeed: "",
    capitalPreservationNeed: "",
  };
}

/**
 * Safe administrative direct mappings — these can be auto-filled with
 * confidence because they are factual not subjective.
 */
const SAFE_DIRECT_MAP: Partial<Record<CrqField, keyof ExtractedNAAFData["fields"]>> = {
  clientFullName: "fullName",
  accountType: "accountType",
  accountNumber: "accountNumber",
  advisorName: "advisorName",
  advisorCode: "advisorCode",
  date: "dateCompleted",
};

/**
 * Subjective fields where the SAME label exists in NAAF. We will populate but
 * always tag as "Suggested, needs review" so the advisor confirms with the
 * client. Anything else stays blank.
 */
const SUBJECTIVE_DIRECT_MAP: Partial<Record<CrqField, keyof ExtractedNAAFData["fields"]>> = {
  riskTolerance: "riskTolerance",
  investmentObjective: "investmentObjective",
  timeHorizon: "timeHorizon",
  investmentKnowledge: "investmentKnowledge",
  liquidityNeeds: "liquidityNeeds",
  investmentExperience: "investmentExperience",
};

const REQUIRED_CRQ_FIELDS: readonly CrqField[] = [
  "clientFullName",
  "accountType",
  "advisorName",
  "comfortWithLoss",
  "primaryInvestmentGoal",
  "fundsNeededWithin",
  "capacityForLoss",
];

export function generateCrqFromNaaf(naaf: ExtractedNAAFData): CrqDraft {
  const fields = emptyCrqFields();
  const fieldSourceMap: Partial<Record<CrqField, FieldSource>> = {};
  const needsClientConfirmationFields: CrqField[] = [];

  // Initialise every subjective field as missing so the UI knows to surface
  // the warning banner the advisor must read before completing the CRQ.
  for (const f of CRQ_SUBJECTIVE_FIELDS) {
    fieldSourceMap[f] = "missing";
  }

  // 1. Safe administrative copy.
  for (const crqField of Object.keys(SAFE_DIRECT_MAP) as CrqField[]) {
    const naafField = SAFE_DIRECT_MAP[crqField]!;
    const value = naaf.fields[naafField];
    if (value && value.trim() !== "") {
      fields[crqField] = value;
      fieldSourceMap[crqField] = "auto_filled_from_naaf";
    } else {
      fieldSourceMap[crqField] = "missing";
    }
  }

  // 2. Subjective overlap. Populated but tagged for advisor review.
  for (const crqField of Object.keys(SUBJECTIVE_DIRECT_MAP) as CrqField[]) {
    const naafField = SUBJECTIVE_DIRECT_MAP[crqField]!;
    const value = naaf.fields[naafField];
    if (value && value.trim() !== "") {
      fields[crqField] = value;
      fieldSourceMap[crqField] = "suggested_needs_review";
      needsClientConfirmationFields.push(crqField);
    }
  }

  const missingFields = REQUIRED_CRQ_FIELDS.filter(
    (f) => !fields[f] || fields[f].trim() === ""
  );

  return {
    fields,
    fieldSourceMap,
    missingFields,
    needsClientConfirmationFields,
    ready: false,
  };
}

export function isCrqReady(draft: CrqDraft): boolean {
  return REQUIRED_CRQ_FIELDS.every(
    (f) => draft.fields[f] && draft.fields[f].trim() !== ""
  );
}
