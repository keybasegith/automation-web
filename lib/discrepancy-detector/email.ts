/**
 * Deficiency email drafting — spec 11. DRAFTS ONLY.
 *
 * There is deliberately no SMTP client, no mail API, and no send function
 * anywhere in this module or the tool. It returns text. The reviewer reads it,
 * edits it if needed, and sends it themselves from their own mail client.
 *
 * Wording is templated per discrepancy code so that the same finding always
 * reads the same way. Each code's phrasing is authored once, in ./rules, as the
 * rule's `message` (what is wrong) and `remediation` (what to do about it) —
 * this module composes those into the email rather than restating them, so the
 * two can never drift apart.
 */

import { DEFAULT_CONFIG, type DetectorConfig } from "./config";
import type { EmailDraft, RuleResult, RulesReport } from "./types";

/** "Doe, Jane" and "Jane Doe" both greet as "Jane". */
function greetingName(fullName: string): string {
  const name = fullName.trim();
  if (!name) return "there";
  if (name.includes(",")) {
    const first = name.split(",")[1]?.trim();
    if (first) return first.split(/\s+/)[0];
  }
  return name.split(/\s+/)[0];
}

/** How the client is referred to in the subject and body. */
function clientLabel(clientName: string, clientId: string): string {
  const name = clientName.trim();
  const id = clientId.trim();
  if (name && id) return `${name} (Client ID ${id})`;
  if (name) return name;
  if (id) return `Client ID ${id}`;
  return "this client";
}

const bullet = (item: RuleResult): string =>
  `- ${item.message} ${item.remediation}`.trim().replace(/\s+/g, " ");

export interface EmailDraftInput {
  report: RulesReport;
  advisorName: string;
  advisorEmail: string;
  clientName: string;
  clientId: string;
  config?: DetectorConfig;
}

/**
 * One email aggregating every deficiency found. Notes are included only when
 * config.includeNotesInEmail is on — an under-risk plan is not something the
 * advisor must action.
 */
export function buildEmailDraft(input: EmailDraftInput): EmailDraft {
  const config = input.config ?? DEFAULT_CONFIG;
  const { report } = input;
  const client = clientLabel(input.clientName, input.clientId);

  const lines: string[] = [];
  lines.push(`Hello ${greetingName(input.advisorName)},`);
  lines.push("");
  lines.push(
    `We have reviewed the New Account Application Form (NAAF) and Client Risk Questionnaire (CRQ) submitted for ${client}. The following ${
      report.deficiencies.length === 1 ? "item needs" : "items need"
    } to be corrected before the account can be approved:`
  );
  lines.push("");

  for (const item of report.deficiencies) lines.push(bullet(item));

  if (config.includeNotesInEmail && report.notes.length > 0) {
    lines.push("");
    lines.push("For your information (no action required):");
    lines.push("");
    for (const item of report.notes) lines.push(`- ${item.message}`);
  }

  lines.push("");
  lines.push(
    "Please return the corrected documentation at your earliest convenience. If you believe any of the items above is already correct as submitted, reply with the rationale and we will review it."
  );
  lines.push("");
  lines.push("Thank you,");
  lines.push("Compliance");
  lines.push("Keybase Financial Group");

  return {
    to: input.advisorEmail,
    subject: `New Account - Deficiency - ${client}`,
    body: lines.join("\n"),
  };
}

/** A mailto: link opens the reviewer's own mail client with the draft loaded. Nothing is transmitted by this tool. */
export function mailtoHref(draft: EmailDraft): string {
  const params = new URLSearchParams({ subject: draft.subject, body: draft.body });
  return `mailto:${encodeURIComponent(draft.to)}?${params.toString()}`;
}
