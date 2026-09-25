/**
 * The three printed editions of the Client Risk Questionnaire, as data.
 *
 * SOURCES (all form version v2-crq25):
 *   individual  public/crq-individualaccountholder.pdf  (./config.ts)
 *   joint       public/crq-jointaccountholders.pdf
 *   corporate   public/crq-corporateaccounts.pdf
 *
 * The joint edition asks the individual edition's questions word for word;
 * only its header, acknowledgement and signature block differ. The corporate
 * edition rewords every question for an entity and replaces Question 1 (age
 * group) with years in operation, which scores differently. Every edition
 * shares the same option ids, scoring bands and charts.
 *
 * COMPLIANCE RULE, as in ./config.ts: the wording below is transcribed, not
 * edited. The corporate PDF has typos ("20 per per cent", "Kepping", "it
 * currently hold, but increase your contributions") — they are kept so the
 * digital form says what the signed paper says. Fix the PDF first, then here.
 */

import {
  ACKNOWLEDGEMENT_ALL_ACCOUNTS,
  ACKNOWLEDGEMENT_SINGLE_ACCOUNT_PREFIX,
  ACKNOWLEDGEMENT_SINGLE_ACCOUNT_SUFFIX,
  FORM_SUBTITLE,
  FORM_TITLE,
  FORM_VERSION,
  INTRO_PARAGRAPHS,
  INVESTMENT_CHECK_QUESTION,
  PORTFOLIO_PRIORITY_INSTRUCTION,
  PORTFOLIO_PRIORITY_QUESTION,
  RISK_LEVELS_INSTRUCTION,
  RISK_QUESTIONS,
  RISK_RANKING_INSTRUCTION,
} from "./config";
import type {
  AnswerOption,
  CrqVariant,
  JointInvestmentGoal,
  RiskQuestion,
  ScoredQuestionId,
  UnscoredQuestion,
} from "./types";

export interface CrqFormDefinition {
  variant: CrqVariant;
  /** Short name for pickers and links. */
  label: string;
  formVersion: string;
  title: string;
  /** Printed under the title: "Individual Account Holder" etc. */
  subtitle: string;
  /** "Account Holder's Name" / "Corporation/Entity's Name". */
  primaryNameLabel: string;
  /** Joint edition only. */
  jointNameLabel: string | null;
  introParagraphs: readonly string[];
  priorityQuestion: string;
  priorityInstruction: string;
  investmentCheckQuestion: UnscoredQuestion;
  questions: readonly RiskQuestion[];
  capacityIds: readonly ScoredQuestionId[];
  toleranceIds: readonly ScoredQuestionId[];
  byId: Readonly<Record<ScoredQuestionId, RiskQuestion>>;
  /** "Your Risk Profile" / "The Entity's Risk Profile". */
  profileHeading: string;
  /** Row header of the levels table: "Your Risk Levels" / "Entity's Risk Levels". */
  levelsLabel: string;
  /** "Your Risk Ranking" / "Entity's Risk Ranking". */
  rankingLabel: string;
  levelsInstruction: string;
  rankingInstruction: string;
  acknowledgement: {
    all: string;
    /** Option 2 is printed with a fill-in line between prefix and suffix. */
    singlePrefix: string;
    singleSuffix: string;
    /** Joint edition: "(Balanced/Growth/High Growth) investment goals, and …". */
    goalChoices: readonly JointInvestmentGoal[] | null;
    goalTail: string | null;
  };
  primarySignatureLabel: string;
  jointSignatureLabel: string | null;
  /** Corporate edition: who must sign. */
  signingNote: string | null;
}

const CHOOSE_ONE = "Choose just one option from the list below:";

const indexQuestions = (questions: readonly RiskQuestion[]) => ({
  questions,
  capacityIds: questions.filter((q) => q.section === "capacity").map((q) => q.id),
  toleranceIds: questions.filter((q) => q.section === "tolerance").map((q) => q.id),
  byId: Object.fromEntries(questions.map((q) => [q.id, q])) as Record<ScoredQuestionId, RiskQuestion>,
});

// ---------------------------------------------------------------- individual

