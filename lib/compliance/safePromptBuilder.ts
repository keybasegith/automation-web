/**
 * Safe OpenAI prompt builder.
 *
 * COMPLIANCE INVARIANT — read before editing:
 *   This module accepts ONLY the typed `SafeOpenAIInput` produced by
 *   `sanitizer.ts`. It must not be reachable with any other input shape.
 *   The output strings are designed to be sent directly to OpenAI; nothing
 *   in them carries client identity or financial figures.
 *
 *   The system prompt locks the model into placeholder-only output. The
 *   substitution to real values happens later, inside our system, in
 *   `placeholders.ts`.
 */

import type { SafeOpenAIInput } from "./sanitizer";

const SYSTEM_PROMPT = [
  "You are a drafting assistant for a Canadian financial advisor.",
  "You write client emails based on abstracted, non-identifying inputs only.",
  "",
  "STRICT COMPLIANCE RULES — these override everything else:",
  "- Do NOT provide investment advice.",
  "- Do NOT mention guaranteed returns or imply performance promises.",
  "- Do NOT recommend specific securities, funds, products, or allocations.",
  "- Do NOT include client-specific financial details, account numbers, or dollar amounts.",
  "- Do NOT include personally identifiable information of any kind.",
  "- Do NOT make tax-advice claims; if relevant, suggest consulting a tax professional.",
  "- Do NOT claim something is compliance-approved, pre-approved, or guaranteed.",
  "- Use placeholders [CLIENT_NAME], [ADVISOR_NAME], [FIRM_NAME], [DATE], [DOCUMENT_NAME], [MEETING_DATE], [MEETING_TIME] verbatim where personalization belongs.",
  "  Do NOT invent a name, do NOT write '[Your Name]' or '[Recipient]' — use only the listed placeholders.",
  "- The output is reviewed by a human advisor before sending. It is a draft, not a final message.",
  "",
  "OUTPUT FORMAT:",
  "Return ONLY a JSON object with two fields:",
  '  { "subject": "<short subject line>", "body": "<email body, 120-240 words, no markdown, plain prose paragraphs>" }',
  "The body must use the placeholders above. Do not include the subject line inside the body.",
].join("\n");

/**
 * Build the user-facing portion of the prompt from the sanitized input.
 * The strings here come from a fixed enum vocabulary (see sanitizer.ts) so
 * there is no path for client data to leak into this prompt — except via
 * `communicationGoal`, which the sanitizer has already PII-scanned and
 * rejected on any hit.
 */
function buildUserPrompt(input: SafeOpenAIInput): string {
  return [
    "Draft a client email with the following abstracted parameters:",
    "",
    `Email category: ${input.emailCategory}`,
    `Client segment: ${input.clientSegment}`,
    `Client stage: ${input.clientStage}`,
    `Tone: ${input.tone}`,
    `Urgency: ${input.urgency}`,
    `Communication goal: ${input.communicationGoal}`,
    "",
    `Allowed placeholders: ${input.placeholders.join(", ")}`,
    "",
    "Return only the JSON object. The advisor will substitute placeholders inside our system; do not personalize beyond inserting the placeholder tokens.",
  ].join("\n");
}

export interface SafePromptOutput {
  systemPrompt: string;
  userPrompt: string;
}

export function buildSafePrompt(input: SafeOpenAIInput): SafePromptOutput {
  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(input),
  };
}

/** Exposed for tests + audit metadata. */
export { SYSTEM_PROMPT };
