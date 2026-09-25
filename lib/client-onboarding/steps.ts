/**
 * The onboarding wizard's steps, and how complete each one is.
 *
 * A step's status is not tracked separately: it is read off the same checks
 * the digital forms run — checkNaaf for the NAAF and validateQuestionnaire for
 * the CRQ — by sorting each finding into the step whose screen has the box.
 * So the tick beside a step and the blank-box check on the paper form can
 * never disagree.
 */

import { checkNaaf, type NaafIssue } from "@/lib/naaf/completeness";
import { CRQ_FORMS } from "@/lib/risk-questionnaire/forms";
import { fieldIds as crqFieldIds, validateQuestionnaire } from "@/lib/risk-questionnaire/validation";

import type { OnboardingDraft } from "./draft";
import { missingRequirements, supportingFieldId } from "./supporting";

export type StepId =
  | "start"
  | "holder"
  | "identity"
  | "employment"
  | "joint"
  | "financial"
  | "plans"
  | "risk"
  | "contacts"
  | "advisor"
  | "documents"
  | "review";

export interface StepDefinition {
  id: StepId;
  title: string;
  /** One line under the title in the menu. */
  hint: string;
}

const ALL_STEPS: Record<StepId, StepDefinition> = {
  start: { id: "start", title: "Getting started", hint: "Account type and application" },
  holder: { id: "holder", title: "Account holder", hint: "Name, date of birth, contact" },
  identity: { id: "identity", title: "Identification", hint: "ID, PEP, citizenship" },
  employment: { id: "employment", title: "Employment & family", hint: "Employer, marital status" },
  joint: { id: "joint", title: "Joint account holder", hint: "Client B" },
  financial: { id: "financial", title: "Financial profile", hint: "Income, net worth, experience" },
  plans: { id: "plans", title: "Investment plans", hint: "Plans, objectives, banking" },
  risk: { id: "risk", title: "Risk questionnaire", hint: "CRQ questions 1–12" },
  contacts: { id: "contacts", title: "Trusted contact & consents", hint: "TCP, CASL, EDD" },
  advisor: { id: "advisor", title: "Advisor", hint: "Codes, disclosures" },
  documents: { id: "documents", title: "Supporting documents", hint: "ID, RC518/RC519, declarations" },
  review: { id: "review", title: "Review & sign", hint: "Check, sign, generate" },
};

/** The steps that apply to this application, in order. */
export function stepsFor(draft: OnboardingDraft): StepDefinition[] {
  const corporate = draft.variant === "corporate";
  const joint = draft.naaf.hasJointHolder;
  // Section B holds a joint holder on a joint account, and otherwise a third
  // party (POA, trustee, officer) that Section G says must complete it.
  const sectionB: StepDefinition =
    draft.variant === "joint"
      ? ALL_STEPS.joint
      : { id: "joint", title: "Third party (Section B)", hint: "POA, trustee, officer" };
  const ids: StepId[] = [
    "start",
    "holder",
    "identity",
    // An entity has no employer, marital status or dependants on the NAAF.
    ...(corporate ? [] : (["employment"] as StepId[])),
    ...(joint ? (["joint"] as StepId[]) : []),
    "financial",
    "plans",
    "risk",
    "contacts",
    "advisor",
    "documents",
    "review",
  ];
  return ids.map((id) => (id === "joint" ? sectionB : ALL_STEPS[id]));
}

// ---------------------------------------------------------------- sorting findings

const HOLDER_FIELDS = new Set([
  "holderType", "gender", "surname", "firstName", "initials", "sin", "dob",
  "address", "apt", "city", "province", "postalCode", "homePhone", "businessPhone", "cellPhone", "email",
]);
const IDENTITY_FIELDS = new Set([
  "idMethod", "idType", "documentId", "dateOfIssue", "placeOfIssue", "jurisdiction", "issuingCountry",
  "dateOfExpiry", "pep", "pepAssociate", "citizenship", "citizenshipOther",
]);

