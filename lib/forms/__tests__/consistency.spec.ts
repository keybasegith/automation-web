/**
 * Tests for the deterministic consistency checker.
 *
 * Run with the built-in node test runner. Two convenient ways:
 *
 *   npx tsx --test 'lib/forms/__tests__/*.spec.ts'
 *   # or
 *   node --import tsx --test 'lib/forms/__tests__/*.spec.ts'
 *
 * (requires tsx to be installed; we don't add it as a project dependency).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { checkKycCrqConsistency } from "@/lib/forms/checkKycCrqConsistency";
import { generateCrqFromNaaf } from "@/lib/forms/generateCrqFromNaaf";
import { generateKycFromNaaf } from "@/lib/forms/generateKycFromNaaf";
import { exportWindFundCoreCsv } from "@/lib/export/exportWindFundCoreCsv";
import { getSampleNaaf } from "@/lib/forms/sampleNaafData";
import type {
  CrqDraft,
  CrqFields,
  KycDraft,
  KycFields,
} from "@/lib/forms/types";

function buildKyc(overrides: Partial<KycFields> = {}): KycDraft {
  const base = generateKycFromNaaf(getSampleNaaf("clean"));
  return {
    ...base,
    fields: { ...base.fields, ...overrides },
  };
}

function buildCrq(overrides: Partial<CrqFields> = {}): CrqDraft {
  const base = generateCrqFromNaaf(getSampleNaaf("clean"));
  return {
    ...base,
    fields: {
      ...base.fields,
      // Ensure required CRQ fields are present so we don't always block.
      comfortWithLoss: "Medium",
      primaryInvestmentGoal: "Growth",
      fundsNeededWithin: "5+ years",
      capacityForLoss: "Medium",
      ...overrides,
    },
  };
}

test("NAAF → KYC mapping copies the expected fields", () => {
  const naaf = getSampleNaaf("clean");
  const kyc = generateKycFromNaaf(naaf);
  assert.equal(kyc.fields.clientFullName, naaf.fields.fullName);
  assert.equal(kyc.fields.dateOfBirth, naaf.fields.dateOfBirth);
  assert.equal(kyc.fields.accountType, naaf.fields.accountType);
  assert.equal(kyc.fields.advisorCode, naaf.fields.advisorCode);
  assert.equal(kyc.fields.completedDate, naaf.fields.dateCompleted);
  // Sources are auto_filled for non-empty mapped fields.
  assert.equal(kyc.fieldSourceMap.clientFullName, "auto_filled_from_naaf");
  assert.equal(kyc.missingFields.length, 0, "clean sample fills required KYC fields");
});

test("NAAF → CRQ partial mapping populates safe admin fields only", () => {
  const naaf = getSampleNaaf("clean");
  const crq = generateCrqFromNaaf(naaf);
  // Safe admin auto-fill.
  assert.equal(crq.fields.clientFullName, naaf.fields.fullName);
  assert.equal(crq.fields.accountType, naaf.fields.accountType);
  assert.equal(crq.fields.advisorName, naaf.fields.advisorName);
  // Subjective fields with overlap get suggested_needs_review.
  assert.equal(crq.fieldSourceMap.riskTolerance, "suggested_needs_review");
  assert.equal(crq.fieldSourceMap.investmentObjective, "suggested_needs_review");
  // Subjective fields without exact overlap stay missing.
  assert.equal(crq.fieldSourceMap.comfortWithLoss, "missing");
  assert.equal(crq.fieldSourceMap.primaryInvestmentGoal, "missing");
});

test("Missing required fields produce blocking flags and override status", () => {
  const naaf = getSampleNaaf("missing_fields");
  const kyc = generateKycFromNaaf(naaf);
  const crq = generateCrqFromNaaf(naaf);
  const result = checkKycCrqConsistency({
    submissionId: "test-1",
    kyc,
    crq,
  });
  assert.equal(result.overallStatus, "blocked_missing_required");
  assert.ok(
    result.flags.some((f) => f.category === "missing_required_field"),
    "expected at least one missing_required_field flag"
  );
});

test("Risk-tolerance mismatch (KYC High vs CRQ comfort Low) triggers High severity", () => {
  const kyc = buildKyc({ riskTolerance: "High" });
  const crq = buildCrq({ comfortWithLoss: "Low" });
  const result = checkKycCrqConsistency({
    submissionId: "test-2",
    kyc,
    crq,
  });
  assert.equal(result.overallStatus, "needs_compliance_review");
  const hit = result.flags.find(
    (f) => f.category === "risk_tolerance" && f.crqField === "comfortWithLoss"
  );
  assert.ok(hit, "expected risk_tolerance flag against comfortWithLoss");
  assert.equal(hit!.severity, "High");
});

test("Time-horizon mismatch (Long Term vs 1-2 years) triggers High severity", () => {
  const kyc = buildKyc({ timeHorizon: "Long Term" });
  const crq = buildCrq({ fundsNeededWithin: "1 to 2 years" });
  const result = checkKycCrqConsistency({
    submissionId: "test-3",
    kyc,
    crq,
  });
  const hit = result.flags.find((f) => f.category === "time_horizon");
  assert.ok(hit, "expected time_horizon flag");
  assert.equal(hit!.severity, "High");
});

test("Investment-objective mismatch (Aggressive Growth vs Capital Preservation) is High", () => {
  const kyc = buildKyc({ investmentObjective: "Aggressive Growth" });
  const crq = buildCrq({ primaryInvestmentGoal: "Capital Preservation" });
  const result = checkKycCrqConsistency({
    submissionId: "test-4",
    kyc,
    crq,
  });
  const hit = result.flags.find((f) => f.category === "investment_objective");
  assert.ok(hit, "expected investment_objective flag");
  assert.equal(hit!.severity, "High");
});

test("Identity mismatch on client name is High severity", () => {
  const kyc = buildKyc({ clientFullName: "Sarah Chen" });
  const crq = buildCrq({ clientFullName: "Sara Chen-Smith" });
  const result = checkKycCrqConsistency({
    submissionId: "test-5",
    kyc,
    crq,
  });
  const hit = result.flags.find(
    (f) => f.category === "client_identity" && f.kycField === "clientFullName"
  );
  assert.ok(hit, "expected client_identity flag on clientFullName");
  assert.equal(hit!.severity, "High");
});

test("CSV export contains all 15 columns and escapes commas in values", () => {
  const kyc = buildKyc({ clientFullName: "Smith, Sarah" }).fields;
  const csv = exportWindFundCoreCsv([
    {
      kyc,
      accountNumber: "ACC-1",
      complianceApprovedAt: "2026-04-30T12:00:00Z",
    },
  ]);
  const lines = csv.split("\n");
  // Header + one data row.
  assert.equal(lines.length, 2);
  // Header has 15 columns.
  assert.equal(lines[0].split(",").length, 15);
  // Comma in clientFullName forces quoting.
  assert.ok(
    lines[1].startsWith('"Smith, Sarah"'),
    "expected commas in client name to trigger CSV quoting"
  );
});

test("Clean sample with consistent CRQ produces no_issues_detected", () => {
  const kyc = buildKyc({
    riskTolerance: "Medium",
    investmentObjective: "Growth",
    timeHorizon: "Long Term",
    investmentKnowledge: "Good",
    liquidityNeeds: "Low",
  });
  const crq = buildCrq({
    riskTolerance: "Medium",
    comfortWithLoss: "Medium",
    primaryInvestmentGoal: "Growth",
    fundsNeededWithin: "5+ years",
    capacityForLoss: "Medium",
    investmentExperience: "Intermediate",
    liquidityNeeds: "Low",
  });
  const result = checkKycCrqConsistency({
    submissionId: "test-6",
    kyc,
    crq,
  });
  assert.equal(result.overallStatus, "no_issues_detected");
  assert.equal(result.flags.length, 0);
});
