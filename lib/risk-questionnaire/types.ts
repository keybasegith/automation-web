/**
 * Client Risk Questionnaire — Individual Account Holder (source form v2-crq25).
 *
 * Types only. The authoritative content (wording, options, point values and
 * risk-level thresholds) lives in ./config.ts; the arithmetic lives in
 * ./scoring.ts. Nothing here may be derived from rendered text — a point value
 * is always structured data attached to an option id.
 */

export type RiskSection = "capacity" | "tolerance";

export type ScoredQuestionId =
  | "q1" | "q2" | "q3" | "q4" | "q5" | "q6"
  | "q7" | "q8" | "q9" | "q10" | "q11" | "q12";

export interface AnswerOption {
  /** Stable id, stored with the submission so a result can be audited later. */
  id: string;
  /** Source letter as printed on the form ("a", "b", … ). */
  letter: string;
  /** Answer text exactly as printed, without the trailing point annotation. */
  label: string;
  /** Point annotation exactly as printed, e.g. "(1 pts)". Display only. */
  pointsLabel: string;
  /** The score this option contributes. The only value scoring may read. */
  points: number;
}

export interface RiskQuestion {
  id: ScoredQuestionId;
  number: number;
  section: RiskSection;
  /** Question text exactly as printed, without the leading number. */
  question: string;
  instruction: string;
  options: readonly AnswerOption[];
  /** Chart printed as part of the question (Q10, Q12). */
  chart?: {
    src: string;
    alt: string;
    /** Intrinsic pixel size of the extracted asset. */
    width: number;
    height: number;
  };
}

/** Unscored lead-in question with a single-select answer. */
export interface UnscoredQuestion {
  id: string;
  question: string;
  instruction: string;
  options: readonly { id: string; letter: string; label: string }[];
}

export type PortfolioPriorityId =
  | "taxSavings"
  | "childEducation"
  | "retirementPlanning"
  | "estatePlanning"
  | "savings";

export type InvestmentCheckFrequency =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "annually";

export type RiskLevel =
  | "Low"
  | "Low Medium"
  | "Medium"
  | "Medium High"
  | "High";

export interface RiskLevelBand {
  level: RiskLevel;
  /** Inclusive lower bound. */
  min: number;
  /** Inclusive upper bound. */
  max: number;
  /** Range exactly as printed on the source form. */
  display: string;
}

/**
 * A score does not always land inside a printed band — see the score-12 gap
 * documented in config.ts. Rather than inventing a rule, an unbanded score is
 * surfaced for advisor review.
 */
export type RiskLevelResolution =
  | { status: "resolved"; level: RiskLevel }
  | { status: "requires_review"; score: number; reason: string };

/** A section total is only meaningful once every question in it is answered. */
export interface SectionScore {
  /** Total points, or null while the section is incomplete. */
  score: number | null;
  answered: number;
  total: number;
  complete: boolean;
}

export type AcknowledgementType = "all_accounts" | "single_account";

/** Everything the client fills in. Held as one object in React state. */
export interface QuestionnaireState {
  accountHolderName: string;
  clientId: string;
  portfolioPriorities: Record<PortfolioPriorityId, number | null>;
  investmentCheckFrequency: InvestmentCheckFrequency | null;
  /** questionId -> selected option id. Absent means unanswered. */
  answers: Partial<Record<ScoredQuestionId, string>>;
  notes: string;
  acknowledgementType: AcknowledgementType | null;
  acknowledgementAccountName: string;
  accountHolderSignature: string | null;
  accountHolderDate: string;
  advisorName: string;
  advisorSignature: string | null;
  advisorDate: string;
}

/** One selected answer, kept as id + points so results stay auditable. */
export interface RecordedAnswer {
  optionId: string;
  points: number;
}

export interface QuestionnaireSubmission {
  formVersion: string;
  accountHolderName: string;
  clientId: string;
  portfolioPriorities: Record<PortfolioPriorityId, number | null>;
  investmentCheckFrequency: InvestmentCheckFrequency | null;
  answers: Record<ScoredQuestionId, RecordedAnswer>;
  riskCapacityScore: number;
  riskCapacityLevel: RiskLevel | null;
  riskToleranceScore: number;
  riskToleranceLevel: RiskLevel | null;
  finalRiskRanking: RiskLevel | null;
  /** Set when a score fell outside every printed band. */
  reviewNotice: string | null;
  notes: string;
  acknowledgement: {
    type: AcknowledgementType;
    accountName: string | null;
  };
  accountHolderSignature: string;
  accountHolderDate: string;
  advisorName: string | null;
  advisorSignature: string | null;
  advisorDate: string | null;
  completedAt: string;
}

/** A single validation failure, anchored to the field that must be fixed. */
export interface ValidationError {
  /** DOM id of the control (or its fieldset) to focus. */
  fieldId: string;
  message: string;
}
