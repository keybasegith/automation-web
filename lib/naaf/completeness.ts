/**
 * Completeness check for the digital NAAF: which boxes are blank, which
 * signatures are missing, and which filled-in values cannot be right (a plan
 * allocation that does not total 100%).
 *
 * The check is conditional the way the paper form is. Section B only applies
 * to a joint application, spouse lines only when there is a spouse who is not
 * Client B, and Plans 2 and 3 only once something is written in them. A box
 * that does not apply is never reported as blank.
 *
 * Where this overlaps the discrepancy detector's N-rules (Client ID, KYC,
 * trusted contact, OBA, signatures, advisor block) it asks for the same things,
 * so a NAAF that passes here does not then fail N1-N7 there.
 *
 * Findings come back in the order the fields appear on the form.
 */

import {
  ADVISOR_QUESTIONS,
  BENEFICIARY_REQUIRED_TYPES,
  CORPORATION_QUESTIONS,
  ENTITY_TYPES,
  HAS_SPOUSE,
  JOINT_ACCOUNT_TYPES,
  NET_WORTH_ROWS,
  PLAN_COLUMNS,
  PLAN_LETTERS,
  THIRD_PARTY_QUESTIONS,
  type HolderType,
} from "./config";
import { blankPlan } from "./blank";
import type { HolderInfo, InvestmentPlan, KycColumn, NaafState } from "./types";

/**
 * `blank` and `signature` are deficiencies. `invalid` is a box that is filled
 * in but cannot be right. `review` is a blank the client may legitimately
 * leave — the advisor confirms it rather than being blocked by it.
 */
export type IssueKind = "blank" | "signature" | "invalid" | "review";

export type SectionKey =
  | "header"
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N";

export interface NaafIssue {
  /** DOM id of the control to scroll to; also keys the field highlight. */
  fieldId: string;
  section: SectionKey;
  kind: IssueKind;
  message: string;
}

export interface CompletenessReport {
  issues: NaafIssue[];
  blank: number;
  signatures: number;
  invalid: number;
  review: number;
  /** True when nothing blocks the form — `review` items do not. */
  complete: boolean;
}

// ---------------------------------------------------------------- field ids

type Holder = "A" | "B";

/** DOM ids, shared by the form controls and the issue list. */
export const fieldIds = {
  formType: "naaf-form-type",
  clientId: "naaf-client-id",
  jointToggle: "naaf-joint-toggle",
  holder: (h: Holder, field: keyof HolderInfo) => `naaf-${h}-${field}`,
  kyc: (h: Holder, field: string) => `naaf-kyc-${h}-${field}`,
  plan: (index: number, field: string) => `naaf-plan${index + 1}-${field}`,
  corporation: (key: string) => `naaf-corp-${key}`,
  banking: (field: string) => `naaf-bank-${field}`,
  tcp: (field: string) => `naaf-tcp-${field}`,
  casl: "naaf-casl",
  edd: "naaf-edd",
  oba: (field: string) => `naaf-oba-${field}`,
  clientSignature: (index: number) => `naaf-client-signature-${index + 1}`,
  clientDate: (index: number) => `naaf-client-date-${index + 1}`,
  advisor: (field: string) => `naaf-advisor-${field}`,
} as const;

// ---------------------------------------------------------------- helpers

export const isBlank = (value: string): boolean => value.trim().length === 0;

/** Parses a typed dollar amount; null when blank or not a number. */
export function parseMoney(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Number(cleaned);
}

/** Fixed Assets + Liquid Assets – Liabilities, or null until all three are numbers. */
export function netWorth(column: KycColumn): number | null {
  const liquid = parseMoney(column.netWorth.liquidAssets);
  const fixed = parseMoney(column.netWorth.fixedAssets);
  const liabilities = parseMoney(column.netWorth.liabilities);
  if (liquid === null || fixed === null || liabilities === null) return null;
  return fixed + liquid - liabilities;
}

export interface AllocationTotal {
  /** Every band left blank. */
  empty: boolean;
  /** Sum of the bands that hold a number; null when any band is not a number. */
  total: number | null;
}

/**
 * Totals one Current or New column. On paper a blank band next to filled ones
 * reads as 0%, so it is counted as 0 here too; only a column with nothing in it
 * at all counts as unanswered.
 */
