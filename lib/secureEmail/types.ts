// ---------------------------------------------------------------------------
// Public enums shared between the UI, API, and DB layers.
// ---------------------------------------------------------------------------

export const EMAIL_PURPOSES = [
  // Relationship Management
  "general_client_check_in",
  "personal_milestone_greeting",
  "educational_update",
  // Meetings
  "meeting_scheduling",
  "meeting_follow_up",
  "appointment_reminder",
  "annual_review_reminder",
  // Onboarding
  "new_client_onboarding",
  "account_opening_follow_up",
  "confirmation_needed",
  // Documents and Forms
  "document_reminder",
  "signature_reminder",
  "client_profile_update",
  "client_information_update",
  // Support
  "client_portal_assistance",
  "client_service_follow_up",
] as const;
export type EmailPurpose = (typeof EMAIL_PURPOSES)[number];

export const PURPOSE_LABELS: Record<EmailPurpose, string> = {
  general_client_check_in: "General Client Check In",
  personal_milestone_greeting: "Personal Milestone Greeting",
  educational_update: "Educational Update",
  meeting_scheduling: "Meeting Scheduling",
  meeting_follow_up: "Meeting Follow Up",
  appointment_reminder: "Appointment Reminder",
  annual_review_reminder: "Annual Review Reminder",
  new_client_onboarding: "New Client Onboarding",
  account_opening_follow_up: "Account Opening Follow Up",
  confirmation_needed: "Confirmation Needed",
  document_reminder: "Document Reminder",
  signature_reminder: "Signature Reminder",
  client_profile_update: "Client Profile Update",
  client_information_update: "Client Information Update",
  client_portal_assistance: "Client Portal Assistance",
  client_service_follow_up: "Client Service Follow Up",
};

export const PURPOSE_CATEGORIES = [
  "Relationship Management",
  "Meetings",
  "Onboarding",
  "Documents and Forms",
  "Support",
] as const;
export type PurposeCategory = (typeof PURPOSE_CATEGORIES)[number];

export const PURPOSES_BY_CATEGORY: Record<PurposeCategory, readonly EmailPurpose[]> = {
  "Relationship Management": [
    "general_client_check_in",
    "personal_milestone_greeting",
    "educational_update",
  ],
  Meetings: [
    "meeting_scheduling",
    "meeting_follow_up",
    "appointment_reminder",
    "annual_review_reminder",
  ],
  Onboarding: [
    "new_client_onboarding",
    "account_opening_follow_up",
    "confirmation_needed",
  ],
  "Documents and Forms": [
    "document_reminder",
    "signature_reminder",
    "client_profile_update",
    "client_information_update",
  ],
  Support: ["client_portal_assistance", "client_service_follow_up"],
};

export const CLIENT_SEGMENTS = [
  "Mass affluent",
  "High net worth",
  "Ultra high net worth",
  "Retail",
  "Retiree",
] as const;
export type ClientSegment = (typeof CLIENT_SEGMENTS)[number];

export const CLIENT_STAGES = [
  "Prospect",
  "New client",
  "Long-term client",
  "Re-engagement",
  "Inherited client",
] as const;
export type ClientStage = (typeof CLIENT_STAGES)[number];

export const TONES = [
  "Professional",
  "Reassuring",
  "Friendly",
  "Direct",
] as const;
export type Tone = (typeof TONES)[number];

export const URGENCIES = ["Low", "Standard", "High"] as const;
export type Urgency = (typeof URGENCIES)[number];

export const DRAFT_STATUSES = [
  "draft_generated",
  "advisor_review_required",
  "reviewed",
  "copied",
  "archived",
  "sent",
] as const;
export type DraftStatus = (typeof DRAFT_STATUSES)[number];

export const STATUS_LABELS: Record<DraftStatus, string> = {
  draft_generated: "Draft generated",
  advisor_review_required: "Advisor review required",
  reviewed: "Reviewed",
  copied: "Copied",
  archived: "Archived",
  sent: "Sent to client",
};

// ---------------------------------------------------------------------------
// Request / response payloads
// ---------------------------------------------------------------------------

export const REGENERATION_MODES = [
  "default",
  "softer",
  "more_professional",
] as const;
export type RegenerationMode = (typeof REGENERATION_MODES)[number];

export interface GenerateDraftRequest {
  /**
   * Required. The server uses this to look up the client record and to
   * substitute placeholders after OpenAI returns. The id alone is sent to the
   * route — the client's name and email never touch the OpenAI payload.
   */
  clientId: string;
  emailPurpose: EmailPurpose;
  clientSegment: ClientSegment;
  clientStage: ClientStage;
  communicationGoal: string;
  tone: Tone;
  urgency: Urgency;
  notes?: string;
  regenerationMode?: RegenerationMode;
}

export interface GenerateDraftResponse {
  draftId: string;
  templateName: string;
  subject: string;
  /**
   * Body with placeholders intact (e.g. `[Client First Name]`). This is the
   * exact text the AI returned and the version stored for compliance audit.
   */
  generatedDraft: string;
  /**
   * Personalized body — placeholders have been substituted with the real
   * client and advisor names server-side, AFTER the OpenAI call. This is the
   * version the advisor reviews, edits, and sends.
   */
  finalBody: string;
  /**
   * Recipient email pre-filled from the looked-up client record. Allowed to
   * exist in the browser; never forwarded to OpenAI.
   */
  recipientEmail: string;
  status: DraftStatus;
  riskFlags: string[];
}
