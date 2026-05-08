import type { ExtractedNAAFData, NaafFields } from "@/lib/forms/types";

export function emptyNaafFields(): NaafFields {
  return {
    firstName: "",
    lastName: "",
    fullName: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    country: "",
    sin: "",
    employmentStatus: "",
    employerName: "",
    occupation: "",
    annualIncome: "",
    liquidNetWorth: "",
    fixedAssets: "",
    totalNetWorth: "",
    investmentKnowledge: "",
    sourceOfFunds: "",
    accountType: "",
    accountNumber: "",
    accountPurpose: "",
    jurisdiction: "",
    currency: "",
    advisorName: "",
    advisorCode: "",
    branch: "",
    dateCompleted: "",
    investmentObjective: "",
    riskTolerance: "",
    timeHorizon: "",
    liquidityNeeds: "",
    intendedUse: "",
    investmentExperience: "",
  };
}

export const SAMPLE_KEYS = ["clean", "high_risk_mismatch", "missing_fields"] as const;
export type SampleKey = (typeof SAMPLE_KEYS)[number];

export const SAMPLE_LABELS: Record<SampleKey, string> = {
  clean: "Clean — matching KYC/CRQ",
  high_risk_mismatch: "High risk mismatch",
  missing_fields: "Missing required fields",
};

const cleanFields: NaafFields = {
  firstName: "Sarah",
  lastName: "Chen",
  fullName: "Sarah Chen",
  dateOfBirth: "1968-04-22",
  email: "sarah.chen@example.com",
  phone: "(416) 555-0143",
  address: "120 Front Street West, Apt 1402",
  city: "Toronto",
  province: "ON",
  postalCode: "M5J 2L7",
  country: "Canada",
  sin: "123-456-789",
  employmentStatus: "Employed",
  employerName: "Bayview Capital Inc.",
  occupation: "Director of Finance",
  annualIncome: "175000",
  liquidNetWorth: "650000",
  fixedAssets: "950000",
  totalNetWorth: "1600000",
  investmentKnowledge: "Good",
  sourceOfFunds: "Employment income, prior savings",
  accountType: "Non-Registered Investment",
  accountNumber: "KB-1100023",
  accountPurpose: "Long-term wealth accumulation",
  jurisdiction: "Ontario",
  currency: "CAD",
  advisorName: "Alex Park",
  advisorCode: "AP-204",
  branch: "Toronto — Yonge",
  dateCompleted: "2026-04-12",
  investmentObjective: "Growth",
  riskTolerance: "Medium",
  timeHorizon: "Long Term",
  liquidityNeeds: "Low",
  intendedUse: "Retirement savings",
  investmentExperience: "Intermediate",
};

const highRiskMismatchFields: NaafFields = {
  ...cleanFields,
  firstName: "Daniel",
  lastName: "Wright",
  fullName: "Daniel Wright",
  dateOfBirth: "1995-11-03",
  email: "daniel.wright@example.com",
  phone: "(905) 555-0188",
  address: "55 Lakeshore Boulevard, Unit 902",
  city: "Burlington",
  province: "ON",
  postalCode: "L7N 1A1",
  country: "Canada",
  sin: "987-654-321",
  occupation: "Bartender",
  employerName: "The Lakeside Tavern",
  annualIncome: "42000",
  liquidNetWorth: "8500",
  fixedAssets: "0",
  totalNetWorth: "8500",
  investmentKnowledge: "Excellent",
  sourceOfFunds: "Employment income",
  accountNumber: "KB-2200099",
  // KYC will say Aggressive Growth + High risk + Long term, but NAAF includes
  // notes from a CRQ-style answer that conflicts (low loss tolerance / short
  // window). The consistency checker will surface these.
  investmentObjective: "Aggressive Growth",
  riskTolerance: "High",
  timeHorizon: "Long Term",
  liquidityNeeds: "High",
  intendedUse: "Saving to buy a house in 18 months",
  investmentExperience: "None",
};

const missingFieldsFields: NaafFields = {
  ...emptyNaafFields(),
  firstName: "Maya",
  lastName: "Singh",
  fullName: "Maya Singh",
  email: "maya.singh@example.com",
  city: "Calgary",
  province: "AB",
  country: "Canada",
  advisorName: "Alex Park",
  advisorCode: "AP-204",
  dateCompleted: "2026-04-19",
  // Intentionally omitted: dateOfBirth, accountType, riskTolerance,
  // investmentObjective, timeHorizon, investmentKnowledge.
};

