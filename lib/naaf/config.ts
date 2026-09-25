/**
 * Printed content of the New Account Application Form, revision V3-NAAF-2022
 * (public/form-NAAF.pdf).
 *
 * Every label, option and paragraph here is transcribed from the source PDF so
 * the digital form carries the same wording as the paper one. Page 2's text
 * layer decodes to garbage, so those sections were transcribed from the
 * rendered page instead — keep that in mind if the PDF is ever re-issued.
 *
 * One deliberate divergence: the PDF's text layer still holds an older Client B
 * question ("Are you a resident for tax purposes of any country other than
 * Canada?"), but it is covered on the printed page by the RC518/RC519 line. The
 * printed page is what clients sign, so that is what is reproduced.
 */

export const FORM_VERSION = "V3-NAAF-2022";
export const FORM_TITLE = "New Account Application Form";
export const FORM_FOOTER = "COPY TO CLIENT";

export const DEALER_ADDRESS = [
  "101 - 1725 16th Ave, Richmond Hill, ON  L4B 0B3",
  "T: 905-709-7911   F: 905-709-7022",
  "Toll Free: 1-888-539-4246",
] as const;

export const FORM_TYPES = ["New Client", "KYC Update", "Existing Client (New Plan)"] as const;
export type FormType = (typeof FORM_TYPES)[number];

// ---------------------------------------------------------------- A / B

export const PERSON_TITLES = ["Mr.", "Mrs.", "Miss", "Ms.", "Dr.", "Prof."] as const;
/** Printed on Client A's row only — Client B is always an individual. */
export const ENTITY_TYPES = [
  "Entity",
  "Estate",
  "Trust, Club, Assoc., Partnership",
  "Gov't",
] as const;
export type PersonTitle = (typeof PERSON_TITLES)[number];
export type EntityType = (typeof ENTITY_TYPES)[number];
export type HolderType = PersonTitle | EntityType;

export const GENDERS = ["Male", "Female"] as const;
export type Gender = (typeof GENDERS)[number];

export const RELATIONSHIPS_TO_A = ["Spouse", "Other"] as const;
export type RelationshipToA = (typeof RELATIONSHIPS_TO_A)[number];

export const ID_METHODS = [
  { value: "photo", label: "Photo ID" },
  { value: "dual", label: "Dual Source -2 documents that verify name, address & DOB" },
  { value: "credit", label: "Credit Check" },
] as const;
export type IdMethod = (typeof ID_METHODS)[number]["value"];

export const TAX_RESIDENCE_NOTICE =
  "All clients must complete the Declaration of Tax Residence for Individuals (RC518) or for Entities (RC519)";

export const PEP_QUESTION = "Are you a foreign or domestic Politically Exposed Person, or a HIO?";
export const PEP_ASSOCIATE_QUESTION =
  "Are you a family member or a close associate of a PEFP, PEDP, or a HIO?";
export const PEP_FOLLOW_UP = "(If Yes, complete the PEP/HIO Declaration)";

export const CITIZENSHIPS = ["Canadian", "Other"] as const;
export type Citizenship = (typeof CITIZENSHIPS)[number];

export const MARITAL_STATUSES = [
  "Single",
  "Married",
  "Separated",
  "Divorced",
  "Widowed",
  "Common Law",
] as const;
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

/** Marital statuses where the printed spouse lines apply. */
export const HAS_SPOUSE: readonly MaritalStatus[] = ["Married", "Common Law"];

export const SIDE_NOTES = {
  corporations: ["For Corporations:", "indicate the", "“Nature of Business”", "in place of D.O.B"],
  identification: ["ID verified and on file", "must be authentic,", "valid and current"],
  spouse: "If your spouse is not the Joint Applicant, please complete this section",
  jointHolders:
    "Include POAs, executors, owners & officers of corporations, beneficiaries & trustees of formal trusts.",
} as const;

// ---------------------------------------------------------------- C. KYC

export const INCOME_BANDS = [
  "Under $25,000",
  "$25,000 - $49,999",
  "$50,000 - $74,999",
  "$75,000 - $99,999",
  "$100,000 - $124,999",
  "$125,000 - $199,999",
  "$200,000 - $999,999",
  "$1 Million and Over",
] as const;
export type IncomeBand = (typeof INCOME_BANDS)[number];

export const KNOWLEDGE_LEVELS = ["Novice", "Fair", "Good", "Sophisticated"] as const;
export type KnowledgeLevel = (typeof KNOWLEDGE_LEVELS)[number];

