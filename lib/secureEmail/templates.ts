import type { EmailPurpose } from "@/lib/secureEmail/types";

/**
 * Approved email templates. The AI is given the rendered template as a starting
 * point and is asked only to polish the language. It is never asked to invent
 * new content from scratch.
 *
 * Square-bracket tokens like [Client First Name] or [Document Name] are
 * intentionally left in the body for the advisor to fill in after generation.
 * The system prompt instructs the model to preserve them verbatim.
 */
export interface ApprovedTemplate {
  name: string;
  subject: string;
  body: string;
}

const TEMPLATES: Record<EmailPurpose, ApprovedTemplate> = {
  general_client_check_in: {
    name: "general-client-check-in-v1",
    subject: "Checking In",
    body: `Hi [Client First Name],

I hope you are doing well.

I wanted to check in and see how everything has been going. If anything has changed in your financial situation, goals, family circumstances, or planning needs, I would be happy to schedule a time to connect.

Please feel free to let me know what works best for you.

Best,
[Advisor Name]`,
  },
  personal_milestone_greeting: {
    name: "personal-milestone-greeting-v1",
    subject: "Thinking of You",
    body: `Hi [Client First Name],

I hope you are doing well.

I wanted to send a quick note to mark your [Birthday / Milestone / Special Occasion]. Wishing you all the best.

Best,
[Advisor Name]`,
  },
  educational_update: {
    name: "educational-update-v1",
    subject: "Educational Update",
    body: `Hi [Client First Name],

I hope you are doing well.

I wanted to share a general educational update that may be helpful as you think about your financial planning.

[Approved Educational Content]

Please note that this is general information only and should not be treated as personalized advice. If you would like to discuss your own situation, I would be happy to schedule a time to connect.

Best,
[Advisor Name]`,
  },
  meeting_scheduling: {
    name: "meeting-scheduling-v1",
    subject: "Scheduling a Time to Connect",
    body: `Hi [Client First Name],

I hope you are doing well.

I would like to schedule a time to connect and review your current planning needs. Please let me know which of the following times works best for you:

[Option 1]
[Option 2]
[Option 3]

Thank you,
[Advisor Name]`,
  },
  meeting_follow_up: {
    name: "meeting-follow-up-v1",
    subject: "Follow Up From Our Meeting",
    body: `Hi [Client First Name],

Thank you for taking the time to meet with me.

I wanted to follow up and summarize the next steps we discussed:

[Next Step 1]
[Next Step 2]
[Next Step 3]

Please review the above when you have a chance. If anything needs to be updated, feel free to let me know.

Best,
[Advisor Name]`,
  },
  appointment_reminder: {
    name: "appointment-reminder-v1",
    subject: "Upcoming Appointment Reminder",
    body: `Hi [Client First Name],

This is a friendly reminder of our upcoming appointment.

Date: [Date]
Time: [Time]
Location or Meeting Link: [Location or Link]

Please let me know if this time still works for you.

Best,
[Advisor Name]`,
  },
  annual_review_reminder: {
    name: "annual-review-reminder-v1",
    subject: "Annual Review",
    body: `Hi [Client First Name],

I hope you are doing well.

It is time for your annual review. This meeting helps us confirm whether your information, goals, and planning needs are still up to date.

Please let me know a convenient time for us to connect.

Best,
[Advisor Name]`,
  },
  new_client_onboarding: {
    name: "new-client-onboarding-v1",
    subject: "Welcome and Next Steps",
    body: `Hi [Client First Name],

Welcome, and thank you for working with us.

To begin the onboarding process, we will need to complete a few steps and confirm the required information. I will guide you through the process and let you know what is needed at each stage.

The next step is:

[Next Step]

Please let me know if you have any questions.

Best,
[Advisor Name]`,
  },
  account_opening_follow_up: {
    name: "account-opening-follow-up-v1",
    subject: "Account Opening Follow Up",
    body: `Hi [Client First Name],

I hope you are doing well.

I wanted to follow up regarding your account opening process. We are currently reviewing the information provided and will let you know if anything else is needed.

Thank you,
[Advisor Name]`,
  },
  confirmation_needed: {
    name: "confirmation-needed-v1",
    subject: "Confirmation Needed",
    body: `Hi [Client First Name],

I hope you are doing well.

Before we proceed, we need your confirmation on the item below:

[Confirmation Item]

Please review and confirm when you have a chance. If anything is unclear, I would be happy to walk through it with you.

Best,
[Advisor Name]`,
  },
  document_reminder: {
    name: "document-reminder-v1",
    subject: "Document Follow Up",
    body: `Hi [Client First Name],

I hope you are doing well.

I wanted to follow up regarding the document listed below:

[Document Name]

When you have a chance, please provide the document through the approved channel or let me know if you have any questions.

Thank you,
[Advisor Name]`,
  },
  signature_reminder: {
    name: "signature-reminder-v1",
    subject: "Signature Follow Up",
    body: `Hi [Client First Name],

I hope you are doing well.

I wanted to follow up regarding the form that still needs your signature:

[Form Name]

Please review and sign it when you have a chance. Let me know if you have any questions before completing it.

Best,
[Advisor Name]`,
  },
  client_profile_update: {
    name: "client-profile-update-v1",
    subject: "Client Profile Update",
    body: `Hi [Client First Name],

I hope you are doing well.

We are updating your client profile to make sure your information remains accurate and current.

Please let me know if there have been any recent changes to your income, employment, financial goals, time horizon, risk comfort level, or personal circumstances.

Best,
[Advisor Name]`,
  },
  client_information_update: {
    name: "client-information-update-v1",
    subject: "Updating Your Information",
    body: `Hi [Client First Name],

I hope you are doing well.

We are reviewing client records and would like to confirm whether your personal information is still current.

Please let me know if there have been any changes to your address, phone number, email, employment information, family details, or planning needs.

Thank you,
[Advisor Name]`,
  },
  client_portal_assistance: {
    name: "client-portal-assistance-v1",
    subject: "Client Portal Assistance",
    body: `Hi [Client First Name],

I hope you are doing well.

I wanted to follow up and see if you need any help accessing the client portal or completing the required step online.

If you have any difficulty logging in or locating the item, please let me know and I can help guide you.

Best,
[Advisor Name]`,
  },
  client_service_follow_up: {
    name: "client-service-follow-up-v1",
    subject: "Follow Up",
    body: `Hi [Client First Name],

I hope you are doing well.

I wanted to follow up on your recent question. We are reviewing the matter and will provide an update once the relevant information has been confirmed.

Thank you for your patience.

Best,
[Advisor Name]`,
  },
};

