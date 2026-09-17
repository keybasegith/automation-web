/**
 * Client Risk Questionnaire — Individual Account Holder.
 *
 * SOURCE OF TRUTH: public/crq-individualaccountholder.pdf (form version
 * v2-crq25). Every string, option letter, point value and threshold below was
 * transcribed from that PDF and re-checked against a rendering of each page.
 *
 * COMPLIANCE RULE: do not reword questions or answers, do not "fix" the
 * grammar of the printed point annotations (the source really does read
 * "(1 pts)"), and do not adjust point values or thresholds. If the form
 * changes, a new PDF and a new form version come first, then this file.
 */

import type {
  AnswerOption,
  InvestmentCheckFrequency,
  PortfolioPriorityId,
  RiskLevel,
  RiskLevelBand,
  RiskQuestion,
  ScoredQuestionId,
  UnscoredQuestion,
} from "./types";

/** Printed discreetly at the foot of the source form. */
export const FORM_VERSION = "v2-crq25";

export const FORM_TITLE = "CLIENT RISK QUESTIONNAIRE";
export const FORM_SUBTITLE = "Individual Account Holder";

/** The three intro paragraphs printed under the header. */
export const INTRO_PARAGRAPHS: readonly string[] = [
  "Your age, your life experiences, your investment time horizon, and how you feel about risk will determine your investor profile. A deep understanding of what you are investing for, how long you have to meet your goals, and your comfort level with risk are all part of determining the right mix of investments for you. After creating your profile, you can then work with your advisor to select investments that will help you achieve your financial goals.",
  "Your life experiences, financial circumstances, and goals may change in the future. Please let your advisor know if things have changed so they can make any necessary adjustments to your profile, which may affect your future investment mix.",
  "Answer each of the following questions, keeping your savings and investment objectives in mind.",
];

/* ------------------------------------------------------------------ *
 * Unscored lead-in questions
 *
 * Neither of these carries a point annotation on the source form, so
 * neither contributes to the Risk Capacity total. They are captured for
 * the advisor's record only.
 * ------------------------------------------------------------------ */

export const PORTFOLIO_PRIORITY_QUESTION = "What is your priority for this portfolio?";
export const PORTFOLIO_PRIORITY_INSTRUCTION =
  "Rank all that apply, where 1 being the most important.";

export const PORTFOLIO_PRIORITIES: readonly {
  id: PortfolioPriorityId;
  letter: string;
  label: string;
}[] = [
  { id: "taxSavings", letter: "a", label: "Tax Savings" },
  { id: "childEducation", letter: "b", label: "Child Education" },
  { id: "retirementPlanning", letter: "c", label: "Retirement Planning" },
  { id: "estatePlanning", letter: "d", label: "Estate Planning" },
  { id: "savings", letter: "e", label: "Savings" },
];

export const INVESTMENT_CHECK_QUESTION: UnscoredQuestion = {
  id: "investmentCheckFrequency",
  question: "How often do you check the value of your investments?",
  instruction: "Choose just one option from the list below:",
  options: [
    { id: "weekly", letter: "a", label: "Weekly" },
    { id: "monthly", letter: "b", label: "Monthly" },
    { id: "quarterly", letter: "c", label: "Quarterly" },
    { id: "annually", letter: "d", label: "Annually" },
  ],
};

export const INVESTMENT_CHECK_VALUES: readonly InvestmentCheckFrequency[] = [
  "weekly",
  "monthly",
  "quarterly",
  "annually",
];

const CHOOSE_ONE = "Choose just one option from the list below:";

/** Terse builder so each option below reads as it does on the page. */
const opt = (
  questionId: ScoredQuestionId,
  letter: string,
  label: string,
  points: number,
  pointsLabel = `(${points} pts)`,
): AnswerOption => ({
  id: `${questionId}_${letter}`,
  letter,
  label,
  pointsLabel,
  points,
});

/* ------------------------------------------------------------------ *
 * Section 1 — RISK CAPACITY (questions 1-6)
 * ------------------------------------------------------------------ */