export const EXPERIENCE_TYPES = [
  "Bonds",
  "Mortgages",
  "Stocks",
  "Mutual Funds",
  "Term Deposit",
  "Real Estate",
  "None",
] as const;
export type ExperienceType = (typeof EXPERIENCE_TYPES)[number];

export const NET_WORTH_ROWS = [
  { key: "liquidAssets", label: "Liquid Assets", sub: "(See KYC Terms and Definitions)" },
  { key: "fixedAssets", label: "Fixed Assets", sub: "(See KYC Terms and Definitions)" },
  { key: "liabilities", label: "Liabilities", sub: "(See KYC Terms and Definitions)" },
] as const;
export type NetWorthKey = (typeof NET_WORTH_ROWS)[number]["key"];

export const NET_WORTH_FORMULA = "Fixed Assets + Liquid Assets – Liabilities";
export const NET_WORTH_INCLUDES_SPOUSE = "Net Worth includes Spouse’s Net Worth";

// ---------------------------------------------------------------- D-F. Plans

export const PLAN_COUNT = 3;
/** Plans 1-3 are printed as sections D, E and F. */
export const PLAN_LETTERS = ["D", "E", "F"] as const;

export const REGISTRATIONS = [
  { value: "client", label: "Client Name" },
  { value: "nominee", label: "Keybase Nominee" },
  { value: "intermediary", label: "Intermediary (Name & Account #):" },
] as const;
export type Registration = (typeof REGISTRATIONS)[number]["value"];

export const ACCOUNT_TYPE_GROUPS = [
  {
    label: "Registered:",
    prefix: "Type>",
    types: [
      "RRSP",
      "SpRRSP",
      "FHSA",
      "RESP-Indiv",
      "RESP-Fam",
      "LIRA",
      "RRIF",
      "SpRRIF",
      "LIF",
      "RDSP",
      "TFSA",
      "Group RSP",
    ],
  },
  {
    label: "Non-Registered:",
    types: ["Open Indiv.", "ITF", "JTITF", "Corporate", "Other"],
  },
  {
    label: "Joint:",
    types: ["Open JTWROS", "Open JTTIC", "JT RESP-Indiv", "JT RESP-Fam"],
  },
] as const;
export type AccountType = (typeof ACCOUNT_TYPE_GROUPS)[number]["types"][number];

export const JOINT_ACCOUNT_TYPES: readonly AccountType[] = ACCOUNT_TYPE_GROUPS[2].types;
/** Types whose beneficiary line identifies the person the account is held for. */
export const BENEFICIARY_REQUIRED_TYPES: readonly AccountType[] = [
  "ITF",
  "JTITF",
  "RESP-Indiv",
  "RESP-Fam",
  "JT RESP-Indiv",
  "JT RESP-Fam",
];

export const SIGNING_AUTHORITIES = ["All owners to sign", "Any one owner to sign"] as const;
export type SigningAuthority = (typeof SIGNING_AUTHORITIES)[number];

export const LEVERAGE_QUESTION = "Did you borrow money to invest in this account?";

export const INVESTMENT_OBJECTIVES = ["Safety", "Income", "Balanced", "Growth", "Speculation"] as const;
export type InvestmentObjective = (typeof INVESTMENT_OBJECTIVES)[number];

export const RISK_TOLERANCES = ["Low", "Low to Medium", "Medium", "Medium to High", "High"] as const;
export type RiskTolerance = (typeof RISK_TOLERANCES)[number];

export const TIME_HORIZONS = [
  "Less than 1 Year",
  "1 - 3 Years",
  "3 - 5 Years",
  "5 - 10 Years",
  "10 - 20 Years",
  "Over 20 Years",
] as const;
export type TimeHorizon = (typeof TIME_HORIZONS)[number];

export const INTENDED_USES = [
  "Tax Savings",
  "Child Education",
  "Savings",
  "Retirement Planning",
  "Other: Please Specify",
] as const;
export type IntendedUse = (typeof INTENDED_USES)[number];

export const PLAN_COLUMNS = ["current", "new"] as const;
export type PlanColumn = (typeof PLAN_COLUMNS)[number];

// ---------------------------------------------------------------- G. General