export function getApprovedTemplate(purpose: EmailPurpose): ApprovedTemplate {
  return TEMPLATES[purpose];
}

/**
 * Render `{{placeholder}}` tokens in the template using the provided context.
 * Square-bracket tokens like `[Client First Name]` are NOT touched here — the
 * advisor fills them in after the AI polish step.
 */
export function renderTemplate(
  template: ApprovedTemplate,
  values: Record<string, string | undefined>
): { name: string; subject: string; body: string } {
  const replace = (input: string): string =>
    input.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
      if (key in values) {
        const v = values[key];
        return typeof v === "string" ? v.trim() : "";
      }
      return `{{${key}}}`;
    });
  return {
    name: template.name,
    subject: replace(template.subject),
    body: replace(template.body),
  };
}

/**
 * Placeholder tokens that the AI is told to leave intact and that the server
 * substitutes after the OpenAI call. Kept here (not in prompt.ts) so the
 * substitution logic and the prompt instructions stay in sync.
 */
export const CLIENT_FIRST_NAME_PLACEHOLDER = "[Client First Name]";
export const ADVISOR_NAME_PLACEHOLDER = "[Advisor Name]";

export interface PersonalizationValues {
  firstName?: string;
  advisorName?: string;
}

/**
 * Replace `[Client First Name]` and/or `[Advisor Name]` with real values.
 * Each value is independent: if `firstName` is omitted/empty, the client
 * first-name placeholder is left in the body. Same for `advisorName`. This
 * lets the pipeline substitute the client first name at generate time and
 * defer the advisor name until the PIN-resolved approval at send time.
 *
 * Intentionally a literal string replace — there is no regex injection
 * vector because the placeholders are exact-string anchored, and the
 * substituted values are stripped of any bracket characters before insert.
 */
export function substitutePlaceholders(
  body: string,
  values: PersonalizationValues
): string {
  let out = body;
  const safeFirst = (values.firstName ?? "").trim();
  if (safeFirst) {
    out = out
      .split(CLIENT_FIRST_NAME_PLACEHOLDER)
      .join(stripBrackets(safeFirst));
  }
  const safeAdvisor = (values.advisorName ?? "").trim();
  if (safeAdvisor) {
    out = out
      .split(ADVISOR_NAME_PLACEHOLDER)
      .join(stripBrackets(safeAdvisor));
  }
  return out;
}

const stripBrackets = (input: string): string => input.replace(/[[\]]/g, "");

/**
 * Append the firm's compliance footer to the draft body. The footer text is
 * sourced from `compliance_settings.mandatory_footer` so the firm controls
 * the exact wording — we never hardcode a disclaimer.
 *
 * If `footer` is empty or whitespace, the body is returned unchanged. If the
 * footer already appears in the body (e.g. the AI included it because it was
 * told to), we don't duplicate it.
 */
export function appendComplianceFooter(body: string, footer: string): string {
  const trimmedBody = body.trimEnd();
  const trimmedFooter = footer.trim();
  if (!trimmedFooter) return trimmedBody + "\n";
  if (trimmedBody.includes(trimmedFooter)) return trimmedBody + "\n";
  return `${trimmedBody}\n\n---\n${trimmedFooter}\n`;
}