const SAMPLES: Record<SampleKey, ExtractedNAAFData> = {
  clean: {
    fields: cleanFields,
    rawText: buildSampleRawText(cleanFields),
    extractionConfidence: 0.93,
    extractionWarnings: [],
    fieldConfidenceMap: Object.fromEntries(
      Object.keys(cleanFields).map((k) => [k, 0.93])
    ) as ExtractedNAAFData["fieldConfidenceMap"],
    fieldSourceMap: Object.fromEntries(
      Object.entries(cleanFields).map(([k, v]) => [
        k,
        v ? "extracted" : "missing",
      ])
    ) as ExtractedNAAFData["fieldSourceMap"],
  },
  high_risk_mismatch: {
    fields: highRiskMismatchFields,
    rawText: buildSampleRawText(highRiskMismatchFields),
    extractionConfidence: 0.88,
    extractionWarnings: [
      "Stated long-term horizon contradicts 'within 18 months' note in intendedUse — please review.",
    ],
    fieldConfidenceMap: Object.fromEntries(
      Object.keys(highRiskMismatchFields).map((k) => [k, 0.88])
    ) as ExtractedNAAFData["fieldConfidenceMap"],
    fieldSourceMap: Object.fromEntries(
      Object.entries(highRiskMismatchFields).map(([k, v]) => [
        k,
        v ? "extracted" : "missing",
      ])
    ) as ExtractedNAAFData["fieldSourceMap"],
  },
  missing_fields: {
    fields: missingFieldsFields,
    rawText: buildSampleRawText(missingFieldsFields),
    extractionConfidence: 0.62,
    extractionWarnings: [
      "Several required fields could not be located on the form.",
      "Please verify date of birth, account type, and investment profile manually.",
    ],
    fieldConfidenceMap: {} as ExtractedNAAFData["fieldConfidenceMap"],
    fieldSourceMap: Object.fromEntries(
      Object.entries(missingFieldsFields).map(([k, v]) => [
        k,
        v ? "extracted" : "missing",
      ])
    ) as ExtractedNAAFData["fieldSourceMap"],
  },
};

function buildSampleRawText(f: NaafFields): string {
  return [
    "NEW ACCOUNT APPLICATION FORM (NAAF)",
    "Keybase Financial Group",
    "",
    "CLIENT INFORMATION",
    `Full Name: ${f.fullName || `${f.firstName} ${f.lastName}`}`,
    `Date of Birth: ${f.dateOfBirth}`,
    `Email: ${f.email}`,
    `Phone: ${f.phone}`,
    `Address: ${f.address}`,
    `City: ${f.city}`,
    `Province: ${f.province}`,
    `Postal Code: ${f.postalCode}`,
    `Country: ${f.country}`,
    "",
    "EMPLOYMENT & FINANCIAL",
    `Employment Status: ${f.employmentStatus}`,
    `Employer: ${f.employerName}`,
    `Occupation: ${f.occupation}`,
    `Annual Income: ${f.annualIncome}`,
    `Liquid Net Worth: ${f.liquidNetWorth}`,
    `Total Net Worth: ${f.totalNetWorth}`,
    `Investment Knowledge: ${f.investmentKnowledge}`,
    `Source of Funds: ${f.sourceOfFunds}`,
    "",
    "ACCOUNT INFORMATION",
    `Account Type: ${f.accountType}`,
    `Account Number: ${f.accountNumber}`,
    `Account Purpose: ${f.accountPurpose}`,
    `Currency: ${f.currency}`,
    `Advisor: ${f.advisorName} (${f.advisorCode})`,
    `Branch: ${f.branch}`,
    `Date Completed: ${f.dateCompleted}`,
    "",
    "INVESTMENT PROFILE",
    `Investment Objective: ${f.investmentObjective}`,
    `Risk Tolerance: ${f.riskTolerance}`,
    `Time Horizon: ${f.timeHorizon}`,
    `Liquidity Needs: ${f.liquidityNeeds}`,
    `Intended Use: ${f.intendedUse}`,
    `Experience: ${f.investmentExperience}`,
  ].join("\n");
}

export function getSampleNaaf(key: SampleKey): ExtractedNAAFData {
  // Deep clone so callers can mutate without polluting the fixture.
  return JSON.parse(JSON.stringify(SAMPLES[key])) as ExtractedNAAFData;
}