const INDIVIDUAL: CrqFormDefinition = {
  variant: "individual",
  label: "Individual",
  formVersion: FORM_VERSION,
  title: FORM_TITLE,
  subtitle: FORM_SUBTITLE,
  primaryNameLabel: "Account Holder's Name",
  jointNameLabel: null,
  introParagraphs: INTRO_PARAGRAPHS,
  priorityQuestion: PORTFOLIO_PRIORITY_QUESTION,
  priorityInstruction: PORTFOLIO_PRIORITY_INSTRUCTION,
  investmentCheckQuestion: INVESTMENT_CHECK_QUESTION,
  ...indexQuestions(RISK_QUESTIONS),
  profileHeading: "Your Risk Profile",
  levelsLabel: "Your Risk Levels",
  rankingLabel: "Your Risk Ranking",
  levelsInstruction: RISK_LEVELS_INSTRUCTION,
  rankingInstruction: RISK_RANKING_INSTRUCTION,
  acknowledgement: {
    all: ACKNOWLEDGEMENT_ALL_ACCOUNTS,
    singlePrefix: ACKNOWLEDGEMENT_SINGLE_ACCOUNT_PREFIX,
    singleSuffix: ACKNOWLEDGEMENT_SINGLE_ACCOUNT_SUFFIX,
    goalChoices: null,
    goalTail: null,
  },
  primarySignatureLabel: "Account Holder's Signature:",
  jointSignatureLabel: null,
  signingNote: null,
};

// ---------------------------------------------------------------- joint

const JOINT: CrqFormDefinition = {
  ...INDIVIDUAL,
  variant: "joint",
  label: "Joint",
  subtitle: "Joint Account Holders",
  jointNameLabel: "Joint Account Holder's Name",
  acknowledgement: {
    all: "We acknowledge that this joint risk questionnaire determines our overall risk level for all of our joint accounts, or",
    singlePrefix: "This joint account",
    singleSuffix: "(only) is intended to pursue",
    goalChoices: ["Balanced", "Growth", "High Growth"],
    goalTail:
      "investment goals, and we both agree that the selected risk profile reflects the strategy for this account, regardless of differing individual preferences.",
  },
  jointSignatureLabel: "Joint Account Holder's Signature:",
};

// ---------------------------------------------------------------- corporate

/** Same shape as config.ts's builder; option ids match across editions. */
const opt = (questionId: ScoredQuestionId, letter: string, label: string, points: number): AnswerOption => ({
  id: `${questionId}_${letter}`,
  letter,
  label,
  pointsLabel: `(${points} pts)`,
  points,
});

/** Takes an individual question's options, chart and section; rewords the text. */
const reworded = (
  id: ScoredQuestionId,
  question: string,
  options?: readonly AnswerOption[],
): RiskQuestion => {
  const base = INDIVIDUAL.byId[id];
  return { ...base, question, options: options ?? base.options };
};

const CORPORATE_QUESTIONS: readonly RiskQuestion[] = [
  {
    id: "q1",
    number: 1,
    section: "capacity",
    question: "How long has the entity been in operation?",
    instruction: CHOOSE_ONE,
    options: [
      opt("q1", "a", "Start-up to < 3 years", 6),
      opt("q1", "b", "3 to 5 years", 7),
      opt("q1", "c", "6 to 10 years", 8),
      opt("q1", "d", "More than 10 years", 10),
    ],
  },
  reworded("q2", "How would you describe the entity's current financial situation?", [
    opt("q2", "a", "It often spends more than it earns. It accumulate debt and struggle to pay it off.", 2),
    opt("q2", "b", "It often spends more than it earns, but have no trouble paying off its debts.", 4),
    opt("q2", "c", "It takes a lot of effort, but it manages not to spend more than it earns.", 6),
    opt("q2", "d", "It spends pretty much what it earns. It could save if it had to.", 8),
    opt("q2", "e", "It spends less than it earns. It has money to invest.", 10),
  ]),
  reworded("q3", "What is the entity's annual income (from all sources)?"),
  reworded("q4", "The entity considers its current and future income sources as:"),
  reworded(
    "q5",
    "What is the entity's estimated net worth (i.e. investments, cash, property and other real estate less mortgage loans and all other debts)?",
  ),
  reworded(
    "q6",
    "If the entity's investment portfolio declined by 20% over a 12 month period, how would this impact the entity's ability to meet its financial situation?",
    [
      opt("q6", "a", "It would struggle to meet its living expenses.", 2),
      opt("q6", "b", "It would need to reduce discretionary spending.", 4),
      opt("q6", "c", "It could manage with moderate adjustments.", 6),
      opt("q6", "d", "It could manage comfortably without changing its lifestyle.", 8),
      opt("q6", "e", "Short-term market declines would not affect its everyday living.", 10),
    ],
  ),
  reworded(
    "q7",
    "The degree to which the value of an investment increases and decreases is called volatility (one measure of risk). More volatile investments generally offer greater long-term growth potential than less volatile investments, but they may produce greater losses. How much volatility is the entity comfortable with?",
    [
      opt("q7", "a", "As little as possible. It wants to focus on current income and stability of value even if it means that its total returns are relatively small.", 2),
      opt("q7", "b", "Some. It is willing to accept occasional losses in value as long as its investments have some potential for growth over time.", 6),
      opt("q7", "c", "Moderate. It is willing to take moderate risk as long as its investments have a greater potential for growth over time.", 8),
      opt("q7", "d", "A considerable amount. It is willing to take a substantial risk in pursuit of higher total returns.", 10),
    ],
  ),
  reworded(
    "q8",
    "If the entity could increase the chances of improving its investment returns by taking more risk, would it:",
    [
      opt("q8", "a", "Be unlikely to take more risk.", 2),
      opt("q8", "b", "Be willing to take a little more risk with some of its portfolio.", 4),
      opt("q8", "c", "Be willing to take a lot more risk with some of its portfolio.", 8),
      opt("q8", "d", "Be willing to take a lot more risk with its entire portfolio.", 10),
    ],
  ),
  reworded("q9", "If the entity's investment declined by 20 per per cent over a short period, what would it do?"),
  reworded(
    "q10",
    "If the entity could choose only one of the five hypothetical portfolios characterized below, which would it select?",
  ),
  reworded(
    "q11",
    "After several years of following the entity's investment plan, it reviews its progress and determined the entity is behind schedule and will need to modify its strategy in order to meet its goals, what would the entity do?",
    [
      opt("q11", "a", "Keep the same investments it currently hold, but increase your contributions as much as possible.", 4),
      opt("q11", "b", "Slightly increase its exposure to riskier investments and slightly increase its contributions.", 6),
      opt("q11", "c", "Moderately increase its exposure to riskier investments and moderately increase its contributions.", 8),
      opt("q11", "d", "Move its entire portfolio to riskier investments, hoping to achieve the highest long-term return.", 10),
    ],
  ),
  reworded(
    "q12",
    "Investments with higher returns typically involve greater risk. The chart below shows actual investment growth of five different investment portfolios over an approximately 27 year period. Kepping in mind how returns fluctuate over time, which investment portfolio would the entity be most comfortable holding?",
  ),
];

