/**
 * Prohibited phrase checker.
 *
 * Wraps the existing `lib/secureEmail/riskScanner.ts` flag taxonomy so the
 * rest of the app has a single, well-named compliance API. The wrapper
 * adds a `severity` rating per finding (low / medium / high) which the
 * UI uses to decide whether to soft-warn or hard-block.
 *
 * COMPLIANCE NOTE:
 *   The checker NEVER edits the text. It returns findings; the advisor is
 *   responsible for editing flagged content directly. The send route MUST
 *   refuse high-severity hits.
 */

import {
  flagLabel,
  scanForRisks,
  type RiskFinding,
  type RiskFlag,
} from "@/lib/secureEmail/riskScanner";

export type Severity = "low" | "medium" | "high";

export interface FlaggedPhrase {
  phrase: string;
  reason: string;
  severity: Severity;
  /** Backing taxonomy from the existing risk scanner. */
  flag: RiskFlag;
  /** Human-readable label for UI display. */
  label: string;
}

export interface ComplianceCheckResult {
  isCompliant: boolean;
  flaggedPhrases: FlaggedPhrase[];
}

const SEVERITY_BY_FLAG: Record<RiskFlag, Severity> = {
  // Hard-block: identifying or financial data.
  sin: "high",
  account_number: "high",
  exact_dollar_amount: "high",
  email_address: "high",
  phone_number: "high",
  long_digit_sequence: "high",
  client_name_leak: "high",
  // Hard-block: regulatory language.
  guaranteed_return: "high",
  investment_recommendation: "high",
  // Soft-warn: review-required language.
  tax_advice: "medium",
  compliance_claim: "medium",
};

/**
 * Additional outright-prohibited phrases that aren't already covered by the
 * risk scanner's investment-recommendation list. Add to this list, not the
 * risk scanner, when adding marketing/sales-style copy that should be
 * blocked outside the existing taxonomy.
 */
const EXTRA_PROHIBITED: readonly { phrase: string; reason: string }[] = [
  {
    phrase: "guaranteed approval",
    reason: "Implies a guaranteed outcome — not allowed in client communications.",
  },
  {
    phrase: "safe investment",
    reason: "Implies absence of risk — not allowed.",
  },
  {
    phrase: "will outperform",
    reason: "Performance promise — not allowed.",
  },
  {
    phrase: "sure profit",
    reason: "Performance promise — not allowed.",
  },
  {
    phrase: "guaranteed income",
    reason: "Performance promise — not allowed.",
  },
];

/**
 * Run the compliance check across `subject + body` text. The check is
 * read-only and side-effect-free. Callers should display all findings to
 * the advisor and refuse to send when `isCompliant === false` and any
 * high-severity finding is present.
 */
export function checkProhibitedPhrases(args: {
  subject: string;
  body: string;
}): ComplianceCheckResult {
  const combined = `${args.subject ?? ""}\n${args.body ?? ""}`;
  const flaggedPhrases: FlaggedPhrase[] = [];

  for (const finding of scanForRisks(combined)) {
    flaggedPhrases.push(toFlaggedPhrase(finding));
  }

  const lowered = combined.toLowerCase();
  for (const extra of EXTRA_PROHIBITED) {
    if (!lowered.includes(extra.phrase)) continue;
    if (
      flaggedPhrases.some(
        (f) => f.phrase.toLowerCase() === extra.phrase.toLowerCase()
      )
    ) {
      continue;
    }
    flaggedPhrases.push({
      phrase: extra.phrase,
      reason: extra.reason,
      severity: "high",
      flag: "investment_recommendation",
      label: "Prohibited phrase",
    });
  }

  const isCompliant = flaggedPhrases.every((f) => f.severity !== "high");
  return { isCompliant, flaggedPhrases };
}

function toFlaggedPhrase(finding: RiskFinding): FlaggedPhrase {
  return {
    phrase: finding.matchedText,
    reason: finding.message,
    severity: SEVERITY_BY_FLAG[finding.flag] ?? "medium",
    flag: finding.flag,
    label: flagLabel(finding.flag),
  };
}