export const THIRD_PARTY_INTRO = "Will anyone, other than the applicant:";
export const THIRD_PARTY_QUESTIONS = [
  {
    key: "financialInterest",
    text: "Have a financial interest in this account?",
    note: "(e.g. a lien, collateral, banks, etc.)",
  },
  {
    key: "tradingAuthorization",
    text: "Have trading authorization on the account?",
    note: "(attach P.O.A. documents)",
  },
  { key: "makingDeposits", text: "Be making deposits to this account?", note: "" },
] as const;
export type ThirdPartyKey = (typeof THIRD_PARTY_QUESTIONS)[number]["key"];
export const THIRD_PARTY_FOLLOW_UP =
  "If you answered YES to any of the above, the third party must complete Section B";

export const CORPORATION_INTRO = "For Corporations:";
export const CORPORATION_QUESTIONS = [
  { key: "registeredCharity", text: "Is this company a registered charity under the income tax act?" },
  { key: "notForProfit", text: "Is this company a not-for-profit organization?" },
  { key: "solicitsDonations", text: "Does this company solicit charitable financial donations from the public?" },
] as const;
export type CorporationKey = (typeof CORPORATION_QUESTIONS)[number]["key"];

// ---------------------------------------------------------------- H. Banking

export const VOID_CHEQUE_LABEL = "Void cheque on file  (Attach void cheque, if not on file)";
export const BANK_OWNERS = ["Personal", "Business"] as const;
export type BankOwner = (typeof BANK_OWNERS)[number];
export const BANK_ACCOUNT_TYPES = ["Chequing", "Savings", "Other"] as const;
export type BankAccountType = (typeof BANK_ACCOUNT_TYPES)[number];

// ---------------------------------------------------------------- I-N

export const TCP_PARAGRAPH =
  "Naming a Trusted Contact Person (“TCP”) is an opportunity to help protect you if you become financially vulnerable either because of age-related mental health issues or because other people in your life may try to take advantage of you. A TCP is a complement to, and not a substitute for, a Power of Attorney (POA). The TCP does not have decision making power with respect to, or authority to effect changes to your account. By signing this document, you agree to allow Keybase Financial Group Inc.(“KFGI”) and/or your Advisor to contact your TCP under the conditions stipulated in Section 19 (Trusted Contact Persons) of the Relationship Disclosure Document. KFGI and/or your Advisor may contact your TCP should one of the above situations arise, but they are not obligated to do so and cannot be held in any way responsible for not contacting your TCP.";

export const CASL_CONSENT =
  "By checking this box, I/we hereby authorize my advisor and/or Keybase Financial Group Inc.(“KFGI”) to telephone, email, text me about financial products and services that they are authorized to distribute or provide me with personal information about my account(s), and/or send me documents that require my attention/signature pertaining to the management of my account and/or updates to my account.";

export const EDD_CONSENT =
  "By checking this box, I/we hereby consent to Keybase Financial Group Inc. (“KFGI”) supplying the following documents to me/us electronically: account statements, trade confirmations, tax receipts, or any other confirmation, notice, or information that we are required by law to provide to you in writing, relating to your accounts. KFGI will provide me/us with a confidential username and password to access my/our account documents securely online via Client Access. When my/our documents are available online, KFGI will send me/us an email alert where I/we are responsible for reviewing and/or printing the documents. I/we understand that I/we will not receive a paper copy of such documents. My/our consent may be revoked at any time by notifying KFGI or my/our Financial Advisor. I/we understand that if one joint account owner consents to the Electronic Delivery of Documents, then all joint account owners must consent to the EDD.";

export const OBA_INTRO =
  "According to the applicable regulation, all “securities related business” of your Financial Advisor must be conducted through Keybase Financial Group Inc. (“KFGI”) However, your Advisor may have and continue in other occupations or engage in other activities provided he/she meets the regulatory standards.  (Refer to Section 12 of the Keybase Relationship Disclosure document- “Dual Occupation or other Business Activity”). We want to ensure you are aware that your Financial Advisor also provides the following products and/or services:";

export const OBA_DISCLAIMER =
  "Each of these organizations is a separate entity and is responsible only for the products and services offered through them. Should you purchase mutual funds, then they are offered through KFGI. Any activities related to such other gainful occupations named above are not businesses of, nor are they the responsibility of KFGI. You may be dealing with more than one entity depending upon the products purchased or services received. KFGI will not be liable to you for any errors or omissions as a result of other products sold or services rendered by your Advisor. The remuneration earned by your Advisor may vary depending upon the products or services selected. Your personal information cannot be shared with other individuals or entities without your written permission, unless allowed by public regulations. By initialing below, you acknowledge that your Advisor has advised and fully explained the products and services he/she can provide to you:";

