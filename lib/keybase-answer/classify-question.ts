/**
 * Question classification — deterministic, no model call.
 *
 * A second LLM round-trip to decide "is this about bonds?" would double the
 * latency and the bill for a decision a term list makes correctly. The category
 * only biases retrieval and tells the guardrails which shape of answer to build;
 * retrieval quality, not this function, decides whether a question is
 * answerable at all.
 *
 * Everything here reads the normalized question, so casing and punctuation
 * never change the outcome.
 */

import { normalizeQuestion } from "@/lib/keybase-answer/normalize-question";
import type {
  FinancialQuestionCategory,
  QuestionClassification,
} from "@/lib/keybase-answer/types";

/**
 * Category signals, most specific first — the first category with a match wins,
 * so "how do interest rates affect bond prices" lands in fixed income rather
 * than being swallowed by the broader monetary-policy list.
 *
 * Terms are matched on word boundaries, so "art" never matches "artificial".
 */
const CATEGORY_TERMS: Array<[FinancialQuestionCategory, string[]]> = [
  [
    "registered_accounts",
    ["tfsa", "rrsp", "resp", "rdsp", "fhsa", "rrif", "lira", "registered account", "registered accounts", "contribution room"],
  ],
  [
    "ai_finance",
    ["ai", "artificial intelligence", "machine learning", "large language model", "automation", "robo advisor", "robo-advisor"],
  ],
  [
    "fixed_income",
    ["bond", "bonds", "fixed income", "yield", "yields", "yield curve", "coupon", "duration", "credit spread", "gic", "gics", "treasury", "debenture"],
  ],
  [
    "monetary_policy",
    ["bank of canada", "boc", "policy rate", "overnight rate", "interest rate", "interest rates", "rate cut", "rate hike", "rate decision", "monetary policy", "central bank", "federal reserve", "quantitative easing", "tightening", "easing"],
  ],
  [
    "macroeconomics",
    ["inflation", "cpi", "deflation", "gdp", "recession", "unemployment", "economic outlook", "economy", "economic indicator", "economic indicators", "consumer price index", "labour market", "labor market", "growth outlook"],
  ],
  [
    "equities",
    ["equity", "equities", "stock market", "stocks", "shares", "tsx", "s&p", "dividend", "dividends", "earnings", "valuation", "price to earnings"],
  ],
  [
    "risk",
    ["volatility", "risk", "risk tolerance", "drawdown", "diversification", "diversify", "correlation", "downside", "hedge", "hedging"],
  ],
  [
    "retirement",
    ["retirement", "retire", "pension", "cpp", "oas", "annuity", "annuities", "decumulation", "retirement income"],
  ],
  [
    "keybase_services",
    ["keybase", "your firm", "your advisors", "your services", "your team"],
  ],
  [
    "financial_planning",
    ["financial plan", "financial planning", "budget", "budgeting", "emergency fund", "estate planning", "estate", "tax planning", "insurance", "education planning", "savings goal", "cash flow"],
  ],
  [
    "wealth_management",
    ["wealth management", "wealth", "portfolio", "asset allocation", "allocation", "private client", "high net worth", "advisory", "financial advisor", "financial adviser", "advisor"],
  ],
  [
    "markets",
    ["market", "markets", "canadian markets", "capital markets", "commodities", "oil price", "currency", "loonie", "exchange rate", "housing market", "real estate market"],
  ],
  [
    "regulation",
    ["regulation", "regulations", "regulatory", "ciro", "csa", "compliance", "securities commission", "know your client", "kyc", "suitability"],
  ],
  [
    "fintech",
    ["fintech", "digital banking", "open banking", "payments", "blockchain", "crypto", "cryptocurrency", "bitcoin", "digital assets", "tokenization"],
  ],
  [
    "investor_education",
    ["compound interest", "compounding", "investing basics", "what is investing", "beginner", "how do i start investing", "dollar cost averaging", "index fund", "etf", "mutual fund", "segregated fund", "segregated funds"],
  ],
];

/**
 * Any financial vocabulary at all. A question that matches nothing here and
 * nothing in CATEGORY_TERMS is out of scope, and never reaches the model.
 */
const FINANCIAL_SIGNALS = [
  "invest", "investing", "investment", "investor", "investors", "money",
  "finance", "financial", "fund", "funds", "saving", "savings", "save",
  "wealth", "asset", "assets", "capital", "return", "returns", "income",
  "tax", "taxes", "taxation", "interest", "rate", "rates", "loan", "mortgage",
  "debt", "credit", "bank", "banking", "insurance", "premium", "market",
  "markets", "economy", "economic", "inflation", "portfolio", "retire",
  "retirement", "pension", "estate", "annuity", "dividend", "bond", "bonds",
  "stock", "stocks", "equity", "equities", "yield", "risk", "volatility",
  "diversification", "advisor", "adviser", "advisory", "planner", "planning",
  "keybase", "cad", "dollar", "dollars", "currency", "budget", "fee", "fees",
];

/** "Latest", "current", "right now" — the reader is asking about today. */
const FRESHNESS_SIGNALS = [
  "latest", "current", "currently", "today", "recent", "recently", "right now",
  "this week", "this month", "this year", "so far this year", "up to date",
  "newest", "most recent", "as of now", "at the moment", "now",
];

/**
 * Asking what *this reader* should do with *their* money. These get a bounded
 * educational answer, never a recommendation.
 */
/**
 * The verbs that turn "should I…" into a request for a recommendation.
 *
 * The bare phrase is not enough: "What should I know about how a TFSA works?"
 * is an educational question, and answering it with a compliance redirect
 * would be both unhelpful and wrong. What distinguishes a recommendation
 * request is that it asks the reader be told what to *do* with their money.
 */
