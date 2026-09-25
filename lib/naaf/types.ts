/**
 * State of one digital NAAF, section by section as printed.
 *
 * Every single-choice box group is `T | null`, where null means nothing was
 * ticked. That is the distinction the completeness check runs on, so a group
 * never defaults to a value the advisor did not choose.
 *
 * Money and percentages are kept as the strings typed. "0" is an answer and ""
 * is a blank box, and a number field would collapse the two.
 */

import type {
  AccountType,
  AdvisorQuestionKey,
  BankAccountType,
  BankOwner,
  Citizenship,
  CorporationKey,
  ExperienceType,
  FormType,
  Gender,
  HolderType,
  IdMethod,
  IncomeBand,
  IntendedUse,
  InvestmentObjective,
  KnowledgeLevel,
  MaritalStatus,
  NetWorthKey,
  PlanColumn,
  Registration,
  RelationshipToA,
  RiskTolerance,
  SigningAuthority,
  ThirdPartyKey,
  TimeHorizon,
} from "./config";

export type YesNo = "Yes" | "No";

export interface HolderInfo {
  /** Client A may be an individual (title) or an entity; Client B is always a person. */
  holderType: HolderType | null;
  gender: Gender | null;
  /** Client B only. */
  relationshipToA: RelationshipToA | null;
  relationshipOther: string;
  /** Client B only — "Address same as Account Holder". */
  addressSameAsA: boolean;

  surname: string;
  firstName: string;
  initials: string;
  sin: string;
  /** D.O.B. (mm/dd/yy), or the nature of business for a corporation. */
  dob: string;

  address: string;
  apt: string;
  city: string;
  province: string;
  postalCode: string;
  homePhone: string;
  businessPhone: string;
  cellPhone: string;
  email: string;

  idMethod: IdMethod | null;
  idType: string;
  documentId: string;
  dateOfIssue: string;
  placeOfIssue: string;
  jurisdiction: string;
  issuingCountry: string;
  dateOfExpiry: string;

  pep: YesNo | null;
  pepAssociate: YesNo | null;

  citizenship: Citizenship | null;
  citizenshipOther: string;

  employer: string;
  businessType: string;
  employerAddress: string;
  occupation: string;

  maritalStatus: MaritalStatus | null;
  dependants: string;
  spouseLastName: string;
  spouseFirstName: string;
  spouseIncome: string;
  spouseEmployer: string;
  spouseOccupation: string;
}

export interface KycColumn {
  income: IncomeBand | null;
  netWorth: Record<NetWorthKey, string>;
  knowledge: KnowledgeLevel | null;
  experience: ExperienceType[];
}

export type Allocation<K extends string> = Record<PlanColumn, Record<K, string>>;

export interface Beneficiary {
  name: string;
  sin: string;
  dob: string;
  primary: boolean;
  allocation: string;
  relationship: string;
}

export interface InvestmentPlan {
  planIdType: string;
  owner: "A" | "B" | null;
  registration: Registration | null;
  intermediary: string;
  accountType: AccountType | null;
  accountTypeOther: string;
  signingAuthority: SigningAuthority | null;
  leverage: YesNo | null;
  lendingInstitution: string;
  objectives: Allocation<InvestmentObjective>;
  riskTolerance: Allocation<RiskTolerance>;
  timeHorizon: Record<PlanColumn, TimeHorizon | null>;
  intendedUse: Record<PlanColumn, IntendedUse[]>;
  intendedUseOther: string;
  beneficiary: Beneficiary;
  /** Section G, per plan. */
  thirdParty: Record<ThirdPartyKey, YesNo | null>;
}

export interface Banking {
  voidChequeOnFile: boolean;
  owner: BankOwner | null;
  accountType: BankAccountType | null;
  bankName: string;
  transit: string;
  bankNumber: string;
  accountNumber: string;
}

export interface TrustedContact {
  surname: string;
  firstName: string;
  phone: string;
  email: string;
  relationship: string;
}

/** A captured signature: a PNG data URL, or null while unsigned. */
export type Signature = string | null;

export interface NaafState {
  formType: FormType | null;
  clientId: string;

  /**
   * Whether this application has a joint account holder. The paper form has no
   * such box — a blank Section B simply means "no Client B" — but the digital
   * check needs to know whether a blank Section B is correct or an omission.
   */
  hasJointHolder: boolean;

  clientA: HolderInfo;
  clientB: HolderInfo;

  kyc: { A: KycColumn; B: KycColumn; netWorthIncludesSpouse: boolean };

  plans: InvestmentPlan[];

  corporation: Record<CorporationKey, YesNo | null>;

  banking: Banking;

  tcp: TrustedContact;
  caslConsent: boolean;
  eddConsent: boolean;

  oba: {
    notApplicable: boolean;
    description: string;
    primaryInitials: string;
    jointInitials: string;
  };

  clientSignatures: { signature: Signature; date: string }[];

  advisor: {
    dealerCode: string;
    repCode: string;
    answers: Record<AdvisorQuestionKey, YesNo | null>;
    name: string;
    signature: Signature;
    date: string;
  };
}
