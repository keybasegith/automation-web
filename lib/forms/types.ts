// =============================================================================
// Form Intelligence & Compliance Review — types shared across UI, API, and DB.
// =============================================================================

export const SUBMISSION_STATUSES = [
  "naaf_uploaded",
  "extraction_completed",
  "kyc_draft_created",
  "crq_draft_created",
  "ready_for_consistency_check",
  "submitted_to_compliance",
  "returned_to_advisor",
  "clarification_requested",
  "approved_by_compliance",
  "rejected_by_compliance",
  "sent_to_bp",
  "pushed_to_windfund",
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  naaf_uploaded: "NAAF uploaded",
  extraction_completed: "Extraction completed",
  kyc_draft_created: "KYC draft",
  crq_draft_created: "CRQ draft",
  ready_for_consistency_check: "Ready for consistency check",
  submitted_to_compliance: "Submitted to compliance",
  returned_to_advisor: "Returned to advisor",
  clarification_requested: "Clarification requested",
  approved_by_compliance: "Approved by compliance",
  rejected_by_compliance: "Rejected by compliance",
  sent_to_bp: "Sent to BP",
  pushed_to_windfund: "Pushed to WindFund",
};

export const FIELD_SOURCES = [
  "extracted",
  "needs_review",
  "missing",
  "manually_edited",
  "auto_filled_from_naaf",
  "manually_entered",
  "suggested_needs_review",
] as const;
export type FieldSource = (typeof FIELD_SOURCES)[number];

export const FIELD_SOURCE_LABELS: Record<FieldSource, string> = {
  extracted: "Extracted",
  needs_review: "Needs review",
  missing: "Missing",
  manually_edited: "Manually edited",
  auto_filled_from_naaf: "Auto-filled from NAAF",
  manually_entered: "Manually entered",
  suggested_needs_review: "Suggested, needs review",
};

// -----------------------------------------------------------------------------
// NAAF
// -----------------------------------------------------------------------------

export interface NaafFields {
  // Client information
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  sin: string;

  // Employment & financial
  employmentStatus: string;
  employerName: string;
  occupation: string;
  annualIncome: string;
  liquidNetWorth: string;
  fixedAssets: string;
  totalNetWorth: string;
  investmentKnowledge: string;
  sourceOfFunds: string;

  // Account information
  accountType: string;
  accountNumber: string;
  accountPurpose: string;
  jurisdiction: string;
  currency: string;
  advisorName: string;
  advisorCode: string;
  branch: string;
  dateCompleted: string;

  // Investment profile
  investmentObjective: string;
  riskTolerance: string;
  timeHorizon: string;
  liquidityNeeds: string;
  intendedUse: string;
  investmentExperience: string;
}

export type NaafField = keyof NaafFields;

export interface ExtractedNAAFData {
  fields: NaafFields;
  rawText: string;
  extractionConfidence: number;
  extractionWarnings: string[];
  fieldConfidenceMap: Partial<Record<NaafField, number>>;
  fieldSourceMap: Partial<Record<NaafField, FieldSource>>;
  uploadedFileName?: string;
  uploadDate?: string;
}

// -----------------------------------------------------------------------------
// KYC
// -----------------------------------------------------------------------------

export interface KycFields {
  clientFullName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  address: string;
  accountType: string;
  employmentStatus: string;
  occupation: string;
  annualIncome: string;
  totalNetWorth: string;
  liquidNetWorth: string;
  investmentKnowledge: string;
  investmentObjective: string;
  riskTolerance: string;
  timeHorizon: string;
  liquidityNeeds: string;
  sourceOfFunds: string;
  advisorName: string;
  advisorCode: string;
  completedDate: string;
}

export type KycField = keyof KycFields;

export interface KycDraft {
  fields: KycFields;
  fieldSourceMap: Partial<Record<KycField, FieldSource>>;
  missingFields: KycField[];
  ready: boolean;
}

// -----------------------------------------------------------------------------
// CRQ
// -----------------------------------------------------------------------------

export interface CrqFields {
  // Safe administrative — auto-fillable from NAAF.
  clientFullName: string;
  accountType: string;
  accountNumber: string;
  advisorName: string;
  advisorCode: string;
  date: string;

  // Subjective risk-related — only auto-filled if exact text exists in NAAF.
  riskTolerance: string;
  investmentObjective: string;
  timeHorizon: string;
  investmentKnowledge: string;
  comfortWithLoss: string;
  reactionToMarketDrop: string;
  primaryInvestmentGoal: string;
  liquidityNeeds: string;
  investmentExperience: string;
  capacityForLoss: string;
  fundsNeededWithin: string;
  volatilityComfort: string;
  incomeNeed: string;
  capitalPreservationNeed: string;
}

export type CrqField = keyof CrqFields;

export const CRQ_SUBJECTIVE_FIELDS: readonly CrqField[] = [
  "riskTolerance",
  "investmentObjective",
  "timeHorizon",
  "investmentKnowledge",
  "comfortWithLoss",
  "reactionToMarketDrop",
  "primaryInvestmentGoal",
  "liquidityNeeds",
  "investmentExperience",
  "capacityForLoss",
  "fundsNeededWithin",
  "volatilityComfort",
  "incomeNeed",
  "capitalPreservationNeed",
] as const;

export interface CrqDraft {
  fields: CrqFields;
  fieldSourceMap: Partial<Record<CrqField, FieldSource>>;
  missingFields: CrqField[];
  needsClientConfirmationFields: CrqField[];
  ready: boolean;
}

// -----------------------------------------------------------------------------
// Consistency
// -----------------------------------------------------------------------------