const CORPORATE: CrqFormDefinition = {
  ...INDIVIDUAL,
  variant: "corporate",
  label: "Corporate",
  subtitle: "Corporate Accounts",
  primaryNameLabel: "Corporation/Entity's Name",
  introParagraphs: [
    "The entity’s financial position, business objectives, investment time horizon, and risk tolerance will determine its investor profile. Understanding the entity’s goals, timeline, and capacity and willingness to accept risk are key to establishing an appropriate investment strategy. Once the profile is established, you can work with your advisor to select investments that align with the entity’s financial goals. As the entity’s circumstances or objectives change over time, it is important to inform your advisor so the profile can be updated accordingly, which may impact the entity's investment strategy.",
    "Answer each of the following questions, keeping the entity's savings and investment objectives in mind.",
  ],
  priorityQuestion: "What is the entity's priority for this portfolio?",
  investmentCheckQuestion: {
    ...INVESTMENT_CHECK_QUESTION,
    question: "How often does the entity review the value of its investments?",
  },
  ...indexQuestions(CORPORATE_QUESTIONS),
  profileHeading: "The Entity's Risk Profile",
  levelsLabel: "Entity's Risk Levels",
  rankingLabel: "Entity's Risk Ranking",
  levelsInstruction:
    "Enter the Risk Capacity and Risk Tolerance scores in the shaded areas next to the range of values that best represents your score.",
  rankingInstruction:
    'The entity\'s risk ranking is determined by the lower of the two Risk Levels derived from the entity\'s Risk Capacity and Risk Tolerance scores above. Please check the box that corresponds to the lower of the two risk levels to determine the "Entity\'s Risk Ranking."',
  acknowledgement: {
    all: "I acknowledge that this risk questionnaire determines the overall risk level for all of my corporate accounts, or",
    singlePrefix: "I acknowledge that this risk questionnaire determines the overall risk level for",
    singleSuffix: "account (only).",
    goalChoices: null,
    goalTail: null,
  },
  primarySignatureLabel: "Authorized Signing Officer's Signature:",
  signingNote:
    "The CRQ must be signed by the Authorized Signing Officer, as designated in the corporate resolution or articles of incorporation.",
};

export const CRQ_FORMS: Readonly<Record<CrqVariant, CrqFormDefinition>> = {
  individual: INDIVIDUAL,
  joint: JOINT,
  corporate: CORPORATE,
};

export const CRQ_VARIANTS: readonly CrqVariant[] = ["individual", "joint", "corporate"];

export const isCrqVariant = (value: unknown): value is CrqVariant =>
  typeof value === "string" && (CRQ_VARIANTS as readonly string[]).includes(value);
