/**
 * Keeps the NAAF and the CRQ in step where they ask for the same thing.
 *
 * Only a field the advisor actually changed is carried across, and only from
 * the form they changed it on — so an edit never bounces back and forth, and
 * the CRQ can still be answered differently afterwards (the difference is then
 * shown on the question; see linkNotes).
 *
 * What is linked, and in which direction:
 *
 *   Client ID                 NAAF header        <->  CRQ header
 *   Account holder's name     NAAF A name        <->  CRQ name (entity name on the corporate CRQ)
 *   Joint holder's name       NAAF B name        <->  CRQ joint name (joint CRQ only)
 *   Advisor's name            NAAF N             <->  CRQ advisor block
 *   Annual income             NAAF C, Client A   <->  CRQ Q3 (not joint)
 *   Net worth                 NAAF C, Client A    ->  CRQ Q5 band (not joint)
 *   Age group                 NAAF A D.O.B.       ->  CRQ Q1 (individual only)
 *
 * The joint CRQ asks one income, net worth and age question of two people, so
 * there is no single NAAF column to fill it from; those stay manual. The CRQ's
 * bands cannot be turned back into a dollar figure or a birth date, which is
 * why net worth and age only flow one way. Signatures and dates are never
 * copied: each form is signed on its own.
 */

import { INCOME_BANDS, type IncomeBand } from "@/lib/naaf/config";
import { netWorth } from "@/lib/naaf/completeness";
import type { NaafState } from "@/lib/naaf/types";
import { QUESTIONS_BY_ID } from "@/lib/risk-questionnaire/config";
import type { CrqVariant, QuestionnaireState, ScoredQuestionId } from "@/lib/risk-questionnaire/types";
import { switchVariant } from "@/lib/risk-questionnaire/variants";

// ---------------------------------------------------------------- names

const joinName = (first: string, surname: string): string =>
  [first.trim(), surname.trim()].filter(Boolean).join(" ");

/** "Mary Ann Smith" -> first "Mary Ann", surname "Smith". One word is a first name. */
export function splitName(full: string): { firstName: string; surname: string } {
  const words = full.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return { firstName: words[0] ?? "", surname: "" };
  return { firstName: words.slice(0, -1).join(" "), surname: words[words.length - 1] };
}

/** The name the CRQ header should show for NAAF Client A. */
export function naafPrimaryName(naaf: NaafState, variant: CrqVariant): string {
  const a = naaf.clientA;
  // A corporate CRQ names the entity, which the NAAF prints in the Surname box.
  return variant === "corporate" ? a.surname.trim() : joinName(a.firstName, a.surname);
}

// ---------------------------------------------------------------- bands

/** NAAF and CRQ print the same eight income ranges, in the same order. */
const INCOME_OPTION_IDS = QUESTIONS_BY_ID.q3.options.map((o) => o.id);

export const crqIncomeOption = (band: IncomeBand | null): string | null =>
  band === null ? null : (INCOME_OPTION_IDS[INCOME_BANDS.indexOf(band)] ?? null);

export const naafIncomeBand = (optionId: string | undefined): IncomeBand | null => {
  const i = optionId ? INCOME_OPTION_IDS.indexOf(optionId) : -1;
  return i >= 0 ? INCOME_BANDS[i] : null;
};

/** CRQ Q5 band for a dollar net worth. A negative net worth is "Less than $50,000". */
export function crqNetWorthOption(value: number | null): string | null {
  if (value === null) return null;
  const letter =
    value < 50_000 ? "a" : value < 100_000 ? "b" : value < 250_000 ? "c" : value < 500_000 ? "d" : value < 1_000_000 ? "e" : "f";
  return `q5_${letter}`;
}

/**
 * The NAAF D.O.B. box as a calendar date. The form prints "mm/dd/yy"; this
 * also accepts mm/dd/yyyy and yyyy-mm-dd. A two-digit year is read as the most
 * recent year it could be (so "85" is 1985, "05" is 2005). Null when the box
 * does not hold a real date in the past.
 */