const CAPACITY_QUESTIONS: readonly RiskQuestion[] = [
  {
    id: "q1",
    number: 1,
    section: "capacity",
    question: "What is your age group?",
    instruction: CHOOSE_ONE,
    options: [
      opt("q1", "a", "Under 35", 10),
      opt("q1", "b", "35-54", 8),
      opt("q1", "c", "55-64", 7),
      opt("q1", "d", "65 or older", 6),
    ],
  },
  {
    id: "q2",
    number: 2,
    section: "capacity",
    question: "How would you describe your current financial situation?",
    instruction: CHOOSE_ONE,
    options: [
      opt("q2", "a", "I often spend more than I earn. I accumulate debt and struggle to pay it off.", 2),
      opt("q2", "b", "I often spend more than I earn but have no trouble paying off my debts.", 4),
      opt("q2", "c", "It takes a lot of effort, but I manage not to spend more than I earn.", 6),
      opt("q2", "d", "I spend pretty much what I earn. I could save if I had to.", 8),
      opt("q2", "e", "I spend less than I earn. I have money to invest.", 10),
    ],
  },
  {
    id: "q3",
    number: 3,
    section: "capacity",
    question: "What is your annual income (from all sources)?",
    instruction: CHOOSE_ONE,
    options: [
      // The source prints "(1 pts)". Left exactly as printed on purpose.
      opt("q3", "a", "Less than $25,000", 1),
      opt("q3", "b", "$25,000 - $49,999", 2),
      opt("q3", "c", "$50,000 - $74,999", 4),
      opt("q3", "d", "$75,000 - $99,999", 6),
      opt("q3", "e", "$100,000 - $124,999", 7),
      opt("q3", "f", "$125,000 - $199,999", 8),
      opt("q3", "g", "$200,000 - $999,999", 9),
      opt("q3", "h", "$1,000,000 or more", 10),
    ],
  },
  {
    id: "q4",
    number: 4,
    section: "capacity",
    question: "You consider your current and future income sources as:",
    instruction: CHOOSE_ONE,
    options: [
      opt("q4", "a", "Unstable", 2),
      opt("q4", "b", "Somewhat stable", 6),
      opt("q4", "c", "Stable", 10),
    ],
  },
  {
    id: "q5",
    number: 5,
    section: "capacity",
    question:
      "What is your estimated net worth (i.e. investments, cash, home and other real estate less mortgage loans and all other debts)?",
    instruction: CHOOSE_ONE,
    options: [
      opt("q5", "a", "Less than $50,000", 2),
      opt("q5", "b", "$50,000 - $99,999", 5),
      opt("q5", "c", "$100,000 - $249,999", 7),
      opt("q5", "d", "$250,000 - $499,999", 8),
      opt("q5", "e", "$500,000 - $999,999", 9),
      opt("q5", "f", "$1,000,000 or more", 10),
    ],
  },
  {
    id: "q6",
    number: 6,
    section: "capacity",
    question:
      "If your investment portfolio declined by 20% over a 12 month period, how would this impact your ability to meet your living expenses and financial situation?",
    instruction: CHOOSE_ONE,
    options: [
      opt("q6", "a", "I would struggle to meet my living expenses", 2),
      opt("q6", "b", "I would need to reduce discretionary spending", 4),
      opt("q6", "c", "I could manage with moderate adjustments", 6),
      opt("q6", "d", "I could manage comfortably without changing my lifestyle", 8),
      opt("q6", "e", "Short-term market declines would not affect my everyday living", 10),
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Section 2 — RISK TOLERANCE (questions 7-12)
 * ------------------------------------------------------------------ */

const TOLERANCE_QUESTIONS: readonly RiskQuestion[] = [
  {
    id: "q7",
    number: 7,
    section: "tolerance",
    question:
      "The degree to which the value of an investment increases and decreases is called volatility (one measure of risk). More volatile investments generally offer greater long-term growth potential than less volatile investments, but they may produce greater losses. How much volatility are you comfortable with?",
    instruction: CHOOSE_ONE,
    options: [
      opt("q7", "a", "As little as possible. I want to focus on current income and stability of value even if it means that my total returns are relatively small.", 2),
      opt("q7", "b", "Some. I am willing to accept occasional losses in value as long as my investments have some potential for growth over time.", 6),
      opt("q7", "c", "Moderate. I am willing to take moderate risk as long as my investments have a greater potential for growth over time.", 8),
      opt("q7", "d", "A considerable amount. I am willing to take a substantial risk in pursuit of higher total returns.", 10),
    ],
  },
  {
    id: "q8",
    number: 8,
    section: "tolerance",
    question:
      "If you could increase your chances of improving your investment returns by taking more risk, would you:",
    instruction: CHOOSE_ONE,
    options: [
      opt("q8", "a", "Be unlikely to take more risk.", 2),
      opt("q8", "b", "Be willing to take a little more risk with some of your portfolio.", 4),
      opt("q8", "c", "Be willing to take a lot more risk with some of your portfolio.", 8),
      opt("q8", "d", "Be willing to take a lot more risk with your entire portfolio.", 10),
    ],
  },
  {
    id: "q9",
    number: 9,
    section: "tolerance",
    question:
      "If you owned an investment that declined by 20 per cent over a short period, what would you do?",
    instruction: CHOOSE_ONE,
    options: [
      opt("q9", "a", "Sell all of the remaining investment.", 2),
      opt("q9", "b", "Sell a portion of the remaining investment.", 4),
      opt("q9", "c", "Hold the investment and sell nothing.", 6),
      opt("q9", "d", "Buy more of the investment.", 10),
    ],
  },
  {
    id: "q10",
    number: 10,
    section: "tolerance",
    question:
      "If you could choose only one of the five hypothetical portfolios characterized below, which would you select?",
    instruction: CHOOSE_ONE,
    // Cropped from page 2 of the source PDF, unaltered.
    chart: {
      src: "/risk-questionnaire/q10-portfolio-chart.png",
      alt: "Growth of a $10,000 initial investment over 10 years for five hypothetical portfolios. Average portfolio return: A 1%, B 5%, C 10%, D 16%, E 19%. Highest annual return: A 3%, B 20%, C 31%, D 46%, E 53%. Lowest annual return: A 0%, B -7%, C -22%, D -25%, E -28%.",
      width: 1515,
      height: 939,
    },
    options: [
      opt("q10", "a", "Portfolio A", 2),
      opt("q10", "b", "Portfolio B", 4),
      opt("q10", "c", "Portfolio C", 6),
      opt("q10", "d", "Portfolio D", 8),
      opt("q10", "e", "Portfolio E", 10),
    ],
  },
  {
    id: "q11",
    number: 11,
    section: "tolerance",
    question:
      "After several years of following your investment plan, you review your progress and determine you are behind schedule and will need to modify your strategy in order to meet your goals.\nWhat would you do?",
    instruction: CHOOSE_ONE,
    options: [
      opt("q11", "a", "Keep the same investments you currently hold, but increase your contributions as much as possible.", 4),
      opt("q11", "b", "Slightly increase your exposure to riskier investments and slightly increase your contributions.", 6),
      opt("q11", "c", "Moderately increase your exposure to riskier investments and moderately increase your contributions.", 8),
      opt("q11", "d", "Move your entire portfolio to riskier investments, hoping to achieve the highest long-term return.", 10),
    ],
  },
  {
    id: "q12",
    number: 12,
    section: "tolerance",
    question:
      "Investments with higher returns typically involve greater risk. The chart below shows actual investment growth of five different investment portfolios over an approximately 27-year period. Keeping in mind how the returns fluctuate over time, which investment portfolio would you be most comfortable holding?",
    instruction: CHOOSE_ONE,
    // Cropped from page 3 of the source PDF, unaltered.
    chart: {
      src: "/risk-questionnaire/q12-investment-growth-chart.png",
      alt: "Growth of a $10,000 initial investment across five portfolios from March 1997 to 2024. Ending values: Portfolio 1 $17,000, Portfolio 2 $33,000, Portfolio 3 $48,000, Portfolio 4 $71,000, Portfolio 5 $94,000.",
      width: 1560,
      height: 763,
    },
    options: [
      opt("q12", "a", "Portfolio 1", 2),
      opt("q12", "b", "Portfolio 2", 4),
      opt("q12", "c", "Portfolio 3", 6),
      opt("q12", "d", "Portfolio 4", 8),
      opt("q12", "e", "Portfolio 5", 10),
    ],
  },
];

export const RISK_QUESTIONS: readonly RiskQuestion[] = [
  ...CAPACITY_QUESTIONS,
  ...TOLERANCE_QUESTIONS,
];

export const CAPACITY_QUESTION_IDS: readonly ScoredQuestionId[] =
  CAPACITY_QUESTIONS.map((q) => q.id);

export const TOLERANCE_QUESTION_IDS: readonly ScoredQuestionId[] =
  TOLERANCE_QUESTIONS.map((q) => q.id);

export const QUESTIONS_BY_ID: Readonly<Record<ScoredQuestionId, RiskQuestion>> =
  Object.fromEntries(RISK_QUESTIONS.map((q) => [q.id, q])) as Record<
    ScoredQuestionId,
    RiskQuestion
  >;

export const SECTION_LABELS: Readonly<Record<"capacity" | "tolerance", string>> = {
  capacity: "RISK CAPACITY",
  tolerance: "RISK TOLERANCE",
};

/* ------------------------------------------------------------------ *
 * Risk levels
 *
 * The bands are exactly as printed on the source form:
 *
 *   Low          < 12
 *   Low Medium   13 - 24
 *   Medium       25 - 36
 *   Medium High  37 - 48
 *   High         49 +
 *
 * KNOWN SOURCE AMBIGUITY — the score 12 gap.
 * "< 12" ends at 11 and "13 - 24" starts at 13, so the printed table assigns
 * no level to a score of exactly 12. We do NOT silently close the gap: a 12
 * resolves to `requires_review` instead (see scoring.ts). In practice the gap
 * is unreachable — the lowest attainable Risk Capacity total is 15 and the
 * lowest attainable Risk Tolerance total is 14 — but the rule is encoded here
 * rather than assumed, so it is a one-line change if Keybase confirms how a
 * 12 should be treated.
 * ------------------------------------------------------------------ */

export const RISK_LEVEL_BANDS: readonly RiskLevelBand[] = [
  { level: "Low", min: Number.NEGATIVE_INFINITY, max: 11, display: "< 12" },
  { level: "Low Medium", min: 13, max: 24, display: "13 - 24" },
  { level: "Medium", min: 25, max: 36, display: "25 - 36" },
  { level: "Medium High", min: 37, max: 48, display: "37 - 48" },
  { level: "High", min: 49, max: Number.POSITIVE_INFINITY, display: "49 +" },
];

/** Column order of the printed risk-level tables, lowest risk first. */
export const RISK_LEVELS_IN_ORDER: readonly RiskLevel[] = RISK_LEVEL_BANDS.map(
  (band) => band.level,
);

/** Severity rank used to pick the LOWER of two levels. */
export const RISK_LEVEL_ORDER: Readonly<Record<RiskLevel, number>> = {
  Low: 1,
  "Low Medium": 2,
  Medium: 3,
  "Medium High": 4,
  High: 5,
};

export const UNBANDED_SCORE_NOTICE = (score: number): string =>
  `Score ${score} requires advisor review based on the source questionnaire threshold table.`;

/* ------------------------------------------------------------------ *
 * Risk Profile Summary + acknowledgement copy
 * ------------------------------------------------------------------ */

export const CAPACITY_SUMMARY_INSTRUCTION =
  'Enter the values for each question you selected in the corresponding box below. Then, sum the values for questions 1 through 6 and place the total in the "Score Totals" column.';

export const TOLERANCE_SUMMARY_INSTRUCTION =
  'Enter the values for each question you selected in the corresponding box below. Then, sum the values for questions 7 through 12 and place the total in the "Score Totals" column.';

export const RISK_LEVELS_INSTRUCTION =
  "Enter your Risk Capacity and Risk Tolerance scores in the shaded areas next to the range of values that best represents your score.";

export const RISK_RANKING_INSTRUCTION =
  'Your risk ranking is determined by the lower of the two Risk Levels derived from your Risk Capacity and Risk Tolerance scores above. Please check the box that corresponds to the lower of the two risk levels to determine "Your Risk Ranking."';

export const ACKNOWLEDGEMENT_ALL_ACCOUNTS =
  "I acknowledge that this risk questionnaire determines my overall risk level for all of my accounts, or";

/** Option 2 is printed with a fill-in line between these two fragments. */
export const ACKNOWLEDGEMENT_SINGLE_ACCOUNT_PREFIX =
  "I acknowledge that this risk questionnaire determines my overall risk level for my";
export const ACKNOWLEDGEMENT_SINGLE_ACCOUNT_SUFFIX = "account (only).";
