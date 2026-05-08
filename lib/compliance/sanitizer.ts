/**
 * Data sanitization layer for AI generation flows.
 *
 * COMPLIANCE INVARIANT — read before editing:
 *   The output of `sanitizeForOpenAI()` is the ONLY shape allowed to leave
 *   our backend for OpenAI (or any external LLM provider). It must never
 *   contain client personally identifiable information, financial figures,
 *   account identifiers, raw form contents, or any other client-specific
 *   data that could re-identify the individual or expose their finances.
 *
 *   Any new field added here MUST be safe to log to a third-party API.
 *   When in doubt, default to placeholders — substitution happens AFTER
 *   the model returns, inside our own system, in `placeholders.ts`.
 */

export const CLIENT_SEGMENTS = [
  "prospect",
  "new client",
  "existing client",
  "long-term client",
  "departed client",
] as const;
export type ClientSegment = (typeof CLIENT_SEGMENTS)[number];

export const CLIENT_STAGES = [
  "onboarding",
  "active",
  "KYC refresh required",
  "review pending",
  "documents outstanding",
  "follow-up needed",
  "off-boarding",
] as const;
export type ClientStage = (typeof CLIENT_STAGES)[number];

export const EMAIL_CATEGORIES = [
  "KYC_UPDATE_REMINDER",
  "DOCUMENT_REMINDER",
  "MEETING_SCHEDULING",
  "MEETING_FOLLOW_UP",
  "ANNUAL_REVIEW_REMINDER",
  "GENERAL_CHECK_IN",
  "MILESTONE_GREETING",
  "EDUCATIONAL_UPDATE",
  "SIGNATURE_REMINDER",
  "ONBOARDING_WELCOME",
  "ACCOUNT_OPENING_FOLLOW_UP",
  "CLIENT_PORTAL_ASSISTANCE",
  "CLIENT_SERVICE_FOLLOW_UP",
  "GENERIC",
] as const;
export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

export const TONES = ["professional", "warm", "concise", "friendly"] as const;
export type Tone = (typeof TONES)[number];

export const URGENCIES = ["low", "medium", "high"] as const;
export type Urgency = (typeof URGENCIES)[number];

/**
 * Allowed placeholder tokens. Their actual values stay inside our system
 * and are filled in by `placeholders.ts` AFTER the model has returned.
 */
export const ALLOWED_PLACEHOLDERS = [
  "[CLIENT_NAME]",
  "[CLIENT_FIRST_NAME]",
  "[ADVISOR_NAME]",
  "[FIRM_NAME]",
  "[DATE]",
  "[DOCUMENT_NAME]",
  "[MEETING_DATE]",
  "[MEETING_TIME]",
] as const;
export type AllowedPlaceholder = (typeof ALLOWED_PLACEHOLDERS)[number];

/**
 * The exact shape that may be sent to OpenAI. No identifiers or financial
 * values appear here — only abstracted, non-identifying enums + a free-form
 * communication goal that the caller is responsible for keeping clean.
 */
export interface SafeOpenAIInput {
  clientSegment: ClientSegment;
  clientStage: ClientStage;
  emailCategory: EmailCategory;
  tone: Tone;
  urgency: Urgency;
  /**
   * One sentence describing the WHY of the email, written by the advisor.
   * The sanitizer does not interpret it but does scan it for PII patterns —
   * any hit means the request is REJECTED, not silently scrubbed.
   */
  communicationGoal: string;
  placeholders: AllowedPlaceholder[];
}

/**
 * Raw inputs the caller may pass in. Anything not on this whitelist is
 * dropped silently. The sanitizer is the source of truth for what enters
 * the SafeOpenAIInput.
 */
export interface SanitizerRawInput {
  clientSegment?: unknown;
  clientStage?: unknown;
  emailCategory?: unknown;
  tone?: unknown;
  urgency?: unknown;
  communicationGoal?: unknown;
}

/**
 * Patterns that, if present in the communicationGoal, mean the advisor
 * accidentally pasted PII / financial data into the goal field. We refuse
 * the request rather than silently scrubbing — the right fix is for the
 * advisor to rewrite the goal abstractly.
 */
