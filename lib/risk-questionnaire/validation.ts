/**
 * Submission validation for the Client Risk Questionnaire.
 *
 * Returns errors in the order the fields appear on the form so the caller can
 * focus the first one. Advisor name / signature / date are deliberately NOT
 * required: the advisor countersigns after the client completes their portion.
 */

import { RISK_QUESTIONS } from "./config";
import type { QuestionnaireState, ValidationError } from "./types";

/** DOM ids, shared by the form controls and the error links. */
export const fieldIds = {
  accountHolderName: "crq-account-holder-name",
  clientId: "crq-client-id",
  question: (questionId: string) => `crq-${questionId}`,
  acknowledgement: "crq-acknowledgement",
  acknowledgementAccountName: "crq-acknowledgement-account-name",
  accountHolderSignature: "crq-account-holder-signature",
  accountHolderDate: "crq-account-holder-date",
} as const;

const isBlank = (value: string): boolean => value.trim().length === 0;

export function validateQuestionnaire(
  state: QuestionnaireState,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (isBlank(state.accountHolderName)) {
    errors.push({
      fieldId: fieldIds.accountHolderName,
      message: "Enter the account holder's name.",
    });
  }

  for (const question of RISK_QUESTIONS) {
    if (!state.answers[question.id]) {
      errors.push({
        fieldId: fieldIds.question(question.id),
        message: `Question ${question.number} has not been answered.`,
      });
    }
  }

  if (state.acknowledgementType === null) {
    errors.push({
      fieldId: fieldIds.acknowledgement,
      message: "Select one client acknowledgement.",
    });
  } else if (
    state.acknowledgementType === "single_account" &&
    isBlank(state.acknowledgementAccountName)
  ) {
    errors.push({
      fieldId: fieldIds.acknowledgementAccountName,
      message: "Enter the account this questionnaire applies to.",
    });
  }

  if (!state.accountHolderSignature) {
    errors.push({
      fieldId: fieldIds.accountHolderSignature,
      message: "The account holder must sign before submitting.",
    });
  }

  if (isBlank(state.accountHolderDate)) {
    errors.push({
      fieldId: fieldIds.accountHolderDate,
      message: "Enter the date the account holder signed.",
    });
  }

  return errors;
}