export function parseDateOfBirth(dob: string, today: Date = new Date()): { year: number; month: number; day: number } | null {
  const text = dob.trim();
  let year: number, month: number, day: number;
  let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else {
    m = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
    if (!m) return null;
    [month, day, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (m[3].length === 2) {
      const century = Math.floor(today.getFullYear() / 100) * 100;
      year += century;
      if (year > today.getFullYear()) year -= 100;
    }
  }
  const born = new Date(year, month - 1, day);
  if (born.getFullYear() !== year || born.getMonth() !== month - 1 || born.getDate() !== day) return null;
  if (born > today) return null;
  return { year, month, day };
}

/** The D.O.B. as an ISO date (yyyy-mm-dd), for storage. */
export function isoDateOfBirth(dob: string, today: Date = new Date()): string | null {
  const d = parseDateOfBirth(dob, today);
  return d ? `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}` : null;
}

/** Age in whole years from the NAAF D.O.B. box, or null. */
export function ageFromDob(dob: string, today: Date = new Date()): number | null {
  const d = parseDateOfBirth(dob, today);
  if (!d) return null;
  let age = today.getFullYear() - d.year;
  if (today.getMonth() < d.month - 1 || (today.getMonth() === d.month - 1 && today.getDate() < d.day)) age -= 1;
  return age;
}

/** CRQ Q1 (individual) age group for an age. */
export function crqAgeOption(age: number | null): string | null {
  if (age === null) return null;
  return age < 35 ? "q1_a" : age < 55 ? "q1_b" : age < 65 ? "q1_c" : "q1_d";
}

// ---------------------------------------------------------------- derived answers

/** The CRQ answers the NAAF implies for this edition. Absent = nothing to derive. */
export function answersFromNaaf(
  naaf: NaafState,
  variant: CrqVariant,
  today: Date = new Date(),
): Partial<Record<ScoredQuestionId, string>> {
  if (variant === "joint") return {};
  const out: Partial<Record<ScoredQuestionId, string>> = {};
  const income = crqIncomeOption(naaf.kyc.A.income);
  if (income) out.q3 = income;
  const worth = crqNetWorthOption(netWorth(naaf.kyc.A));
  if (worth) out.q5 = worth;
  if (variant === "individual") {
    const age = crqAgeOption(ageFromDob(naaf.clientA.dob, today));
    if (age) out.q1 = age;
  }
  return out;
}

// ---------------------------------------------------------------- propagation

/** Applies an edit made on the NAAF to the CRQ. */
export function propagateFromNaaf(
  prev: NaafState,
  next: NaafState,
  crq: QuestionnaireState,
  variant: CrqVariant,
  today: Date = new Date(),
): QuestionnaireState {
  let out = crq;
  const set = (changes: Partial<QuestionnaireState>) => (out = { ...out, ...changes });

  if (prev.clientId !== next.clientId) set({ clientId: next.clientId });
  if (prev.advisor.name !== next.advisor.name) set({ advisorName: next.advisor.name });

  const name = naafPrimaryName(next, variant);
  if (naafPrimaryName(prev, variant) !== name) set({ accountHolderName: name });

  if (variant === "joint") {
    const b = joinName(next.clientB.firstName, next.clientB.surname);
    if (joinName(prev.clientB.firstName, prev.clientB.surname) !== b) set({ jointHolderName: b });
  }

  // Scored answers: carry a derived answer across only when the NAAF value it
  // comes from changed, so an advisor's own CRQ choice is not overwritten by
  // an unrelated edit elsewhere on the NAAF.
  const before = answersFromNaaf(prev, variant, today);
  const after = answersFromNaaf(next, variant, today);
  const answers = { ...out.answers };
  let touched = false;
  for (const id of ["q1", "q3", "q5"] as const) {
    if (before[id] === after[id]) continue;
    touched = true;
    if (after[id]) answers[id] = after[id];
    // Unticking the NAAF income clears the CRQ answer it had filled.
    else if (id === "q3" && answers.q3 === before.q3) delete answers.q3;
  }
  if (touched) set({ answers });

  return out;
}

/** Applies an edit made on the CRQ to the NAAF. */
export function propagateFromCrq(
  prev: QuestionnaireState,
  next: QuestionnaireState,
  naaf: NaafState,
  variant: CrqVariant,
): NaafState {
  let out = naaf;

  if (prev.clientId !== next.clientId) out = { ...out, clientId: next.clientId };
  if (prev.advisorName !== next.advisorName) out = { ...out, advisor: { ...out.advisor, name: next.advisorName } };

  if (prev.accountHolderName !== next.accountHolderName) {
    const names =
      variant === "corporate" ? { surname: next.accountHolderName.trim() } : splitName(next.accountHolderName);
    out = { ...out, clientA: { ...out.clientA, ...names } };
  }

  if (variant === "joint" && prev.jointHolderName !== next.jointHolderName) {
    out = {
      ...out,
      // Naming a joint holder on the CRQ means the NAAF has a Section B to complete.
      hasJointHolder: out.hasJointHolder || next.jointHolderName.trim() !== "",
      clientB: { ...out.clientB, ...splitName(next.jointHolderName) },
    };
  }

  if (variant !== "joint" && prev.answers.q3 !== next.answers.q3) {
    out = { ...out, kyc: { ...out.kyc, A: { ...out.kyc.A, income: naafIncomeBand(next.answers.q3) } } };
  }

  return out;
}

// ---------------------------------------------------------------- notes

export interface LinkNote {
  text: string;
  tone: "linked" | "differs";
}

const SOURCE: Record<"q1" | "q3" | "q5", string> = {
  q1: "the D.O.B. in NAAF Section A",
  q3: "Approximate Income in NAAF Section C",
  q5: "Approximate Net Worth in NAAF Section C",
};

/**
 * For each CRQ question the NAAF also answers: whether the CRQ agrees with it.
 * A disagreement is shown, not corrected — which one is right is for the
 * advisor to decide.
 */
export function linkNotes(
  naaf: NaafState,
  crq: QuestionnaireState,
  variant: CrqVariant,
  today: Date = new Date(),
): Partial<Record<ScoredQuestionId, LinkNote>> {
  const derived = answersFromNaaf(naaf, variant, today);
  const notes: Partial<Record<ScoredQuestionId, LinkNote>> = {};
  for (const id of ["q1", "q3", "q5"] as const) {
    const expected = derived[id];
    if (!expected) continue;
    const answer = crq.answers[id];
    const label = QUESTIONS_BY_ID[id].options.find((o) => o.id === expected)?.label ?? "";
    notes[id] =
      answer === expected
        ? { text: `Filled from ${SOURCE[id]}`, tone: "linked" }
        : { text: `${SOURCE[id]} points to “${label}”`, tone: "differs" };
  }
  return notes;
}

// ---------------------------------------------------------------- edition switch

/**
 * Moves the CRQ to another edition and re-links it to the NAAF: the header
 * names are re-derived (the corporate CRQ names the entity, the others the
 * person), and any question the NAAF can answer that is still blank on the
 * new edition is filled in. Answers already given are kept.
 */
export function relinkForVariant(
  naaf: NaafState,
  crq: QuestionnaireState,
  from: CrqVariant,
  to: CrqVariant,
  today: Date = new Date(),
): QuestionnaireState {
  let out = switchVariant(crq, from, to);
  const name = naafPrimaryName(naaf, to);
  if (name) out = { ...out, accountHolderName: name };
  if (to === "joint") {
    const b = joinName(naaf.clientB.firstName, naaf.clientB.surname);
    if (b) out = { ...out, jointHolderName: b };
  }
  const derived = answersFromNaaf(naaf, to, today);
  const answers = { ...out.answers };
  for (const [id, option] of Object.entries(derived) as [ScoredQuestionId, string][]) {
    if (!answers[id]) answers[id] = option;
  }
  return { ...out, answers };
}