export const CONSISTENCY_OVERALL_STATUSES = [
  "no_issues_detected",
  "needs_advisor_review",
  "needs_compliance_review",
  "blocked_missing_required",
] as const;
export type ConsistencyOverallStatus =
  (typeof CONSISTENCY_OVERALL_STATUSES)[number];

export const OVERALL_STATUS_LABELS: Record<ConsistencyOverallStatus, string> = {
  no_issues_detected: "No issues detected",
  needs_advisor_review: "Needs advisor review",
  needs_compliance_review: "Needs compliance review",
  blocked_missing_required: "Blocked due to missing required fields",
};

export const FLAG_SEVERITIES = ["Low", "Medium", "High"] as const;
export type FlagSeverity = (typeof FLAG_SEVERITIES)[number];

export const FLAG_CATEGORIES = [
  "client_identity",
  "risk_tolerance",
  "investment_objective",
  "time_horizon",
  "knowledge_experience",
  "capacity_for_loss",
  "liquidity_needs",
  "missing_required_field",
] as const;
export type FlagCategory = (typeof FLAG_CATEGORIES)[number];

export const FLAG_CATEGORY_LABELS: Record<FlagCategory, string> = {
  client_identity: "Client identity",
  risk_tolerance: "Risk tolerance",
  investment_objective: "Investment objective",
  time_horizon: "Time horizon",
  knowledge_experience: "Investment knowledge & experience",
  capacity_for_loss: "Capacity for loss",
  liquidity_needs: "Liquidity needs",
  missing_required_field: "Missing required field",
};

export interface ConsistencyFlag {
  id: string;
  category: FlagCategory;
  severity: FlagSeverity;
  kycField: string | null;
  crqField: string | null;
  kycValue: string | null;
  crqValue: string | null;
  explanation: string;
  recommendedHumanAction: string;
}

export interface ConsistencyCheckResult {
  id?: string;
  submissionId: string;
  overallStatus: ConsistencyOverallStatus;
  flags: ConsistencyFlag[];
  createdAt?: string;
}

// -----------------------------------------------------------------------------
// Compliance review
// -----------------------------------------------------------------------------

export const COMPLIANCE_DECISIONS = [
  "approved",
  "returned_to_advisor",
  "clarification_requested",
  "rejected",
] as const;
export type ComplianceDecision = (typeof COMPLIANCE_DECISIONS)[number];

export const COMPLIANCE_DECISION_LABELS: Record<ComplianceDecision, string> = {
  approved: "Approved",
  returned_to_advisor: "Returned to advisor",
  clarification_requested: "Clarification requested",
  rejected: "Rejected",
};

export interface ComplianceReview {
  id: string;
  submissionId: string;
  reviewerId: string | null;
  decision: ComplianceDecision;
  notes: string | null;
  reviewedAt: string;
  pinVerified: boolean;
}

// -----------------------------------------------------------------------------
// BP processing
// -----------------------------------------------------------------------------

export const BP_STATUSES = [
  "awaiting_processing",
  "in_progress",
  "pushed_to_windfund",
] as const;
export type BpStatus = (typeof BP_STATUSES)[number];

export const BP_STATUS_LABELS: Record<BpStatus, string> = {
  awaiting_processing: "Awaiting processing",
  in_progress: "In progress",
  pushed_to_windfund: "Pushed to WindFund",
};

export interface BpProcessing {
  submissionId: string;
  status: BpStatus;
  pushedToWindFundAt: string | null;
  bpUserId: string | null;
  notes: string | null;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Submission summary (joined view used by the table on the dashboard)
// -----------------------------------------------------------------------------

export interface SubmissionSummary {
  id: string;
  clientName: string;
  advisorName: string | null;
  advisorId: string | null;
  status: SubmissionStatus;
  mismatchCount: number;
  lastUpdated: string;
  createdAt: string;
  complianceStatus: ComplianceDecision | null;
  bpStatus: BpStatus | null;
}

// -----------------------------------------------------------------------------
// Audit
// -----------------------------------------------------------------------------

export const AUDIT_ACTIONS = [
  "naaf_uploaded",
  "ocr_extraction_started",
  "ocr_extraction_completed",
  "extracted_field_edited",
  "kyc_draft_generated",
  "kyc_field_edited",
  "crq_draft_generated",
  "crq_field_edited",
  "consistency_check_run",
  "submitted_to_compliance",
  "returned_to_advisor",
  "clarification_requested",
  "approved_by_compliance",
  "rejected_by_compliance",
  "sent_to_bp",
  "exported_csv",
  "marked_as_pushed_to_windfund",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  naaf_uploaded: "NAAF uploaded",
  ocr_extraction_started: "OCR extraction started",
  ocr_extraction_completed: "OCR extraction completed",
  extracted_field_edited: "Extracted field edited",
  kyc_draft_generated: "KYC draft generated",
  kyc_field_edited: "KYC field edited",
  crq_draft_generated: "CRQ draft generated",
  crq_field_edited: "CRQ field edited",
  consistency_check_run: "Consistency check run",
  submitted_to_compliance: "Submitted to compliance",
  returned_to_advisor: "Returned to advisor",
  clarification_requested: "Clarification requested",
  approved_by_compliance: "Approved by compliance",
  rejected_by_compliance: "Rejected by compliance",
  sent_to_bp: "Sent to BP",
  exported_csv: "Exported CSV",
  marked_as_pushed_to_windfund: "Marked as pushed to WindFund",
};

export interface AuditLogEntry {
  id: string;
  submissionId: string | null;
  userId: string | null;
  userRole: string | null;
  action: AuditAction;
  beforeValue: unknown;
  afterValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}