export const AGREEMENT_INTRO = "In consideration of Keybase Financial Group Inc. (“KFGI”) accepting this account:";
export const AGREEMENT_POINTS = [
  "I/we acknowledge that the information provided in this New Account Application Form/KYC Update accurately represents my/our personal financial situation and contains sufficient information in order for my/our Advisor to determine my/our plan(s) suitability and risk tolerance;",
  "I/we agree to advise KFGI, in writing, of any changes in my/our personal information including but not limited to name, marital status, phone number(s), address(es), employment information, investment objectives, risk tolerance, time horizon and annual income;",
  "I/we acknowledge reading Section 7 (Privacy Policy) of the Keybase Relationship Disclosure and I/we consent to my/our personal information being collected, held, used and disclosed to each company with whom I/we have an investment, account or plan in the ways and for the purposes identified in the Privacy Policy;",
  "I/we acknowledge that I/we have reviewed and understand the information provided in the “Keybase Relationship Disclosure Document.”",
] as const;

export const ADVISOR_QUESTIONS = [
  {
    key: "metInPerson",
    text: "Have you, the Advisor, met with the client in person when completing this application?",
    note: "",
  },
  {
    key: "verifiedId",
    text: "Have you, the Advisor, personally verified the client’s ID against the original document",
    note: "(new client or name change)?",
  },
  {
    key: "providedRdd",
    text: "Have you, the Advisor, provided the client with the Keybase Relationship Disclosure Document (RDD)?",
    note: "(new client)",
  },
  {
    key: "directInterest",
    text: "Do you, the Advisor, have a direct interest in the account other than an interest in commissions charged?",
    note: "",
  },
] as const;
export type AdvisorQuestionKey = (typeof ADVISOR_QUESTIONS)[number]["key"];

export const SECTION_TITLES = {
  A: "Account Holder Information",
  B: "Joint Account Holder Information",
  C: "Client KYC",
  G: "General Account Opening Questions",
  H: "Banking Information",
  I: "Trusted Contact Person",
  J: "Canadian Antispam Legislation (CASL)",
  K: "Electronic Delivery of Documents (EDD)",
  L: "Financial Advisor Outside Business Activities",
  M: "Account Agreement",
  N: "Dealer/Financial Advisor Information",
  O: "KYC Terms and Definitions",
} as const;

// ---------------------------------------------------------------- O. Page 4

export interface DefinitionBlock {
  heading: string;
  paragraphs: readonly string[];
  /** Run-in bold terms, e.g. "Safety:" followed by its definition. */
  terms?: readonly { term: string; text: string }[];
}

export const DEFINITIONS_INTRO =
  "Your Advisor has an initial obligation, based on the client’s Know-Your-Client (“KYC”) information, to ensure that your investments are suitable for you. The process for evaluating a client’s KYC information includes consideration of information such as risk tolerance, time horizon, investment objectives, age, income and net worth. While there are many factors that may affect the suitability of a recommended product, service or strategy, certain terms may require additional explanation and definition which we have identified below:";