/** Which step's screen holds the box a NAAF finding points at. */
export function stepForNaafIssue(issue: NaafIssue): StepId {
  const { section, fieldId } = issue;
  if (section === "header") return "start";
  if (fieldId === "naaf-client-id") return "start";
  if (fieldId === "naaf-joint-toggle") return "plans";
  if (section === "A") {
    const field = fieldId.replace(/^naaf-A-/, "");
    if (HOLDER_FIELDS.has(field)) return "holder";
    if (IDENTITY_FIELDS.has(field)) return "identity";
    return "employment";
  }
  if (section === "B") return "joint";
  if (section === "C") return "financial";
  if (section === "D" || section === "E" || section === "F" || section === "G" || section === "H") return "plans";
  if (section === "I" || section === "J" || section === "K") return "contacts";
  if (section === "L") return "advisor";
  if (section === "N") return fieldId === "naaf-advisor-signature" || fieldId === "naaf-advisor-date" ? "review" : "advisor";
  return "review"; // M — client signatures
}

export interface StepFinding {
  step: StepId;
  /** Where the finding came from, for the review screen. */
  form: "NAAF" | "CRQ";
  kind: "blank" | "signature" | "invalid" | "review";
  message: string;
  /** The field it concerns — the form's own DOM id, used as a stable key. */
  fieldId: string;
}

const CRQ_SIGNING_FIELDS = new Set<string>([
  crqFieldIds.accountHolderSignature,
  crqFieldIds.accountHolderDate,
  crqFieldIds.jointHolderSignature,
  crqFieldIds.jointHolderDate,
]);

/** Every open item across both forms, each assigned to its step. */
export function findingsFor(draft: OnboardingDraft): StepFinding[] {
  const naaf = checkNaaf(draft.naaf).issues.map<StepFinding>((issue) => ({
    step: stepForNaafIssue(issue),
    form: "NAAF",
    kind: issue.kind,
    message: issue.message,
    fieldId: issue.fieldId,
  }));

  const crq = validateQuestionnaire(draft.crq, CRQ_FORMS[draft.variant]).map<StepFinding>((error) => {
    const signing = CRQ_SIGNING_FIELDS.has(error.fieldId);
    // Names come from the account holder screens and are copied into the CRQ,
    // so a missing CRQ name is fixed there, not on the questionnaire.
    const step: StepId = signing
      ? "review"
      : error.fieldId === crqFieldIds.accountHolderName
        ? "holder"
        : error.fieldId === crqFieldIds.jointHolderName
          ? "joint"
          : "risk";
    const kind = signing && error.fieldId.endsWith("signature") ? "signature" : "blank";
    return { step, form: "CRQ", kind, message: error.message, fieldId: error.fieldId };
  });

  const documents = missingRequirements(draft.naaf, draft.supporting).map<StepFinding>((r) => ({
    step: "documents",
    form: "NAAF",
    kind: "blank",
    message: `${r.title} — upload a copy or confirm it is on file.`,
    fieldId: supportingFieldId(r.id),
  }));

  return [...naaf, ...crq, ...documents];
}

export type StepStatus = "complete" | "attention" | "incomplete";

/**
 * complete    nothing open
 * attention   only optional blanks the advisor should confirm
 * incomplete  a required box is blank, a value is wrong, or a signature is missing
 */
export function stepStatus(findings: readonly StepFinding[], step: StepId): StepStatus {
  const mine = findings.filter((f) => f.step === step);
  if (mine.some((f) => f.kind !== "review")) return "incomplete";
  return mine.length > 0 ? "attention" : "complete";
}

/**
 * Signing dates are stamped with the day of signing when the documents are
 * signed, so they are never something the advisor has to fill in first.
 */
const SIGNING_DATE_FIELDS = new Set<string>([
  "naaf-client-date-1",
  "naaf-client-date-2",
  "naaf-advisor-date",
  crqFieldIds.accountHolderDate,
  crqFieldIds.jointHolderDate,
]);

/**
 * What must be fixed before the documents can go for signature: every blank
 * or wrong value, except the signatures themselves and their dates. Optional
 * blanks ("review") do not block.
 */
export const blockingBeforeSigning = (findings: readonly StepFinding[]): StepFinding[] =>
  findings.filter(
    (f) => (f.kind === "blank" || f.kind === "invalid") && !SIGNING_DATE_FIELDS.has(f.fieldId),
  );
