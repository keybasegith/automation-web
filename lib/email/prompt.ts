import type { ComplianceSettings } from "@/lib/db/compliance";
import type { GenerateEmailRequest } from "./types";

export const SYSTEM_PROMPT = `You are a licensed financial advisor assistant writing client emails.
You MUST follow strict financial compliance rules:

- Do NOT provide explicit financial advice
- Do NOT promise returns
- Do NOT use aggressive or misleading language
- Always include reassurance and clarity
- Maintain a professional tone
- Keep language simple and client-friendly

You operate on abstracted, non-identifying inputs ONLY. The client's real
name, email, age, portfolio value, and account details are NEVER provided
to you. You will see categorical fields (risk tolerance, investment horizon,
client type) and event/market context only.

Output rules:
- Return ONLY a JSON object matching the provided schema with "subject" and "body" fields.
- The "body" must be 150-250 words.
- The "body" must NOT contain markdown, headings, or bullet symbols — only natural prose paragraphs.
- Do not include the subject line inside the body.
- Use [CLIENT_NAME] verbatim wherever the client's name belongs. Do NOT invent a name. Do NOT write "Dear Client" or "[Recipient]" — use [CLIENT_NAME] only.
- Avoid recommending specific products, allocations, or actions.
- Avoid mentioning specific dollar amounts, account numbers, or any identifying detail.
- Always invite the client to reach out with questions or to schedule a call.
- Sign off the email with "Your Keybase Advisor" (or the override provided in firm-specific rules). Do NOT use placeholder text like "[Your Name]" or "[Advisor Name]" unless the firm-specific rules below explicitly require [ADVISOR_NAME].`;

// formatCurrency previously surfaced portfolio value in the prompt — that
// field is now intentionally omitted from anything sent to OpenAI.

const formatPercent = (value: number): string =>
  `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

export function buildUserPrompt(input: GenerateEmailRequest): string {
  const { client, event, preferences, marketContext, documentContext } = input;

  const marketSection = marketContext
    ? `
Market Context:
S&P 500 change: ${formatPercent(marketContext.sp500Change)}
NASDAQ change: ${formatPercent(marketContext.nasdaqChange)}
As of: ${marketContext.date}
Trigger severity: ${marketContext.severity}

Severity guidance:
- Low: brief, factual update with calm framing.
- Medium: include reassurance and a reminder of long-term plan alignment.
- High: emphasize calm, perspective on volatility, and openness to schedule a call.
`
    : "";

  const documentSection = documentContext
    ? `
Document Refresh Context:
Priority: ${documentContext.priority}
Outstanding documents:
${documentContext.documents
  .map(
    (d) =>
      `- ${d.type}: ${d.status === "expired" ? `expired on ${d.expiryDate}` : `expiring on ${d.expiryDate}`}`
  )
  .join("\n")}

Email guidance for Document Refresh:
- Politely request the client update the listed documents.
- Briefly explain that this is a routine compliance/regulatory requirement.
- Do NOT provide financial advice, recommendations, or commentary on portfolio.
- Use a professional, courteous tone.
- Always include the sentence: "Please let us know if you have any questions."
- Offer to schedule a call or provide instructions on how to submit updated documents.
`
    : "";

  // ---------------------------------------------------------------------
  // COMPLIANCE INVARIANT — read before editing:
  //   The user prompt is constructed from CATEGORICAL ENUMS only (risk
  //   tolerance, investment horizon, client type) plus generic event /
  //   market / document context. The client's name, age, email, and
  //   portfolio value MUST NOT appear in this string. Personalization is
  //   handled post-hoc via [CLIENT_NAME] / [ADVISOR_NAME] substitution
  //   inside our own system (see lib/compliance/placeholders.ts).
  // ---------------------------------------------------------------------
  return `Generate a client email based on the abstracted parameters below.

Client (anonymized):
Risk Tolerance: ${client.riskTolerance}
Investment Horizon: ${client.investmentHorizon}
Client Type: ${client.clientType}
(Name, age, portfolio value, and account details intentionally omitted.
Use [CLIENT_NAME] wherever a name belongs.)

Event:
Type: ${event.eventType}
Details: ${event.eventDetails || "(no additional details provided)"}
${marketSection}${documentSection}
Advisor Preferences:
Tone: ${preferences.tone}
Style: ${preferences.communicationStyle}

Output format:

Subject:
<email subject>

Body:
<email body>

IMPORTANT:
- No financial recommendations
- No guarantees
- No exact dollar amounts or account numbers
- Use [CLIENT_NAME] for personalization; do not invent a name
- Keep within 150-250 words`;
}

function buildSystemPrompt(settings?: ComplianceSettings): string {
  if (!settings) return SYSTEM_PROMPT;

  const additions: string[] = [];

  if (settings.signature && settings.signature.trim()) {
    additions.push(
      `Sign off the email with exactly: "${settings.signature.trim()}". Do NOT use any other signature, and do NOT use placeholder text like "[Your Name]".`
    );
  }

  if (settings.requiredPhrases.length > 0) {
    additions.push(
      `MANDATORY phrases — include each of the following verbatim somewhere in the body:\n${settings.requiredPhrases
        .map((p) => `- "${p}"`)
        .join("\n")}`
    );
  }

  if (settings.prohibitedPhrases.length > 0) {
    additions.push(
      `PROHIBITED — never use any of the following words or phrases:\n${settings.prohibitedPhrases
        .map((p) => `- "${p}"`)
        .join("\n")}`
    );
  }

  if (settings.mandatoryFooter && settings.mandatoryFooter.trim()) {
    additions.push(
      `Append the following compliance footer at the very end of the body, on its own paragraph, exactly as written:\n\n"${settings.mandatoryFooter.trim()}"`
    );
  }

  if (additions.length === 0) return SYSTEM_PROMPT;

  return `${SYSTEM_PROMPT}\n\nFirm-specific compliance rules (override the above where they conflict):\n\n${additions.join(
    "\n\n"
  )}`;
}

export function buildPrompt(
  input: GenerateEmailRequest,
  settings?: ComplianceSettings
) {
  return {
    systemPrompt: buildSystemPrompt(settings),
    userPrompt: buildUserPrompt(input),
  };
}
