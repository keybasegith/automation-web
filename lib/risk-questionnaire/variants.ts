/** Moving a half-completed questionnaire from one printed edition to another. */

import type { CrqVariant, QuestionnaireState } from "./types";

/**
 * Carries answers across editions where the question means the same thing.
 * The corporate Question 1 (years in operation) is a different question from
 * the individual and joint Question 1 (age group) with different points, so
 * that one answer is dropped rather than reinterpreted. Joint-only fields are
 * kept in state, so switching away and back does not lose them; they are
 * neither shown nor submitted on the other editions.
 */
export function switchVariant(
  state: QuestionnaireState,
  from: CrqVariant,
  to: CrqVariant,
): QuestionnaireState {
  if (from === to) return state;
  const crossesCorporate = (from === "corporate") !== (to === "corporate");
  if (!crossesCorporate) return state;
  const answers = { ...state.answers };
  delete answers.q1;
  return { ...state, answers };
}