export function allocationTotal(column: Record<string, string>): AllocationTotal {
  const filled = Object.values(column).filter((v) => !isBlank(v));
  if (filled.length === 0) return { empty: true, total: null };
  let total = 0;
  for (const raw of filled) {
    const n = Number(raw.replace(/[%\s]/g, ""));
    if (!Number.isFinite(n) || n < 0 || n > 100) return { empty: false, total: null };
    total += n;
  }
  return { empty: false, total: Math.round(total * 100) / 100 };
}

export const isEntity = (type: HolderType | null): boolean =>
  type !== null && (ENTITY_TYPES as readonly string[]).includes(type);

/** A plan is in use once anything at all has been entered in its block. */
export function isPlanInUse(plan: InvestmentPlan, index: number): boolean {
  if (index === 0) return true;
  return JSON.stringify(plan) !== JSON.stringify(blankPlan());
}

// ---------------------------------------------------------------- check

export function checkNaaf(state: NaafState): CompletenessReport {
  const issues: NaafIssue[] = [];
  const add = (section: SectionKey, kind: IssueKind, fieldId: string, message: string) =>
    issues.push({ section, kind, fieldId, message });
  const blank = (section: SectionKey, fieldId: string, message: string) =>
    add(section, "blank", fieldId, message);

  const joint = state.hasJointHolder;
  const a = state.clientA;
  const b = state.clientB;
  const entityA = isEntity(a.holderType);
  const plansInUse = state.plans
    .map((plan, index) => ({ plan, index }))
    .filter(({ plan, index }) => isPlanInUse(plan, index));

  // ------------------------------------------------------------ header
  if (!state.formType) {
    blank("header", fieldIds.formType, "Tick New Client, KYC Update, or Existing Client (New Plan).");
  }
  if (isBlank(state.clientId)) blank("A", fieldIds.clientId, "Client ID is blank.");

  // ------------------------------------------------------------ A / B
  // Spouse lines are for a spouse who is not the other applicant.
  const spousesApplyTogether = joint && b.relationshipToA === "Spouse";
  checkHolder("A", a, { entity: entityA, spouseIsCoApplicant: spousesApplyTogether });

  const jointPlan = plansInUse.some(
    ({ plan }) => plan.accountType !== null && JOINT_ACCOUNT_TYPES.includes(plan.accountType),
  );
  const thirdPartyYes = plansInUse.some(({ plan }) =>
    Object.values(plan.thirdParty).includes("Yes"),
  );

  if (joint) {
    checkHolder("B", b, { entity: false, spouseIsCoApplicant: spousesApplyTogether });
  } else if (jointPlan) {
    add("B", "invalid", fieldIds.jointToggle, "A plan is a Joint account type, but there is no joint account holder in Section B.");
  } else if (thirdPartyYes) {
    add("B", "invalid", fieldIds.jointToggle, "Section G has a YES answer, so the third party must complete Section B.");
  }

  function checkHolder(
    h: Holder,
    info: HolderInfo,
    opts: { entity: boolean; spouseIsCoApplicant: boolean },
  ) {
    const id = (field: keyof HolderInfo) => fieldIds.holder(h, field);
    const need = (field: keyof HolderInfo, label: string) => {
      const value = info[field];
      if (typeof value === "string" && isBlank(value)) blank(h, id(field), `${label} is blank.`);
    };

    if (!info.holderType) {
      blank(h, id("holderType"), h === "A" ? "Tick a title (Mr., Mrs., …) or an account holder type (Entity, Estate, …)." : "Tick a title (Mr., Mrs., …).");
    }
    if (!opts.entity && !info.gender) blank(h, id("gender"), "Tick Male or Female.");
    if (h === "B") {
      if (!info.relationshipToA) blank(h, id("relationshipToA"), "Relationship to Client A is not ticked.");
      else if (info.relationshipToA === "Other") need("relationshipOther", "Relationship to Client A (Other)");
    }

    need("surname", opts.entity ? "Corporation/Organization name" : "Surname");
    if (!opts.entity) need("firstName", "First Name");
    need("sin", "SIN/TIN/BN/TN");
    need("dob", opts.entity ? "Nature of Business (in place of D.O.B.)" : "D.O.B.");

    if (!info.addressSameAsA) {
      need("address", "Address");
      need("city", "City");
      need("province", "Prov.");
      need("postalCode", "Postal Code");
    }
    if (isBlank(info.homePhone) && isBlank(info.businessPhone) && isBlank(info.cellPhone)) {
      blank(h, id("homePhone"), "No phone number — enter at least one of Home, Business or Cell.");
    }
    if (isBlank(info.email)) add(h, "review", id("email"), "E-Mail Address is blank — confirm the client has none.");

    if (!info.idMethod) {
      blank(h, id("idMethod"), "ID Verification Method is not ticked.");
    }
    need("idType", "ID Type");
    need("documentId", "Document ID #");
    if (info.idMethod === "photo") {
      need("issuingCountry", "Issuing Country");
      need("dateOfExpiry", "Date of Expiry");
      for (const [field, label] of [
        ["dateOfIssue", "Date of Issue"],
        ["placeOfIssue", "Place of Issue"],
        ["jurisdiction", "Jurisdiction"],
      ] as const) {
        if (isBlank(info[field])) add(h, "review", id(field), `${label} is blank — confirm the ID does not show one.`);
      }
    }

    if (!info.pep) blank(h, id("pep"), "Politically Exposed Person / HIO question is not answered.");
    if (!info.pepAssociate) blank(h, id("pepAssociate"), "Family member / close associate of a PEP or HIO question is not answered.");

    if (opts.entity) return;

    if (!info.citizenship) blank(h, id("citizenship"), "Citizenship is not ticked.");
    else if (info.citizenship === "Other") need("citizenshipOther", "Citizenship (Other)");

    need("employer", "Employer");
    need("occupation", "Occupation");
    if (isBlank(info.businessType)) add(h, "review", id("businessType"), "Business Type is blank.");
    if (isBlank(info.employerAddress)) add(h, "review", id("employerAddress"), "Employer Address is blank.");

    if (!info.maritalStatus) blank(h, id("maritalStatus"), "Marital Status is not ticked.");
    need("dependants", "Number of Dependants (enter 0 if none)");

    // "If your spouse is not the Joint Applicant, please complete this section"
    if (info.maritalStatus && HAS_SPOUSE.includes(info.maritalStatus) && !opts.spouseIsCoApplicant) {
      need("spouseLastName", "Spouse’s Last Name");
      need("spouseFirstName", "Spouse’s First Name");
      need("spouseIncome", "Spouse’s Income");
      if (isBlank(info.spouseEmployer)) add(h, "review", id("spouseEmployer"), "Spouse’s Employer is blank.");
      if (isBlank(info.spouseOccupation)) add(h, "review", id("spouseOccupation"), "Spouse’s Occupation is blank.");
    }
  }

  // ------------------------------------------------------------ C. KYC
  const kycHolders: Holder[] = joint ? ["A", "B"] : ["A"];
  for (const h of kycHolders) {
    const col = state.kyc[h];
    const who = `Client ${h}`;
    if (!col.income) blank("C", fieldIds.kyc(h, "income"), `Approximate Income is not ticked for ${who}.`);
    for (const row of NET_WORTH_ROWS) {
      const raw = col.netWorth[row.key];
      const fieldId = fieldIds.kyc(h, row.key);
      if (isBlank(raw)) blank("C", fieldId, `${row.label} is blank for ${who} (enter 0 if none).`);
      else if (parseMoney(raw) === null) add("C", "invalid", fieldId, `${row.label} for ${who} is not a dollar amount.`);
    }
    if (!col.knowledge) blank("C", fieldIds.kyc(h, "knowledge"), `Investment Knowledge is not ticked for ${who}.`);
    if (col.experience.length === 0) {
      blank("C", fieldIds.kyc(h, "experience"), `Investment Experience is not ticked for ${who} (tick None if none).`);
    } else if (col.experience.includes("None") && col.experience.length > 1) {
      add("C", "invalid", fieldIds.kyc(h, "experience"), `Investment Experience for ${who} has None ticked alongside other products.`);
    }
  }

  // ------------------------------------------------------------ D-F. Plans
  for (const { plan, index } of plansInUse) {
    const section = PLAN_LETTERS[index] as SectionKey;
    const id = (field: string) => fieldIds.plan(index, field);
    const label = `Plan (${index + 1})`;

    if (isBlank(plan.planIdType)) blank(section, id("planIdType"), `${label}: Plan ID & Plan Type is blank.`);
    if (!plan.owner) blank(section, id("owner"), `${label}: tick Client A or Client B.`);
    else if (plan.owner === "B" && !joint) add(section, "invalid", id("owner"), `${label} is ticked for Client B, but there is no joint account holder.`);

    if (!plan.registration) blank(section, id("registration"), `${label}: Registration is not ticked.`);
    else if (plan.registration === "intermediary" && isBlank(plan.intermediary)) {
      blank(section, id("intermediary"), `${label}: Intermediary name & account # is blank.`);
    }

    if (!plan.accountType) {
      blank(section, id("accountType"), `${label}: account Type is not ticked.`);
    } else {
      if (plan.accountType === "Other" && isBlank(plan.accountTypeOther)) {
        blank(section, id("accountTypeOther"), `${label}: Non-Registered “Other” type is not specified.`);
      }
      if (JOINT_ACCOUNT_TYPES.includes(plan.accountType) && !plan.signingAuthority) {
        blank(section, id("signingAuthority"), `${label}: tick All owners to sign or Any one owner to sign.`);
      }
      if (BENEFICIARY_REQUIRED_TYPES.includes(plan.accountType)) {
        if (isBlank(plan.beneficiary.name)) blank(section, id("beneficiary-name"), `${label}: Beneficiary/ITF Name is blank for a ${plan.accountType} account.`);
        if (isBlank(plan.beneficiary.dob)) blank(section, id("beneficiary-dob"), `${label}: Beneficiary D.O.B. is blank.`);
        if (plan.accountType.includes("RESP") && isBlank(plan.beneficiary.sin)) {
          blank(section, id("beneficiary-sin"), `${label}: Beneficiary S.I.N. is blank for an RESP.`);
        }
      }
    }

    if (!plan.leverage) blank(section, id("leverage"), `${label}: Leverage question is not answered.`);
    else if (plan.leverage === "Yes" && isBlank(plan.lendingInstitution)) {
      blank(section, id("lendingInstitution"), `${label}: Lending Institution is blank.`);
    }

    for (const [key, title] of [
      ["objectives", "Investment Objectives"],
      ["riskTolerance", "Risk Tolerance"],
    ] as const) {
      const totals = PLAN_COLUMNS.map((c) => ({ column: c, ...allocationTotal(plan[key][c]) }));
      if (totals.every((t) => t.empty)) {
        blank(section, id(key), `${label}: ${title} percentages are blank.`);
        continue;
      }
      for (const t of totals) {
        if (t.empty) continue;
        const col = t.column === "current" ? "Current" : "New";
        if (t.total === null) {
          add(section, "invalid", id(key), `${label}: ${title} (${col}) has a value that is not a percentage between 0 and 100.`);
        } else if (t.total !== 100) {
          add(section, "invalid", id(key), `${label}: ${title} (${col}) totals ${t.total}%, not 100%.`);
        }
      }
    }

    if (!plan.timeHorizon.current && !plan.timeHorizon.new) {
      blank(section, id("timeHorizon"), `${label}: Time Horizon is not ticked.`);
    }
    if (plan.intendedUse.current.length === 0 && plan.intendedUse.new.length === 0) {
      blank(section, id("intendedUse"), `${label}: Intended Use of Account is not ticked.`);
    } else if (
      [...plan.intendedUse.current, ...plan.intendedUse.new].includes("Other: Please Specify") &&
      isBlank(plan.intendedUseOther)
    ) {
      blank(section, id("intendedUseOther"), `${label}: Intended Use “Other” is not specified.`);
    }
  }

  // ------------------------------------------------------------ G
  for (const { plan, index } of plansInUse) {
    for (const q of THIRD_PARTY_QUESTIONS) {
      if (!plan.thirdParty[q.key]) {
        blank("G", fieldIds.plan(index, `tp-${q.key}`), `Plan ${index + 1}: “${q.text}” is not answered.`);
      }
    }
  }
  const corporate =
    entityA || plansInUse.some(({ plan }) => plan.accountType === "Corporate");
  if (corporate) {
    for (const q of CORPORATION_QUESTIONS) {
      if (!state.corporation[q.key]) blank("G", fieldIds.corporation(q.key), `For Corporations: “${q.text}” is not answered.`);
    }
  }

  // ------------------------------------------------------------ H
  // Optional as a whole, but once started — or with no void cheque on file —
  // a half-filled banking block is no use to processing.
  const bank = state.banking;
  const bankStarted =
    bank.owner !== null ||
    bank.accountType !== null ||
    [bank.bankName, bank.transit, bank.bankNumber, bank.accountNumber].some((v) => !isBlank(v));
  if (bankStarted && !bank.voidChequeOnFile) {
    if (!bank.owner) blank("H", fieldIds.banking("owner"), "Tick Personal or Business.");
    if (!bank.accountType) blank("H", fieldIds.banking("accountType"), "Account Type is not ticked.");
    if (isBlank(bank.bankName)) blank("H", fieldIds.banking("bankName"), "Bank Name is blank.");
    if (isBlank(bank.transit)) blank("H", fieldIds.banking("transit"), "Transit # is blank.");
    if (isBlank(bank.bankNumber)) blank("H", fieldIds.banking("bankNumber"), "Bank # is blank.");
    if (isBlank(bank.accountNumber)) blank("H", fieldIds.banking("accountNumber"), "Account # is blank.");
  }

  // ------------------------------------------------------------ I. TCP (N4)
  for (const [field, label] of [
    ["surname", "Surname"],
    ["firstName", "First Name"],
    ["phone", "Phone Number"],
    ["email", "Email Address"],
    ["relationship", "Relationship to Client"],
  ] as const) {
    if (isBlank(state.tcp[field])) blank("I", fieldIds.tcp(field), `Trusted Contact Person ${label} is blank.`);
  }

  // ------------------------------------------------------------ J / K
  // Consent cannot be required, but the form marks both boxes for the client's
  // attention, so an unticked box is surfaced for the advisor to confirm.
  if (!state.caslConsent) add("J", "review", fieldIds.casl, "CASL box is not ticked — confirm the client declined.");
  if (!state.eddConsent) add("K", "review", fieldIds.edd, "EDD box is not ticked — confirm the client wants paper documents.");

  // ------------------------------------------------------------ L. OBA (N5)
  if (!state.oba.notApplicable) {
    if (isBlank(state.oba.description)) {
      blank("L", fieldIds.oba("description"), "Outside business activities are not described, and Not Applicable is not ticked.");
    }
    if (isBlank(state.oba.primaryInitials)) blank("L", fieldIds.oba("primaryInitials"), "Primary Account Holder’s Initials are missing.");
    if (joint && isBlank(state.oba.jointInitials)) blank("L", fieldIds.oba("jointInitials"), "Joint Account Holder’s Initials are missing.");
  }

  // ------------------------------------------------------------ M. Signatures (N6)
  const signers = joint ? 2 : 1;
  for (let i = 0; i < signers; i++) {
    const who = signers === 1 ? "Client" : i === 0 ? "Primary account holder (Client A)" : "Joint account holder (Client B)";
    const { signature, date } = state.clientSignatures[i];
    if (!signature) add("M", "signature", fieldIds.clientSignature(i), `${who} signature is missing.`);
    if (isBlank(date)) blank("M", fieldIds.clientDate(i), `${who} signature date is blank.`);
  }

  // ------------------------------------------------------------ N. Advisor (N7)
  const adv = state.advisor;
  if (isBlank(adv.dealerCode)) blank("N", fieldIds.advisor("dealerCode"), "Dealer Code is blank.");
  if (isBlank(adv.repCode)) blank("N", fieldIds.advisor("repCode"), "Rep Code is blank.");
  for (const q of ADVISOR_QUESTIONS) {
    if (!adv.answers[q.key]) blank("N", fieldIds.advisor(q.key), `“${q.text}” is not answered.`);
  }
  if (isBlank(adv.name)) blank("N", fieldIds.advisor("name"), "Advisor’s Name is blank.");
  if (!adv.signature) add("N", "signature", fieldIds.advisor("signature"), "Advisor’s signature is missing.");
  if (isBlank(adv.date)) blank("N", fieldIds.advisor("date"), "Advisor’s signature date is blank.");

  const count = (kind: IssueKind) => issues.filter((i) => i.kind === kind).length;
  const report = {
    issues,
    blank: count("blank"),
    signatures: count("signature"),
    invalid: count("invalid"),
    review: count("review"),
  };
  return { ...report, complete: report.blank + report.signatures + report.invalid === 0 };
}