const ADVICE_VERBS =
  "buy|sell|hold|short|invest|put|move|allocate|switch|choose|pick|own|contribute|withdraw|open|convert|transfer|rebalance|keep|add|start|stop|max|prioriti[sz]e|do";

const PERSONALIZED_ADVICE_PATTERNS: RegExp[] = [
  new RegExp(`\\bshould (?:i|we) (?:${ADVICE_VERBS})\\b`),
  new RegExp(`\\bwhat should (?:i|we) (?:${ADVICE_VERBS})\\b`),
  /\bcan you (?:recommend|suggest|pick|choose)\b/,
  /\b(?:recommend|suggest|pick|choose) (?:a|an|the|me|some)\b.*\b(?:stock|stocks|fund|funds|etf|etfs|investment|investments|portfolio)\b/,
  /\b(?:build|design|create|make) (?:me |my |a |an )?.*\bportfolio\b/,
  /\bwhat (?:stock|stocks|fund|funds|etf|etfs|shares?) should\b/,
  /\bhow much of my\b/,
  /\bhow should i (?:invest|allocate|split|divide)\b/,
  /\bwhere should i (?:invest|put|move)\b/,
  /\b(?:buy|sell|hold|short|dump) my\b/,
  /\bis .* a good (?:buy|investment|stock|bet)\b/,
  /\bi (?:have|hold|own|inherited)\b.*\b(?:\$|dollars?|k\b|thousand|million)\b/,
  /\bmy (?:portfolio|tfsa|rrsp|resp|savings|money|assets|retirement)\b.*\b(?:invest|allocate|put|move|buy|sell)\b/,
  /\bi'?m \d{1,2}\b.*\b(?:invest|portfolio|retire)\b/,
];

/**
 * Attempts to redirect the system rather than ask a question. Flagged so the
 * request is answered under the normal grounded rules and logged, never so the
 * system prompt or configuration is discussed.
 */
const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /\bignore (?:your |all |any |the )?(?:previous |prior |above |earlier )?(?:instructions?|rules?|prompt|guidelines?|restrictions?)\b/,
  /\bdisregard (?:your |all |any |the )?(?:previous |prior |above )?(?:instructions?|rules?|prompt)\b/,
  /\b(?:show|reveal|print|repeat|output|tell me|what is|what's) (?:me )?(?:your |the )?(?:system )?(?:prompt|instructions?|api key|secret|token|credentials?|configuration)\b/,
  /\bapi[ _-]?key\b/,
  /\bsystem prompt\b/,
  /\byou are now\b/,
  /\bpretend (?:to be|you are|you're)\b/,
  /\bact as (?:my |a |an )?(?:financial )?(?:advisor|adviser|planner|broker)\b/,
  /\bdeveloper mode\b/,
  /\bjailbreak\b/,
  /\b(?:use|answer from) your own (?:knowledge|memory|training)\b/,
  /\bwithout (?:using |consulting )?(?:the )?(?:keybase )?sources?\b/,
  /\bignore (?:the )?keybase\b/,
  /\bsearch the (?:web|internet)\b/,
];

function hasTerm(haystack: string, term: string): boolean {
  // Escape the regex metacharacters that appear in real terms ("s&p", "$").
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Two details that matter more here than they look:
  //   - \b does not fire next to "&" or "$", so the boundary is written as a
  //     non-word-ish neighbour instead.
  //   - a trailing "s" is optional, because "TFSAs and RRSPs" is how people
  //     actually write the question and a term list of singulars would miss it.
  return new RegExp(`(?:^|[^a-z0-9])${escaped}s?(?:$|[^a-z0-9])`).test(haystack);
}

/** The CMS/insights categories worth biasing retrieval toward, per category. */
const RETRIEVAL_CATEGORIES: Partial<
  Record<FinancialQuestionCategory, string[]>
> = {
  registered_accounts: ["Wealth Planning", "Investment Solutions"],
  retirement: ["Wealth Planning"],
  financial_planning: ["Wealth Planning", "Preservation Strategies"],
  wealth_management: ["Wealth Planning", "Investment Solutions"],
  fixed_income: ["Investment Solutions", "Market Perspectives"],
  equities: ["Investment Solutions", "Market Perspectives"],
  markets: ["Market Perspectives"],
  monetary_policy: ["Market Perspectives"],
  macroeconomics: ["Market Perspectives"],
};

export function classifyQuestion(raw: string): QuestionClassification {
  const text = normalizeQuestion(raw);
  const matchedTerms: string[] = [];

  let category: FinancialQuestionCategory | null = null;
  for (const [candidate, terms] of CATEGORY_TERMS) {
    const hits = terms.filter((term) => hasTerm(text, term));
    if (hits.length === 0) continue;
    matchedTerms.push(...hits);
    if (category === null) category = candidate;
  }

  const financial =
    category !== null || FINANCIAL_SIGNALS.some((term) => hasTerm(text, term));

  const personalizedAdvice = PERSONALIZED_ADVICE_PATTERNS.some((re) =>
    re.test(text),
  );
  const promptInjection = PROMPT_INJECTION_PATTERNS.some((re) => re.test(text));

  // A personalized request is still about a financial topic — keep the topic
  // category so retrieval can find the educational material to offer instead.
  const resolved: FinancialQuestionCategory = !financial
    ? "out_of_scope"
    : personalizedAdvice && category === null
      ? "personalized_advice"
      : (category ?? "investor_education");

  return {
    category: resolved,
    freshnessIntent: FRESHNESS_SIGNALS.some((term) => hasTerm(text, term)),
    personalizedAdvice,
    outOfScope: !financial,
    promptInjection,
    retrievalCategories: RETRIEVAL_CATEGORIES[resolved] ?? [],
    matchedTerms: matchedTerms.slice(0, 12),
  };
}
