/**
 * One client onboarding in progress: the NAAF and the CRQ, answered once.
 *
 * The wizard (/onboarding/new) and the side-by-side forms
 * (/dashboard/new-account) both edit this same shape, and both route every
 * edit through lib/new-account/sync so the fields the two forms share stay in
 * step whichever screen they were typed on.
 */

import { blankNaaf } from "@/lib/naaf/blank";
import { isEntity, isPlanInUse } from "@/lib/naaf/completeness";
import type { NaafState } from "@/lib/naaf/types";
import { propagateFromCrq, propagateFromNaaf, relinkForVariant } from "@/lib/new-account/sync";
import { blankQuestionnaire } from "@/lib/risk-questionnaire/blank";
import type { CrqVariant, QuestionnaireState } from "@/lib/risk-questionnaire/types";

import type { SupportingState } from "./supporting";

export type AccountKind = CrqVariant; // individual | joint | corporate

export type SigningMethod = "in_person" | "remote";

export interface OnboardingDraft {
  naaf: NaafState;
  crq: QuestionnaireState;
  /** Which CRQ edition applies; also what kind of account this is. */
  variant: CrqVariant;
  /** Supporting documents uploaded or confirmed on file (lib/client-onboarding/supporting). */
  supporting: SupportingState;
}

export const blankDraft = (variant: CrqVariant = "individual"): OnboardingDraft => ({
  naaf: { ...blankNaaf(), hasJointHolder: variant === "joint" },
  crq: blankQuestionnaire(),
  variant,
  supporting: {},
});

/**
 * Fixes up what the NAAF requires but a single-holder application would never
 * ask: every plan in use must tick Client A or Client B, and with no Section B
 * the owner can only be Client A.
 */
function normalizeNaaf(naaf: NaafState): NaafState {
  if (naaf.hasJointHolder) return naaf;
  let changed = false;
  const plans = naaf.plans.map((plan, i) => {
    if (plan.owner === "A" || !isPlanInUse(plan, i)) return plan;
    changed = true;
    return { ...plan, owner: "A" as const };
  });
  return changed ? { ...naaf, plans } : naaf;
}

/** Applies an edit to the NAAF and carries shared fields into the CRQ. */
export function editNaaf(draft: OnboardingDraft, update: (prev: NaafState) => NaafState): OnboardingDraft {
  const naaf = normalizeNaaf(update(draft.naaf));
  return { ...draft, naaf, crq: propagateFromNaaf(draft.naaf, naaf, draft.crq, draft.variant) };
}

/** Applies an edit to the CRQ and carries shared fields into the NAAF. */
export function editCrq(
  draft: OnboardingDraft,
  update: (prev: QuestionnaireState) => QuestionnaireState,
): OnboardingDraft {
  const crq = update(draft.crq);
  return { ...draft, crq, naaf: propagateFromCrq(draft.crq, crq, draft.naaf, draft.variant) };
}

/**
 * Changes what kind of account this is. The account kind decides the CRQ
 * edition, whether the NAAF has a Section B, and — for a corporation — that
 * Client A is an entity.
 */
export function setAccountKind(draft: OnboardingDraft, kind: AccountKind): OnboardingDraft {
  if (kind === draft.variant) return draft;
  const a = draft.naaf.clientA;
  const entity = isEntity(a.holderType);
  const naaf: NaafState = {
    ...draft.naaf,
    hasJointHolder: kind === "joint",
    // A corporation's Client A is an entity; keep Estate / Trust / Gov't if already chosen.
    clientA:
      kind === "corporate"
        ? entity
          ? a
          : { ...a, holderType: "Entity", gender: null }
        : entity
          ? { ...a, holderType: null }
          : a,
  };
  return {
    ...draft,
    naaf: normalizeNaaf(naaf),
    variant: kind,
    crq: relinkForVariant(naaf, draft.crq, draft.variant, kind),
  };
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Lays a stored value over the blank shape, at every depth: missing keys take
 * the blank's value, and a value of the wrong kind (an object where a string
 * belongs, say) is dropped. Arrays of objects are filled element by element;
 * arrays of strings are taken as stored.
 */
function fillFrom<T>(blank: T, value: unknown): T {
  if (value === undefined) return blank;
  if (Array.isArray(blank)) {
    if (!Array.isArray(value)) return blank;
    const template = blank[0];
    if (isPlainObject(template)) {
      // Fixed-length lists (plans, signature slots) keep their length.
      const length = Math.max(blank.length, 0);
      return Array.from({ length }, (_, i) => fillFrom(blank[i] ?? template, value[i])) as T;
    }
    return value.filter((v) => typeof v === "string") as T;
  }
  if (isPlainObject(blank)) {
    if (!isPlainObject(value)) return blank;
    // An open-ended record (the CRQ's answers: question id -> option id) has
    // no keys in its blank; keep whatever string entries were stored.
    if (Object.keys(blank).length === 0) {
      return Object.fromEntries(Object.entries(value).filter(([, v]) => typeof v === "string")) as T;
    }
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(blank)) out[key] = fillFrom((blank as Record<string, unknown>)[key], value[key]);
    return out as T;
  }
  // A leaf: keep the stored value if it is the same kind as the blank's.
  // Nullable fields (a choice, a rank, a signature) are null in the blank, so
  // any primitive or null is accepted there.
  if (blank === null) {
    return (value === null || ["string", "number", "boolean"].includes(typeof value) ? value : null) as T;
  }
  return (typeof value === typeof blank ? value : blank) as T;
}

/**
 * Checks a draft that came back from the network or the database has the
 * expected shape, filling any fields a newer form added since it was saved.
 * Returns null for anything that is not a draft at all.
 */
export function reviveDraft(value: unknown): OnboardingDraft | null {
  if (!isPlainObject(value)) return null;
  if (!isPlainObject(value.naaf) || !isPlainObject(value.crq)) return null;
  const variant: CrqVariant =
    value.variant === "joint" || value.variant === "corporate" || value.variant === "individual" ? value.variant : "individual";
  const base = blankDraft(variant);
  return {
    variant,
    naaf: fillFrom(base.naaf, value.naaf),
    crq: fillFrom(base.crq, value.crq),
    supporting: reviveSupporting(value.supporting),
  };
}

/** Keeps only well-formed supporting-document entries. */
function reviveSupporting(value: unknown): SupportingState {
  if (!isPlainObject(value)) return {};
  const out: SupportingState = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!isPlainObject(entry)) continue;
    if (entry.status === "on_file") out[key as keyof SupportingState] = { status: "on_file" };
    else if (entry.status === "uploaded" && typeof entry.documentId === "string" && typeof entry.fileName === "string") {
      out[key as keyof SupportingState] = { status: "uploaded", documentId: entry.documentId, fileName: entry.fileName };
    }
  }
  return out;
}
