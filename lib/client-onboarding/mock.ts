/**
 * A complete, obviously fictional application for each account kind, so the
 * whole onboarding — every screen, the CRQ result, the filled PDFs — can be
 * seen before entering a real client.
 *
 * Everything here is fake by construction: example.com addresses, 555 phone
 * numbers, a SIN of zeros, "Example"/"Sample" names. The repository is public,
 * and a demo client must never be mistaken for a real one — the wizard also
 * refuses to save a mock-filled onboarding to the client records.
 */

import { blankNaaf, blankPlan } from "@/lib/naaf/blank";
import type { InvestmentObjective, RiskTolerance } from "@/lib/naaf/config";
import type { HolderInfo, InvestmentPlan, NaafState } from "@/lib/naaf/types";
import { blankQuestionnaire } from "@/lib/risk-questionnaire/blank";
import type { QuestionnaireState } from "@/lib/risk-questionnaire/types";

import type { AccountKind, OnboardingDraft } from "./draft";
import { requirementsFor, type SupportingState } from "./supporting";

const alexandra: Partial<HolderInfo> = {
  holderType: "Ms.",
  gender: "Female",
  firstName: "Alexandra",
  initials: "J",
  surname: "Sample",
  sin: "000 000 000",
  dob: "03/15/1980",
  address: "100 Demo Street",
  apt: "",
  city: "Toronto",
  province: "ON",
  postalCode: "A1A 1A1",
  cellPhone: "555-010-0001",
  homePhone: "555-010-0003",
  email: "alexandra.sample@example.com",
  idMethod: "photo",
  idType: "Driver's Licence",
  documentId: "S0000-00000-00000",
  dateOfIssue: "2022-04-01",
  placeOfIssue: "Toronto",
  jurisdiction: "ON",
  issuingCountry: "Canada",
  dateOfExpiry: "2027-03-15",
  pep: "No",
  pepAssociate: "No",
  citizenship: "Canadian",
  employer: "Example Engineering Ltd.",
  businessType: "Engineering services",
  employerAddress: "200 Sample Avenue, Toronto, ON",
  occupation: "Project Manager",
  maritalStatus: "Married",
  dependants: "2",
  spouseLastName: "Sample",
  spouseFirstName: "Jordan",
  spouseIncome: "85000",
  spouseEmployer: "Example Health",
  spouseOccupation: "Nurse",
};

const jordan: Partial<HolderInfo> = {
  holderType: "Mr.",
  gender: "Male",
  relationshipToA: "Spouse",
  addressSameAsA: true,
  firstName: "Jordan",
  initials: "",
  surname: "Sample",
  sin: "000 000 000",
  dob: "07/02/1978",
  cellPhone: "555-010-0002",
  email: "jordan.sample@example.com",
  idMethod: "photo",
  idType: "Passport",
  documentId: "XX0000000",
  dateOfIssue: "2021-09-10",
  placeOfIssue: "Toronto",
  jurisdiction: "ON",
  issuingCountry: "Canada",
  dateOfExpiry: "2031-09-10",
  pep: "No",
  pepAssociate: "No",
  citizenship: "Canadian",
  employer: "Example Health",
  businessType: "Health care",
  employerAddress: "300 Placeholder Road, Toronto, ON",
  occupation: "Nurse",
  maritalStatus: "Married",
  dependants: "2",
};

const exampleHoldings: Partial<HolderInfo> = {
  holderType: "Entity",
  surname: "Example Holdings Inc.",
  sin: "000000000RC0001",
  dob: "Holding company — real estate investments",
  address: "400 Example Boulevard, Suite 12",
  city: "Toronto",
  province: "ON",
  postalCode: "A1A 1A1",
  businessPhone: "555-010-0100",
  email: "office@example-holdings.example.com",
  idMethod: "dual",
  idType: "Articles of Incorporation",
  documentId: "Corporation No. 0000000",
  issuingCountry: "Canada",
  jurisdiction: "ON",
  dateOfIssue: "2012-05-01",
  placeOfIssue: "Toronto",
  pep: "No",
  pepAssociate: "No",
};

const noThirdParty = { financialInterest: "No", tradingAuthorization: "No", makingDeposits: "No" } as const;

function plan(
  overrides: Omit<Partial<InvestmentPlan>, "objectives" | "riskTolerance"> & {
    objectives: Partial<Record<InvestmentObjective, string>>;
    risk: Partial<Record<RiskTolerance, string>>;
  },
): InvestmentPlan {
  const base = blankPlan();
  const { objectives, risk, ...rest } = overrides;
  return {
    ...base,
    owner: "A",
    registration: "client",
    leverage: "No",
    thirdParty: { ...noThirdParty },
    ...rest,
    objectives: { ...base.objectives, new: { ...base.objectives.new, ...objectives } },
    riskTolerance: { ...base.riskTolerance, new: { ...base.riskTolerance.new, ...risk } },
  };
}

