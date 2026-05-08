/**
 * Pre-flight risk scanner for advisor input. Runs before any text leaves the
 * server for OpenAI. If anything risky is detected the request is BLOCKED.
 *
 * The same flag taxonomy is also used for output scanning, where a hit means
 * we strip / refuse to save the offending content.
 */

export type RiskFlag =
  | "sin"
  | "account_number"
  | "exact_dollar_amount"
  | "guaranteed_return"
  | "tax_advice"
  | "compliance_claim"
  | "investment_recommendation"
  | "phone_number"
  | "long_digit_sequence"
  | "email_address"
  | "client_name_leak";

export interface RiskFinding {
  flag: RiskFlag;
  message: string;
  matchedText: string;
}

interface PatternRule {
  flag: RiskFlag;
  message: string;
  pattern: RegExp;
}

// Order matters: more specific patterns first.
const PATTERN_RULES: readonly PatternRule[] = [
  {
    flag: "sin",
    message: "Looks like a Social Insurance Number — never include this.",
    pattern: /\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/,
  },
  {
    flag: "exact_dollar_amount",
    message:
      "Exact dollar amounts must be removed. Use a range or descriptor instead.",
    pattern: /\$\s?\d{1,3}(?:[,\s]?\d{3})+(?:\.\d{2})?\b|\$\s?\d{4,}\b/,
  },
  {
    flag: "phone_number",
    message:
      "Avoid embedding phone numbers in advisor notes — keep contact details out of AI prompts.",
    pattern: /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  },
  {
    flag: "email_address",
    message:
      "Email addresses must not be sent to the AI. Refer to the client without contact details.",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  },
  {
    flag: "account_number",
    message:
      "Account numbers, IBANs, or institution codes must not be included.",
    // Catches account-style strings: 7+ digits, or alphanumerics with both letters and digits.
    pattern:
      /\b(?:account\s*(?:no|number|#)?\s*[:#-]?\s*[A-Z0-9-]{6,}|[A-Z]{2}\d{2}[A-Z0-9]{10,})\b/i,
  },
  {
    flag: "long_digit_sequence",
    message:
      "Long digit sequences (7+) often indicate identifiers — please remove.",
    pattern: /(?<!\$)\b\d{7,}\b/,
  },
];

interface PhraseRule {
  flag: RiskFlag;
  message: string;
  phrases: readonly string[];
}

const PHRASE_RULES: readonly PhraseRule[] = [
  {
    flag: "guaranteed_return",
    message:
      "Promises of returns are not allowed. Remove guarantee / promise language.",
    phrases: [
      "guaranteed return",
      "guaranteed returns",
      "guarantee return",
      "no risk",
      "risk-free",
      "risk free",
      "promised return",
      "promise of",
      "we promise",
    ],
  },
  {
    flag: "tax_advice",
    message:
      "Tax advice is out of scope. Reword as a suggestion to consult a tax professional.",
    phrases: [
      "tax advice",
      "tax-deductible",
      "tax deductible",
      "you should claim",
      "you can deduct",
      "tax loophole",
    ],
  },
  {
    flag: "compliance_claim",
    message:
      "Do not state that something is compliance-approved or pre-approved.",
    phrases: [
      "compliance approved",
      "compliance-approved",
      "pre-approved by compliance",
      "approved by compliance",
      "compliance signed off",
      "fully compliant",
    ],
  },
  {
    flag: "investment_recommendation",
    message:
      "Specific product recommendations are not allowed. Speak in general categories instead.",
    phrases: [
      "i recommend buying",
      "i recommend selling",
      "you should buy",
      "you should sell",
      "buy this stock",
      "sell this stock",
      "best investment",
      "guaranteed pick",
      "must-buy",
      "hot tip",
    ],
  },
];

const FLAG_LABELS: Record<RiskFlag, string> = {
  sin: "SIN detected",
  account_number: "Account number detected",
  exact_dollar_amount: "Exact dollar amount detected",
  guaranteed_return: "Guarantee / promise language",
  tax_advice: "Tax advice phrasing",
  compliance_claim: "Compliance approval claim",
  investment_recommendation: "Specific investment recommendation",
  phone_number: "Phone number detected",
  long_digit_sequence: "Long digit sequence",
  email_address: "Email address detected",
  client_name_leak: "Client name detected",
};

export function flagLabel(flag: RiskFlag): string {
  return FLAG_LABELS[flag];
}

/**
 * Scan the supplied text and return the list of findings (with first-match
 * snippets). Empty input returns an empty list.
 */
export function scanForRisks(input: string): RiskFinding[] {
  if (!input || typeof input !== "string") return [];
  const findings: RiskFinding[] = [];
  const seen = new Set<RiskFlag>();

  for (const rule of PATTERN_RULES) {
    const m = rule.pattern.exec(input);
    if (m && !seen.has(rule.flag)) {
      findings.push({
        flag: rule.flag,
        message: rule.message,
        matchedText: m[0],
      });
      seen.add(rule.flag);
    }
  }

  const lowered = input.toLowerCase();
  for (const rule of PHRASE_RULES) {
    if (seen.has(rule.flag)) continue;
    for (const phrase of rule.phrases) {
      if (lowered.includes(phrase)) {
        findings.push({
          flag: rule.flag,
          message: rule.message,
          matchedText: phrase,
        });
        seen.add(rule.flag);
        break;
      }
    }
  }

  return findings;
}

/**
 * Detect leaks of the loaded client's name in advisor input. Whole-word match
 * on each token of the full name (length >= 3 to avoid trivial matches like
 * "Li" or "Jo"). Case-insensitive.
 *
 * This is layered ON TOP of `scanForRisks` because the generic scanner can't
 * know which client is selected. Call this at the route boundary after the
 * server has resolved the clientId to a record.
 */
export function scanForClientNameLeak(
  input: string,
  fullName: string
): RiskFinding | null {
  if (!input || !fullName) return null;
  const tokens = fullName
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
  if (tokens.length === 0) return null;
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const token of tokens) {
    const re = new RegExp(`\\b${escapeRegex(token)}\\b`, "i");
    const match = re.exec(input);
    if (match) {
      return {
        flag: "client_name_leak",
        message:
          "Client name found in input — this must be removed before generating. The AI never sees the client's name; the personalization is added after.",
        matchedText: match[0],
      };
    }
  }
  return null;
}

/**
 * Redact obvious PII patterns. Used as a defence-in-depth before persisting
 * advisor notes (the risk scanner has already blocked the worst cases).
 */
export function redactPII(input: string): string {
  if (!input) return "";
  let output = input;
  for (const rule of PATTERN_RULES) {
    output = output.replace(
      new RegExp(rule.pattern.source, rule.pattern.flags + "g"),
      "[REDACTED]"
    );
  }
  return output;
}
