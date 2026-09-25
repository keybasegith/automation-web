/** An unanswered questionnaire. Nothing is pre-selected. */

import { PORTFOLIO_PRIORITIES } from "./config";
import type { PortfolioPriorityId, QuestionnaireState } from "./types";

export const blankQuestionnaire = (): QuestionnaireState => ({
  accountHolderName: "",
  jointHolderName: "",
  clientId: "",
  portfolioPriorities: Object.fromEntries(PORTFOLIO_PRIORITIES.map((p) => [p.id, null])) as Record<
    PortfolioPriorityId,
    number | null
  >,
  investmentCheckFrequency: null,
  answers: {},
  notes: "",
  acknowledgementType: null,
  acknowledgementAccountName: "",
  acknowledgementGoal: null,
  accountHolderSignature: null,
  accountHolderDate: "",
  jointHolderSignature: null,
  jointHolderDate: "",
  advisorName: "",
  advisorSignature: null,
  advisorDate: "",
});
