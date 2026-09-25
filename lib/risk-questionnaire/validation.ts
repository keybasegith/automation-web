/**
 * Submission validation for the Client Risk Questionnaire, per edition.
 *
 * Returns errors in the order the fields appear on the form so the caller can
 * focus the first one. Advisor name / signature / date are deliberately NOT
 * required: the advisor countersigns after the client completes their portion.
 */

import { CRQ_FORMS, type CrqFormDefinition } from "./forms";
import type { QuestionnaireState, ValidationError } from "./types";

/** DOM ids, shared by the form controls and the error links. */
export const fieldIds = {
  accountHolderName: "crq-account-holder-name",
  jointHolderName: "crq-joint-holder-name",
  clientId: "crq-client-id",
  question: (questionId: string) => `crq-${questionId}`,
  acknowledgement: "crq-acknowledgement",
  acknowledgementAccountName: "crq-acknowledgement-account-name",
  acknowledgementGoal: "crq-acknowledgement-goal",
  accountHolderSignature: "crq-account-holder-signature",
  accountHolderDate: "crq-account-holder-date",
  jointHolderSignature: "crq-joint-holder-signature",
  jointHolderDate: "crq-joint-holder-date",
} as const;

const isBlank = (value: string): boolean => value.trim().length === 0;

export function validateQuestionnaire(
  state: QuestionnaireState,
  form: CrqFormDefinition = CRQ_FORMS.individual,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const corporate = form.variant === "corporate";
  const joint = form.variant === "joint";

  if (isBlank(state.accountHolderName)) {
    errors.push({
      fieldId: fieldIds.accountHolderName,
      message: corporate ? "Enter the corporation or entity's name." : "Enter the account holder's name.",
    });
  }
  if (joint && isBlank(state.jointHolderName)) {
    errors.push({ fieldId: fieldIds.jointHolderName, message: "Enter the joint account holder's name." });
  }

  for (const question of form.questions) {
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
  } else if (state.acknowledgementType === "single_account") {
    if (isBlank(state.acknowledgementAccountName)) {
      errors.push({
        fieldId: fieldIds.acknowledgementAccountName,
        message: "Enter the account this questionnaire applies to.",
      });
    }
    if (form.acknowledgement.goalChoices && state.acknowledgementGoal === null) {
      errors.push({
        fieldId: fieldIds.acknowledgementGoal,
        message: "Choose Balanced, Growth or High Growth for this joint account.",
      });
    }
  }

  const primary = corporate ? "The Authorized Signing Officer" : "The account holder";
  if (!state.accountHolderSignature) {
    errors.push({ fieldId: fieldIds.accountHolderSignature, message: `${primary} must sign before submitting.` });
  }
  if (isBlank(state.accountHolderDate)) {
    errors.push({ fieldId: fieldIds.accountHolderDate, message: `Enter the date ${primary.toLowerCase()} signed.` });
  }

  if (joint) {
    if (!state.jointHolderSignature) {
      errors.push({ fieldId: fieldIds.jointHolderSignature, message: "The joint account holder must sign before submitting." });
    }
    if (isBlank(state.jointHolderDate)) {
      errors.push({ fieldId: fieldIds.jointHolderDate, message: "Enter the date the joint account holder signed." });
    }
  }

  return errors;
}
