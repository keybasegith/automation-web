/**
 * Curated Keybase Answer prompts.
 *
 * These are configuration, not UI. Components never hold a question string of
 * their own — they read the selection produced here, so editing this file is
 * the whole job of changing what the landing page offers.
 *
 * `cachePriority` drives `npm run keybase-answer:warm`: high-priority prompts
 * are generated and cached first, so the four on screen answer instantly.
 */

import type { FinancialQuestionCategory } from "@/lib/keybase-answer/types";

export interface SuggestedQuestion {
  /** Stable id. Survives rewording; used in analytics and the warm cache. */
  id: string;
  question: string;
  category: FinancialQuestionCategory;
  /** A disabled prompt stays here for the record but is never shown or warmed. */
  enabled: boolean;
  /** Ascending. Ties fall back to array order. */
  order: number;
  cachePriority: "high" | "normal" | "low";
}

/**
 * Every prompt we are willing to put in front of a visitor. More than fit on
 * screen, on purpose — the four shown rotate through this list (see
 * `selectSuggestedQuestions`).
 */
export const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  {
    id: "boc-decision",
    question: "What does the latest Bank of Canada decision mean for investors?",
    category: "monetary_policy",
    enabled: true,
    order: 10,
    cachePriority: "high",
  },
  {
    id: "rates-canadian-markets",
    question: "How are interest rates affecting Canadian markets?",
    category: "markets",
    enabled: true,
    order: 20,
    cachePriority: "high",
  },
  {
    id: "wealth-management-trends",
    question: "What trends are shaping wealth management today?",
    category: "wealth_management",
    enabled: true,
    order: 30,
    cachePriority: "high",
  },
  {
    id: "ai-financial-services",
    question: "How is artificial intelligence changing financial services?",
    category: "ai_finance",
    enabled: true,
    order: 40,
    cachePriority: "high",
  },
  {
    id: "canada-inflation-drivers",
    question: "What is driving inflation in Canada?",
    category: "macroeconomics",
    enabled: true,
    order: 50,
    cachePriority: "normal",
  },
  {
    // Disabled 2026-08-31: `keybase-answer:warm` reports this as not
    // answerable. Keybase's published material mentions that rate
    // expectations move bond yields but never explains the price/yield
    // relationship, so the honest answer is "we haven't written about that"
    // — which is not what a curated prompt should return. Re-enable once an
    // article covers it; the warm command will confirm.
    id: "bond-prices-rates",
    question: "Why do bond prices move when interest rates change?",
    category: "fixed_income",
    enabled: false,
    order: 60,
    cachePriority: "normal",
  },
  {
    id: "market-volatility",
    question: "What should investors understand about market volatility?",
    category: "risk",
    enabled: true,
    order: 70,
    cachePriority: "normal",
  },
  {
    id: "diversification-risk",
    question: "How can diversification affect portfolio risk?",
    category: "risk",
    enabled: true,
    order: 80,
    cachePriority: "normal",
  },
  {
    // Disabled 2026-08-31, same reason as bond-prices-rates: no published
    // Keybase piece surveys the indicators, so the prompt cannot be answered
    // from the index.
    id: "economic-indicators",
    question: "What are the major economic indicators investors watch?",
    category: "macroeconomics",
    enabled: false,
    order: 90,
    cachePriority: "low",
  },
  {
    id: "tfsa-vs-rrsp",
    question: "How do TFSAs and RRSPs differ for long-term savers?",
    category: "registered_accounts",
    enabled: true,
    order: 100,
    cachePriority: "normal",
  },
  {
    id: "resp-education-saving",
    question: "How does an RESP help families save for education?",
    category: "registered_accounts",
    enabled: true,
    order: 110,
    cachePriority: "low",
  },
  {
    id: "retirement-income-planning",
    question: "What should Canadians consider when planning retirement income?",
    category: "retirement",
    enabled: true,
    order: 120,
    cachePriority: "low",
  },
  {
    id: "monetary-policy-markets",
    question: "What does monetary policy mean for financial markets?",
    category: "monetary_policy",
    enabled: true,
    order: 130,
    cachePriority: "low",
  },
  {
    id: "keybase-approach",
    question: "How does Keybase Financial Group approach wealth planning?",
    category: "keybase_services",
    enabled: true,
    order: 140,
    cachePriority: "normal",
  },
];

/** How many prompt rows the landing page shows. */
export const SUGGESTED_QUESTION_COUNT = 4;

function activeQuestions(): SuggestedQuestion[] {
  return SUGGESTED_QUESTIONS.filter((q) => q.enabled).sort(
    (a, b) => a.order - b.order,
  );
}

/**
 * The four prompts to display.
 *
 * Rotation is a deterministic function of `rotationKey`, never `Math.random()`
 * — the server and the client must pick the same four or React hydration
 * mismatches. Callers that want a stable set pass nothing; callers that want
 * the set to move over time pass something that changes slowly, such as the
 * current day.
 */
export function selectSuggestedQuestions(
  rotationKey = 0,
  count = SUGGESTED_QUESTION_COUNT,
): SuggestedQuestion[] {
  const pool = activeQuestions();
  if (pool.length === 0) return [];
  const take = Math.min(count, pool.length);
  const offset =
    ((Math.trunc(rotationKey) % pool.length) + pool.length) % pool.length;
  return Array.from({ length: take }, (_, i) => pool[(offset + i) % pool.length]);
}

/** Day number since the epoch — a rotation key that advances once a day. */
export function dailyRotationKey(now: Date = new Date()): number {
  return Math.floor(now.getTime() / 86_400_000);
}

/**
 * Prompts the warm command should generate, most important first.
 *
 * Whatever is on screen today leads, whatever is on screen tomorrow follows,
 * and the rest come in priority order. That ordering matters because rotation
 * and warming would otherwise disagree: warming the four highest-priority
 * prompts while the page displays a rotated four means the prompts a visitor
 * can actually click are the ones that were never warmed.
 */
export function warmableQuestions(
  rotationKey = dailyRotationKey(),
): SuggestedQuestion[] {
  const rank = { high: 0, normal: 1, low: 2 } as const;
  const visible = [
    ...selectSuggestedQuestions(rotationKey),
    ...selectSuggestedQuestions(rotationKey + 1),
  ];

  const ordered: SuggestedQuestion[] = [];
  const seen = new Set<string>();
  const push = (item: SuggestedQuestion) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    ordered.push(item);
  };

  for (const item of visible) push(item);
  for (const item of activeQuestions().sort(
    (a, b) => rank[a.cachePriority] - rank[b.cachePriority] || a.order - b.order,
  )) {
    push(item);
  }
  return ordered;
}