const PII_REJECT_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "social_insurance_number", pattern: /\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/ },
  {
    name: "exact_dollar_amount",
    pattern: /\$\s?\d{1,3}(?:[,\s]?\d{3})+(?:\.\d{2})?\b|\$\s?\d{4,}\b/,
  },
  { name: "phone_number", pattern: /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/ },
  {
    name: "email_address",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  },
  {
    name: "account_number",
    pattern:
      /\b(?:account\s*(?:no|number|#)?\s*[:#-]?\s*[A-Z0-9-]{6,}|[A-Z]{2}\d{2}[A-Z0-9]{10,})\b/i,
  },
  { name: "long_digit_sequence", pattern: /(?<!\$)\b\d{7,}\b/ },
  {
    name: "date_of_birth",
    pattern: /\b(?:dob|date of birth|born on)\b/i,
  },
];

export interface SanitizeError {
  ok: false;
  reason: string;
  field: keyof SafeOpenAIInput | "rawInput";
  matchedText?: string;
}

export interface SanitizeSuccess {
  ok: true;
  safe: SafeOpenAIInput;
}

export type SanitizeResult = SanitizeError | SanitizeSuccess;

const inSet = <T extends string>(value: unknown, set: readonly T[]): value is T =>
  typeof value === "string" && (set as readonly string[]).includes(value);

/**
 * Build the safe input that may be sent to OpenAI. Returns a typed
 * discriminated union so callers cannot forget to handle the failure case.
 *
 * On any PII hit in `communicationGoal`, returns `{ ok: false }` — the
 * caller MUST surface this back to the advisor and refuse to call OpenAI.
 *
 * Note: this function deliberately does NOT take `clientId`, `clientName`,
 * `email`, `accountNumber`, `portfolioValue`, or any other identifying
 * field. If you find yourself wanting to add one, stop — the right answer
 * is a placeholder substituted post-generation.
 */
export function sanitizeForOpenAI(input: SanitizerRawInput): SanitizeResult {
  if (!input || typeof input !== "object") {
    return { ok: false, reason: "Input must be an object.", field: "rawInput" };
  }

  if (!inSet(input.clientSegment, CLIENT_SEGMENTS)) {
    return {
      ok: false,
      reason: `clientSegment must be one of: ${CLIENT_SEGMENTS.join(", ")}.`,
      field: "clientSegment",
    };
  }
  if (!inSet(input.clientStage, CLIENT_STAGES)) {
    return {
      ok: false,
      reason: `clientStage must be one of: ${CLIENT_STAGES.join(", ")}.`,
      field: "clientStage",
    };
  }
  if (!inSet(input.emailCategory, EMAIL_CATEGORIES)) {
    return {
      ok: false,
      reason: `emailCategory must be one of: ${EMAIL_CATEGORIES.join(", ")}.`,
      field: "emailCategory",
    };
  }
  if (!inSet(input.tone, TONES)) {
    return {
      ok: false,
      reason: `tone must be one of: ${TONES.join(", ")}.`,
      field: "tone",
    };
  }
  if (!inSet(input.urgency, URGENCIES)) {
    return {
      ok: false,
      reason: `urgency must be one of: ${URGENCIES.join(", ")}.`,
      field: "urgency",
    };
  }

  const goalRaw =
    typeof input.communicationGoal === "string" ? input.communicationGoal.trim() : "";
  if (goalRaw.length === 0) {
    return {
      ok: false,
      reason: "communicationGoal is required (1 sentence describing the why).",
      field: "communicationGoal",
    };
  }
  if (goalRaw.length > 280) {
    return {
      ok: false,
      reason: "communicationGoal must be 280 characters or fewer.",
      field: "communicationGoal",
    };
  }

  for (const rule of PII_REJECT_PATTERNS) {
    const match = rule.pattern.exec(goalRaw);
    if (match) {
      return {
        ok: false,
        reason: `communicationGoal contains a ${rule.name.replace(/_/g, " ")} pattern. The AI never sees identifying data — rewrite the goal abstractly using placeholders.`,
        field: "communicationGoal",
        matchedText: match[0],
      };
    }
  }

  return {
    ok: true,
    safe: {
      clientSegment: input.clientSegment,
      clientStage: input.clientStage,
      emailCategory: input.emailCategory,
      tone: input.tone,
      urgency: input.urgency,
      communicationGoal: goalRaw,
      placeholders: ["[CLIENT_NAME]", "[ADVISOR_NAME]", "[FIRM_NAME]", "[DATE]"],
    },
  };
}

/**
 * Defense-in-depth assertion: throw if a payload is about to be JSON-serialized
 * for an OpenAI call but contains a known sensitive key. Wire this in just
 * before the `fetch()` to OpenAI as a last line of defense — it should
 * never fire in correct code, but if a future refactor mistakenly drops a
 * real client object into the call site, it'll throw immediately.
 */
const FORBIDDEN_KEYS = new Set([
  "clientName",
  "clientEmail",
  "email",
  "phone",
  "phoneNumber",
  "address",
  "dateOfBirth",
  "dob",
  "socialInsuranceNumber",
  "sin",
  "accountNumber",
  "portfolioValue",
  "holdings",
  "transactions",
  "investmentAmount",
  "riskScore",
  "naafContent",
  "kycContent",
  "crqContent",
  "documentText",
  "signature",
  "governmentId",
  "passportNumber",
  "driverLicenseNumber",
]);

export function assertSafeForOpenAI(payload: unknown): void {
  const visit = (node: unknown, path: string): void => {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      node.forEach((v, i) => visit(v, `${path}[${i}]`));
      return;
    }
    if (typeof node === "object") {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (FORBIDDEN_KEYS.has(key)) {
          throw new Error(
            `Compliance violation: forbidden key "${key}" present in OpenAI payload at ${path}.${key}. ` +
              `This call must be sanitized via sanitizeForOpenAI() first.`
          );
        }
        visit(value, `${path}.${key}`);
      }
    }
  };
  visit(payload, "$");
}
