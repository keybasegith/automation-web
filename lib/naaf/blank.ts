/** Empty-form constructors. Nothing is pre-ticked: every group starts unanswered. */

import {
  ADVISOR_QUESTIONS,
  CORPORATION_QUESTIONS,
  INVESTMENT_OBJECTIVES,
  PLAN_COUNT,
  RISK_TOLERANCES,
  THIRD_PARTY_QUESTIONS,
} from "./config";
import type { HolderInfo, InvestmentPlan, KycColumn, NaafState } from "./types";

const keyed = <K extends string, V>(keys: readonly K[], value: V): Record<K, V> =>
  Object.fromEntries(keys.map((k) => [k, value])) as Record<K, V>;

export const blankHolder = (): HolderInfo => ({
  holderType: null,
  gender: null,
  relationshipToA: null,
  relationshipOther: "",
  addressSameAsA: false,
  surname: "",
  firstName: "",
  initials: "",
  sin: "",
  dob: "",
  address: "",
  apt: "",
  city: "",
  province: "",
  postalCode: "",
  homePhone: "",
  businessPhone: "",
  cellPhone: "",
  email: "",
  idMethod: null,
  idType: "",
  documentId: "",
  dateOfIssue: "",
  placeOfIssue: "",
  jurisdiction: "",
  issuingCountry: "",
  dateOfExpiry: "",
  pep: null,
  pepAssociate: null,
  citizenship: null,
  citizenshipOther: "",
  employer: "",
  businessType: "",
  employerAddress: "",
  occupation: "",
  maritalStatus: null,
  dependants: "",
  spouseLastName: "",
  spouseFirstName: "",
  spouseIncome: "",
  spouseEmployer: "",
  spouseOccupation: "",
});

export const blankKyc = (): KycColumn => ({
  income: null,
  netWorth: { liquidAssets: "", fixedAssets: "", liabilities: "" },
  knowledge: null,
  experience: [],
});

export const blankPlan = (): InvestmentPlan => ({
  planIdType: "",
  owner: null,
  registration: null,
  intermediary: "",
  accountType: null,
  accountTypeOther: "",
  signingAuthority: null,
  leverage: null,
  lendingInstitution: "",
  objectives: {
    current: keyed(INVESTMENT_OBJECTIVES, ""),
    new: keyed(INVESTMENT_OBJECTIVES, ""),
  },
  riskTolerance: {
    current: keyed(RISK_TOLERANCES, ""),
    new: keyed(RISK_TOLERANCES, ""),
  },
  timeHorizon: { current: null, new: null },
  intendedUse: { current: [], new: [] },
  intendedUseOther: "",
  beneficiary: { name: "", sin: "", dob: "", primary: false, allocation: "", relationship: "" },
  thirdParty: keyed(
    THIRD_PARTY_QUESTIONS.map((q) => q.key),
    null,
  ),
});

export const blankNaaf = (): NaafState => ({
  formType: null,
  clientId: "",
  hasJointHolder: false,
  clientA: blankHolder(),
  clientB: blankHolder(),
  kyc: { A: blankKyc(), B: blankKyc(), netWorthIncludesSpouse: false },
  plans: Array.from({ length: PLAN_COUNT }, blankPlan),
  corporation: keyed(
    CORPORATION_QUESTIONS.map((q) => q.key),
    null,
  ),
  banking: {
    voidChequeOnFile: false,
    owner: null,
    accountType: null,
    bankName: "",
    transit: "",
    bankNumber: "",
    accountNumber: "",
  },
  tcp: { surname: "", firstName: "", phone: "", email: "", relationship: "" },
  caslConsent: false,
  eddConsent: false,
  oba: { notApplicable: false, description: "", primaryInitials: "", jointInitials: "" },
  clientSignatures: [
    { signature: null, date: "" },
    { signature: null, date: "" },
  ],
  advisor: {
    dealerCode: "",
    repCode: "",
    answers: keyed(
      ADVISOR_QUESTIONS.map((q) => q.key),
      null,
    ),
    name: "",
    signature: null,
    date: "",
  },
});
