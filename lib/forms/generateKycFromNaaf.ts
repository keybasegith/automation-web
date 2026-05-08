import type {
  ExtractedNAAFData,
  FieldSource,
  KycDraft,
  KycField,
  KycFields,
  NaafFields,
} from "@/lib/forms/types";

function emptyKycFields(): KycFields {
  return {
    clientFullName: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    address: "",
    accountType: "",
    employmentStatus: "",
    occupation: "",
    annualIncome: "",
    totalNetWorth: "",
    liquidNetWorth: "",
    investmentKnowledge: "",
    investmentObjective: "",
    riskTolerance: "",
    timeHorizon: "",
    liquidityNeeds: "",
    sourceOfFunds: "",
    advisorName: "",
    advisorCode: "",
    completedDate: "",
  };
}

const NAAF_TO_KYC_MAP: Record<KycField, keyof NaafFields> = {
  clientFullName: "fullName",
  dateOfBirth: "dateOfBirth",
  email: "email",
  phone: "phone",
  address: "address",
  accountType: "accountType",
  employmentStatus: "employmentStatus",
  occupation: "occupation",
  annualIncome: "annualIncome",
  totalNetWorth: "totalNetWorth",
  liquidNetWorth: "liquidNetWorth",
  investmentKnowledge: "investmentKnowledge",
  investmentObjective: "investmentObjective",
  riskTolerance: "riskTolerance",
  timeHorizon: "timeHorizon",
  liquidityNeeds: "liquidityNeeds",
  sourceOfFunds: "sourceOfFunds",
  advisorName: "advisorName",
  advisorCode: "advisorCode",
  completedDate: "dateCompleted",
};

const REQUIRED_KYC_FIELDS: readonly KycField[] = [
  "clientFullName",
  "dateOfBirth",
  "accountType",
  "advisorName",
  "investmentObjective",
  "riskTolerance",
  "timeHorizon",
  "investmentKnowledge",
];

export function generateKycFromNaaf(naaf: ExtractedNAAFData): KycDraft {
  const fields = emptyKycFields();
  const fieldSourceMap: Partial<Record<KycField, FieldSource>> = {};

  for (const kycField of Object.keys(NAAF_TO_KYC_MAP) as KycField[]) {
    const naafField = NAAF_TO_KYC_MAP[kycField];
    const value = naaf.fields[naafField];
    if (value && value.trim() !== "") {
      fields[kycField] = value;
      fieldSourceMap[kycField] = "auto_filled_from_naaf";
    } else {
      fieldSourceMap[kycField] = "missing";
    }
  }

  const missingFields = REQUIRED_KYC_FIELDS.filter(
    (f) => !fields[f] || fields[f].trim() === ""
  );

  return {
    fields,
    fieldSourceMap,
    missingFields,
    ready: false,
  };
}

export function isKycReady(draft: KycDraft): boolean {
  return REQUIRED_KYC_FIELDS.every(
    (f) => draft.fields[f] && draft.fields[f].trim() !== ""
  );
}