function mockNaaf(kind: AccountKind): NaafState {
  const naaf = blankNaaf();
  const corporate = kind === "corporate";
  const joint = kind === "joint";

  naaf.formType = "New Client";
  naaf.clientId = corporate ? "DEMO-30001" : joint ? "DEMO-20001" : "DEMO-10001";
  naaf.hasJointHolder = joint;
  naaf.clientA = { ...naaf.clientA, ...(corporate ? exampleHoldings : alexandra) };
  if (joint) {
    naaf.clientB = { ...naaf.clientB, ...jordan };
    // The spouse is the joint applicant, so the spouse lines stay empty.
    naaf.clientA = { ...naaf.clientA, spouseLastName: "", spouseFirstName: "", spouseIncome: "", spouseEmployer: "", spouseOccupation: "" };
  }

  naaf.kyc.A = corporate
    ? {
        income: "$1 Million and Over",
        netWorth: { liquidAssets: "1800000", fixedAssets: "4200000", liabilities: "1500000" },
        knowledge: "Sophisticated",
        experience: ["Bonds", "Stocks", "Mutual Funds", "Real Estate"],
      }
    : {
        income: "$100,000 - $124,999",
        netWorth: { liquidAssets: "150000", fixedAssets: "650000", liabilities: "300000" },
        knowledge: "Good",
        experience: ["Stocks", "Mutual Funds", "Term Deposit"],
      };
  if (joint) {
    naaf.kyc.B = {
      income: "$75,000 - $99,999",
      netWorth: { liquidAssets: "90000", fixedAssets: "0", liabilities: "20000" },
      knowledge: "Fair",
      experience: ["Mutual Funds", "Term Deposit"],
    };
  }

  const plans: InvestmentPlan[] = corporate
    ? [
        plan({
          planIdType: "Corporate investment account",
          accountType: "Corporate",
          objectives: { Income: "30", Balanced: "40", Growth: "30" },
          risk: { "Low to Medium": "30", Medium: "50", "Medium to High": "20" },
          timeHorizon: { current: null, new: "5 - 10 Years" },
          intendedUse: { current: [], new: ["Savings"] },
        }),
      ]
    : [
        plan({
          planIdType: "RRSP",
          accountType: "RRSP",
          objectives: { Income: "20", Balanced: "30", Growth: "50" },
          risk: { "Low to Medium": "20", Medium: "50", "Medium to High": "30" },
          timeHorizon: { current: null, new: "10 - 20 Years" },
          intendedUse: { current: [], new: ["Retirement Planning"] },
        }),
        plan({
          planIdType: "TFSA",
          accountType: "TFSA",
          objectives: { Balanced: "60", Growth: "40" },
          risk: { Medium: "100" },
          timeHorizon: { current: null, new: "5 - 10 Years" },
          intendedUse: { current: [], new: ["Savings", "Tax Savings"] },
        }),
        ...(joint
          ? [
              plan({
                planIdType: "Joint non-registered",
                accountType: "Open JTWROS",
                signingAuthority: "All owners to sign",
                objectives: { Balanced: "50", Growth: "50" },
                risk: { Medium: "60", "Medium to High": "40" },
                timeHorizon: { current: null, new: "10 - 20 Years" },
                intendedUse: { current: [], new: ["Savings"] },
              }),
            ]
          : []),
      ];
  naaf.plans = naaf.plans.map((blank, i) => plans[i] ?? blank);

  if (corporate) {
    naaf.corporation = { registeredCharity: "No", notForProfit: "No", solicitsDonations: "No" };
  }

  naaf.banking = {
    voidChequeOnFile: false,
    owner: corporate ? "Business" : "Personal",
    accountType: "Chequing",
    bankName: "Example Bank",
    transit: "00011",
    bankNumber: "001",
    accountNumber: "1234567",
  };
  naaf.tcp = {
    surname: "Sample",
    firstName: "Taylor",
    phone: "555-010-0009",
    email: "taylor.sample@example.com",
    relationship: corporate ? "Company secretary" : "Sibling",
  };
  naaf.caslConsent = true;
  naaf.eddConsent = true;
  naaf.oba = {
    notApplicable: false,
    description: "Life insurance and segregated funds through Example Insurance Agency Inc.",
    primaryInitials: corporate ? "EH" : "AJS",
    jointInitials: joint ? "JS" : "",
  };
  naaf.advisor = {
    ...naaf.advisor,
    dealerCode: "9999",
    repCode: "DEMO1",
    answers: { metInPerson: "Yes", verifiedId: "Yes", providedRdd: "Yes", directInterest: "No" },
    name: "Demo Advisor",
  };
  return naaf;
}

function mockCrq(kind: AccountKind, naaf: NaafState): QuestionnaireState {
  const crq = blankQuestionnaire();
  const corporate = kind === "corporate";
  return {
    ...crq,
    accountHolderName: corporate ? naaf.clientA.surname : `${naaf.clientA.firstName} ${naaf.clientA.surname}`,
    jointHolderName: kind === "joint" ? `${naaf.clientB.firstName} ${naaf.clientB.surname}` : "",
    clientId: naaf.clientId,
    portfolioPriorities: { retirementPlanning: 1, savings: 2, taxSavings: 3, childEducation: null, estatePlanning: corporate ? null : 4 },
    investmentCheckFrequency: "quarterly",
    // Q1, Q3 and Q5 agree with the NAAF (age 46 / years in operation, income, net worth).
    answers: {
      q1: corporate ? "q1_d" : "q1_b",
      q2: "q2_d",
      q3: corporate ? "q3_h" : "q3_e",
      q4: "q4_c",
      q5: corporate ? "q5_f" : "q5_e",
      q6: "q6_c",
      q7: "q7_c",
      q8: "q8_b",
      q9: "q9_c",
      q10: "q10_c",
      q11: "q11_b",
      q12: "q12_c",
    },
    notes: "Demo onboarding — sample data only, not a real client.",
    acknowledgementType: kind === "joint" ? "single_account" : "all_accounts",
    acknowledgementAccountName: kind === "joint" ? "Joint non-registered" : "",
    acknowledgementGoal: kind === "joint" ? "Growth" : null,
    advisorName: naaf.advisor.name,
  };
}

/** A complete fictional application of this kind — everything but the signatures. */
export function mockDraft(kind: AccountKind): OnboardingDraft {
  const naaf = mockNaaf(kind);
  const supporting: SupportingState = {};
  for (const r of requirementsFor(naaf)) supporting[r.id] = { status: "on_file" };
  return { variant: kind, naaf, crq: mockCrq(kind, naaf), supporting };
}