export const DEFINITIONS: readonly DefinitionBlock[] = [
  {
    heading: "Investment Objectives",
    paragraphs: [
      "We use this information to ensure that your financial goals can be met with the investments you own and are being recommended for you that also aid in determining the optimal portfolio mix for the client. You may have more than one plan with us with a different set of objectives indicated for each plan.",
    ],
    terms: [
      {
        term: "Safety:",
        text: "Your objective is to preserve your capital. The only investments that will satisfy this objective include cash, and money market funds.",
      },
      {
        term: "Income:",
        text: "Your objective is to generate current income from your investments, and you are less concerned with capital appreciation. Investments that will satisfy this objective include fixed income investments such as funds that invest in bonds or money market instruments.",
      },
      {
        term: "Balanced:",
        text: "Your objective is a combination of income and growth. An account with a balanced objective should typically include at least 40% in fixed income investments and no more than 60% in equity mutual funds.",
      },
      {
        term: "Growth:",
        text: "Your objective is capital appreciation and current income from investments is not a requirement. This may lead you to hold a relatively high proportion of funds that invest in equities if you also have a higher risk tolerance and long term time horizon.",
      },
      {
        term: "Speculation:",
        text: "An investor who does not require funds with investment income and seeks to maximize return is considered to have a speculative objective. The investment will include equity funds and/or alternative products and speculative high-risk securities.",
      },
    ],
  },
  {
    heading: "Time Horizon",
    paragraphs: [
      "When we ask for this information we intend for you to indicate the time when you believe you will need to access 30% or more of the entire portfolio within your plan to which this question refers within the range of years you indicate. We then use this information to help determine if an investment is suitable for you given the time period you have indicated in holding the investment. You may have more than one plan with us with a different time horizon for each plan.",
    ],
  },
  {
    heading: "Investment Knowledge",
    paragraphs: [
      "This information generally indicates your understanding of investment products and financial strategies and we record the information in 4 broad categories explained below:",
    ],
    terms: [
      {
        term: "Novice:",
        text: "Typically describes an investor with less than 1 year of experience and knowledge with investments and/or credit products. Very limited knowledge or experience with products including bonds, mortgages, stocks, mutual funds, segregated funds, term deposits and real estate.",
      },
      {
        term: "Fair:",
        text: "Typically describes an investor with more than 1 years of experience with investments and/or credit products. Some knowledge or experience with products including bonds, mortgages, stocks, mutual funds, segregated funds, term deposits and real estate.",
      },
      {
        term: "Good:",
        text: "Typically describes an investor with more than 5 years of experience with investments and/or credit products. A reasonable knowledge or experience with products including bonds, mortgages, stocks, mutual funds, segregated funds, term deposits and real estate.",
      },
      {
        term: "Sophisticated:",
        text: "Typically describes an investor with more than 5 years of experience with investments and/or credit products. A strong knowledge and experience with products including bonds, mortgages, stocks, mutual funds, segregated funds, term deposits and real estate.",
      },
    ],
  },
  {
    heading: "Risk Tolerance",
    paragraphs: [
      "While higher returns are generally associated with higher risk, higher risk investments may not achieve higher returns. It is important that your risk tolerance be the lesser of your ability to withstand losses and your willingness to accept risk.",
      "This section documents your willingness and ability to assume risk and should reflect the relative weighting of the types of investments you wish to hold in the account. The value of the investments recommended should not exceed the allocation thresholds described below:",
    ],
    terms: [
      {
        term: "Low:",
        text: "Low risk investments demonstrate a low volatility and are for investors who are willing to accept lower returns for greater safety of capital and may include investments such as GICs, and money market mutual funds. These investments have a fixed unit price.",
      },
      {
        term: "Low to Medium:",
        text: "Low to Medium risk investments demonstrate a low to medium volatility but a higher volatility than those described above and may include bond or balanced funds.",
      },
      {
        term: "Medium:",
        text: "Medium risk investments demonstrate a medium volatility and are for investors that are looking for moderate growth over a longer period of time and may include Canadian dividend, Canadian equity, US equity and certain international equity funds.",
      },
      {
        term: "Medium to High:",
        text: "Medium to High risk investments demonstrate a medium to high volatility and are for investors that are looking for long term growth and may include funds that invest in smaller companies, specific market sectors or geographic areas.",
      },
      {
        term: "High:",
        text: "High risk investments demonstrate a high volatility and are for investors who are growth oriented and are willing to accept significant short term fluctuations in portfolio value in exchange for potentially higher long term returns and may include funds that invest in specific market sectors or geographic areas such as emerging markets, science and technology, or funds that engage in speculating trading strategies including hedge funds that invest in derivatives, short sell or use leverage.",
      },
    ],
  },
  {
    heading: "Annual Income",
    paragraphs: [
      "When we request this information, we refer to your personal gross annual income from all sources which include employment (earned), pension (company and government) and investment income (interest and dividends). The information is a vital part in helping us assess and offer suitable products, services or strategies.",
    ],
  },
  {
    heading: "Net Worth",
    paragraphs: ["We ask for a summary or detailed net worth information which consists of:"],
    terms: [
      {
        term: "Liquid Assets:",
        text: "A total of assets including Cash, Money Market instruments, Term Deposits/GIC’s, individual securities (including Exempt Products) and Mutual Funds whether invested in non-registered (cash) or registered plans including RRSPs, RRIFs, RESPs, TFSAs and any other property readily convertible to cash. Investments in locked-in plans (LIRA) are excluded.",
      },
      {
        term: "Fixed Assets:",
        text: "A total of assets including your home, investment properties, vacation properties, vehicles and any other property (pensions, LIRA/LIF) that is not readily converted to cash and not net of any liabilities against those assets.",
      },
      {
        term: "Liabilities:",
        text: "Includes credit cards, mortgages, line of credit balances, car loans, personal bank loans or any other indebtedness or amounts owing against any assets identified above.",
      },
    ],
  },
];
