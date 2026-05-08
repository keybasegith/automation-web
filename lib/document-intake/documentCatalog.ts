/**
 * Document catalog for Smart Document Intake.
 *
 * The catalog drives:
 *   1. Page classification (alias / keyword / code matching).
 *   2. The searchable dropdown in the review table.
 *   3. Suggested file names for the splitter.
 *
 * The shape exported is one DocumentCatalogItem per form. To keep the file
 * editable we author the data as a list of category groups and expand the
 * shared aliases/keywords onto each item at module load.
 */

export type DocumentCatalogItem = {
  documentCode?: string;
  documentName: string;
  category: string;
  aliases: string[];
  keywords: string[];
  expectedPageCount?: number | number[];
  isCoreDocument?: boolean;
  requiresReview?: boolean;
};

interface CatalogGroup {
  category: string;
  aliases: string[];
  keywords: string[];
  items: {
    documentCode?: string;
    documentName: string;
    expectedPageCount?: number | number[];
    isCoreDocument?: boolean;
    requiresReview?: boolean;
  }[];
}

const GROUPS: CatalogGroup[] = [
  {
    category: "Keybase Client Risk Questionnaire",
    aliases: ["CRQ", "Client Risk Questionnaire", "Risk Questionnaire", "Risk Profile", "Risk Score"],
    keywords: [
      "Client Risk Questionnaire",
      "investment risk",
      "risk tolerance",
      "risk profile",
      "questionnaire",
      "risk score",
      "corporate",
      "individual",
      "joint",
    ],
    items: [
      { documentCode: "10089", documentName: "Keybase Client Risk Questionnaire For Corporate - 10089", isCoreDocument: true },
      { documentCode: "10087", documentName: "Keybase Client Risk Questionnaire For Individual - 10087", isCoreDocument: true },
      { documentCode: "10088", documentName: "Keybase Client Risk Questionnaire For Joint - 10088", isCoreDocument: true },
      { documentCode: "10106", documentName: "Old - Keybase Client Risk Questionnaire Short - 10106" },
      { documentCode: "10086", documentName: "Old - Keybase Client Risk Questionnaire - 10086" },
    ],
  },
  {
    category: "Keybase Know Your Client KYC",
    aliases: ["KYC", "Know Your Client", "KYC Update", "Trusted Contact Person", "TCP"],
    keywords: [
      "Know Your Client",
      "KYC",
      "investment objectives",
      "time horizon",
      "risk tolerance",
      "net worth",
      "investment knowledge",
      "trusted contact person",
      "TCP",
    ],
    items: [
      { documentCode: "10002", documentName: "KYC Update - 2 Pages - 10002", expectedPageCount: 2, isCoreDocument: true },
      { documentCode: "10001", documentName: "KYC Update - 3 Pages - 10001", expectedPageCount: 3, isCoreDocument: true },
      { documentCode: "10079", documentName: "Trusted Contact Person TCP - 10079" },
    ],
  },
  {
    category: "Keybase Account Opening",
    aliases: [
      "NAAF",
      "New Application",
      "New Account Application",
      "Account Opening",
      "Onboarding",
      "PEP Declaration",
      "Politically Exposed Person",
      "Relationship Disclosure",
      "Fee Schedule",
      "Limited Authorization",
      "Electronic Delivery Consent",
    ],
    keywords: [
      "New Application",
      "Account Opening",
      "New Account Application",
      "client information",
      "account type",
      "politically exposed",
      "PEP",
      "relationship disclosure",
      "fee schedule",
      "electronic delivery",
      "limited authorization",
      "credit information",
      "onboarding",
    ],
    items: [
      { documentCode: "10046", documentName: "Client Authorization to Obtain Credit Information - 10046" },
      { documentCode: "10016", documentName: "Consent to Electronic Delivery of Documents - 10016" },
      { documentCode: "10066", documentName: "Fee Schedule - 10066" },
      { documentCode: "10043", documentName: "Limited Authorization Form - 10043" },
      { documentCode: "10004", documentName: "New Application - 3 Pages - 10004", expectedPageCount: 3, isCoreDocument: true },
      { documentCode: "10003", documentName: "New Application - 4 Pages - 10003", expectedPageCount: 4, isCoreDocument: true },
      { documentCode: "10053", documentName: "New Application On Boarding - 10053", isCoreDocument: true },
      { documentCode: "10047", documentName: "Politically Exposed Persons Declaration - 10047" },
      { documentCode: "10013", documentName: "Relationship Disclosure - 10013" },
    ],
  },
  {
    category: "Keybase Nominee SD Account",
    aliases: [
      "Nominee",
      "SD Account",
      "RRSP",
      "RRIF",
      "TFSA",
      "GRRSP",
      "GIC",
      "T2033",
      "Beneficiary Update",
      "Contingent Update",
      "Premier Portfolio Program",
      "Account Fee Payment Options",
    ],
    keywords: [
      "nominee",
      "self directed",
      "SD",
      "RRSP",
      "RRIF",
      "TFSA",
      "GRRSP",
      "GIC",
      "T2033",
      "beneficiary",
      "contingent",
      "transfer",
      "account fee",
      "payment options",
      "premier portfolio",
    ],
    items: [
      { documentCode: "10076", documentName: "Beneficiary Contingent Update Form Nominee - 10076" },
      { documentCode: "10023", documentName: "GIC Business Application - 10023" },
      { documentCode: "10024", documentName: "GIC Individual Application - 10024" },
      { documentCode: "10010", documentName: "Keybase SD GRRSP Application - 10010" },
      { documentCode: "10007", documentName: "Keybase SD RRIF Application - 10007" },
      { documentCode: "10006", documentName: "Keybase SD RRSP Application - 10006" },
      { documentCode: "10011", documentName: "Keybase SD T2033 Transfer - 10011" },
      { documentCode: "10050", documentName: "Keybase SD T2033 Transfer Optional 2nd Form - 10050" },
      { documentCode: "10009", documentName: "Keybase SD TFSA Application - 10009" },
      { documentCode: "10008", documentName: "Keybase SD TFSA Transfer - 10008" },
      { documentCode: "10056", documentName: "LOD Account Fee Payment Options - 10056" },
      { documentCode: "10025", documentName: "Premier Portfolio Program Agreement - 10025" },
    ],
  },
  {
    category: "Keybase PAC/SWP",
    aliases: ["PAC", "SWP", "Pre Authorized Contribution", "Systematic Withdrawal Plan"],
    keywords: [
      "PAC",
      "SWP",
      "pre authorized contribution",
      "systematic withdrawal",
      "banking information",
      "withdrawal plan",
      "contribution plan",
    ],
    items: [
      {
        documentCode: "10084",
        documentName: "New Application On Boarding - 6 Pages - 10084",
        expectedPageCount: 6,
      },
    ],
  },
  {
    category: "Keybase Trading",
    aliases: ["Auto Switch", "Commission Rebate", "Order Request", "PAC Request", "AIO"],
    keywords: [
      "auto switch",
      "commission rebate",
      "order request",
      "PAC request",
      "AIO",
      "trade",
      "fund order",
      "switch program",
    ],
    items: [
      { documentCode: "10017", documentName: "Auto Switch Program - 10017" },
      { documentCode: "10019", documentName: "Commission Rebate Disclosure - 10019" },
      { documentCode: "10099", documentName: "Order / PAC Request AIO 1st Plan - 10099" },
      { documentCode: "10103", documentName: "Order / PAC Request AIO 2nd Plan - 10103" },
      { documentCode: "10104", documentName: "Order / PAC Request AIO 3rd Plan - 10104" },
      { documentCode: "10105", documentName: "Order / PAC Request AIO 4th Plan - 10105" },
    ],
  },
  {
    category: "Keybase Transfer",
    aliases: ["Transfer", "Transfer Account", "Internal Transfer", "Transfer in Kind"],
    keywords: [
      "authorization to transfer",
      "transfer account",
      "internal transfer",
      "transfer in kind",
      "relinquishing institution",
      "receiving institution",
    ],
    items: [
      { documentCode: "10021", documentName: "Authorization to Transfer Account Nominee Open - 10021" },
      { documentCode: "10093", documentName: "Internal Transfer in Kind - 10093" },
    ],
  },
  {
    category: "Keybase Addendums",
    aliases: ["LIF", "LIRA", "LIRSP", "LRSP", "PRIF", "RLIF", "RLSP", "Locked In", "Addendum", "Unlocking Form"],
    keywords: [
      "addendum",
      "locked in",
      "LIF",
      "LIRA",
      "LIRSP",
      "LRSP",
      "PRIF",
      "RLIF",
      "RLSP",
      "unlocking",
      "federal",
      "Ontario",
      "Alberta",
      "British Columbia",
      "Manitoba",
      "Saskatchewan",
      "New Brunswick",
      "Nova Scotia",
      "Newfoundland",
    ],
    items: [
      { documentCode: "10033", documentName: "LIF Addendum Alberta - 10033" },
      { documentCode: "10036", documentName: "LIF Addendum BC - 10036" },
      { documentCode: "10031", documentName: "LIF Addendum Federal - 10031" },
      { documentCode: "10077", documentName: "LIF Addendum Manitoba - 10077" },
      { documentCode: "10038", documentName: "LIF Addendum New Brunswick - 10038" },
      { documentCode: "10081", documentName: "LIF Addendum Nova Scotia - 10081" },
      { documentCode: "10027", documentName: "LIF Addendum Ontario - 10027" },
      { documentCode: "10032", documentName: "LIRA Addendum Alberta - 10032" },
      { documentCode: "10034", documentName: "LIRA Addendum BC - 10034" },
      { documentCode: "10078", documentName: "LIRA Addendum Manitoba - 10078" },
      { documentCode: "10037", documentName: "LIRA Addendum New Brunswick - 10037" },
      { documentCode: "10041", documentName: "LIRA Addendum Newfoundland - 10041" },
      { documentCode: "10042", documentName: "LIRA Addendum Nova Scotia - 10042" },
      { documentCode: "10026", documentName: "LIRA Addendum Ontario - 10026" },
      { documentCode: "10039", documentName: "LIRA Addendum Saskatchewan - 10039" },
      { documentCode: "10035", documentName: "LIRSP Addendum BC - 10035" },
      { documentCode: "10028", documentName: "LRSP Addendum Federal - 10028" },
      { documentCode: "10040", documentName: "PRIF Addendum Saskatchewan - 10040" },
      { documentCode: "10030", documentName: "RLIF Addendum Federal - 10030" },
      { documentCode: "10029", documentName: "RLSP Addendum Federal - 10029" },
      { documentCode: "101100", documentName: "Unlocking Form 1 Federal - 101100" },
      { documentCode: "101101", documentName: "Unlocking Form 2 Federal - 101101" },
      { documentCode: "101102", documentName: "Unlocking Form 3 Federal - 101102" },
    ],
  },
  {
    category: "Advisor Related Forms",
    aliases: ["LTA Trade Notes", "Outside Activities", "Other Activities Disclosure", "Advisor Disclosure"],
    keywords: [
      "LTA",
      "trade notes",
      "outside activities",
      "other activities",
      "disclosure",
      "acknowledgement",
      "advisor",
    ],
    items: [
      { documentCode: "10085", documentName: "LTA Trade Notes - 10085" },
      { documentCode: "10082", documentName: "Outside Other Activities Disclosure and Acknowledgement - 10082" },
    ],
  },
  {
    category: "Keybase Leverage and Loan Forms",
    aliases: ["Leverage", "Loan Review", "Leverage Risk Disclosure"],
    keywords: [
      "leverage",
      "loan",
      "risk disclosure",
      "non registered",
      "registered accounts",
      "loan review",
      "borrowing to invest",
    ],
    items: [
      { documentCode: "10060", documentName: "Existing Leverage Loan Review Worksheet - 10060" },
      { documentCode: "10058", documentName: "Leverage Risk Disclosure Non Registered Accounts - 10058" },
      { documentCode: "10059", documentName: "Leverage Risk Disclosure Registered Accounts - 10059" },
    ],
  },
  {
    category: "Unlocking Forms",
    aliases: [
      "Financial Hardship Unlocking",
      "Waiver of Survivor Benefit",
      "Locked In Account",
      "Form 4",
      "Form 4.1",
      "Form 5",
      "Form 5.2",
    ],
    keywords: [
      "financial hardship",
      "unlocking",
      "survivor benefit",
      "locked in account",
      "withdraw",
      "transfer",
      "Ontario",
      "schedule 1.1",
      "LIF",
    ],
    items: [
      { documentName: "Form 4 Financial Hardship Unlocking" },
      { documentName: "Form 4.1 Waiver of Survivor Benefit Ontario Locked-in Account" },
      { documentName: "Form 5 Application Withdraw Transfer Ontario Locked-in Account" },
      { documentName: "Form 5.2 Application Withdraw Transfer 50 percent into Schedule 1.1 LIF" },
    ],
  },
  {
    category: "Keybase Other",
    aliases: [
      "Meeting Notes",
      "Memo",
      "Memorandum",
      "Internal Memo",
      "Corporate Resolution",
      "Dealer Advisor Change",
      "Declaration of Understanding",
      "Electronic Signature Consent",
      "Estate Claim",
      "Letter of Indemnity",
      "Non Financial Change",
      "Personal Financial Review",
    ],
    keywords: [
      "advisor client meeting notes",
      "memo",
      "memorandum",
      "internal memo",
      "to:",
      "from:",
      "subject:",
      "re:",
      "corporate resolution",
      "dealer advisor change",
      "declaration of understanding",
      "electronic signature",
      "estate",
      "claim form",
      "probate",
      "non probate",
      "letter of indemnity",
      "non financial change",
      "beneficiary",
      "personal financial review",
    ],
    items: [
      // NOTE: doc codes removed from Meeting Notes (10088), Estate Letter of
      // Indemnity (10089), and Personal Financial Review (10087) because those
      // codes also belong to CRQ For Joint / Corporate / Individual. The
      // collision was producing tied scores on real CRQ pages.
      { documentName: "Advisor Client Meeting Notes" },
      { documentName: "Memo" },
      { documentCode: "10022", documentName: "Corporate Resolution - 10022" },
      { documentCode: "10057", documentName: "Dealer Advisor Change Authorization - 10057" },
      { documentCode: "10092", documentName: "Declaration of Understanding and Direction - 10092" },
      { documentCode: "10094", documentName: "Electronic Signature Consent - 10094" },
      { documentName: "Estate Keybase SD Registered Accounts Letter of Indemnity" },
      { documentCode: "10090", documentName: "Estate Nominee Open Estate Claim Form Non Probate - 10090" },
      { documentCode: "10091", documentName: "Estate Nominee Open Estate Claim Form Probate - 10091" },
      { documentCode: "10020", documentName: "Non Financial Change Beneficiary Contingent Update - 10020" },
      { documentCode: "10065", documentName: "Non Financial Change Beneficiary Contingent Update 3 Pages - 10065" },
      { documentName: "Personal Financial Review" },
    ],
  },
  {
    category: "Manually Added",
    aliases: ["B2B PAD", "Pre Authorized Debit", "Tax Residence", "FID Account Linking", "FID Advisor Service Fee"],
    keywords: [
      "pre authorized debit",
      "PAD",
      "tax residence",
      "FID",
      "account linking",
      "advisor service fee",
    ],
    items: [
      { documentCode: "10080", documentName: "B2B Pre Authorized Debit Agreement - 10080" },
      { documentCode: "10061", documentName: "Declaration of Tax Residence for Individuals - 10061" },
      { documentCode: "10062", documentName: "FID Account Linking - 10062" },
      { documentCode: "10063", documentName: "FID Advisor Service Fee - 10063" },
    ],
  },
  {
    category: "Keybase Insurance",
    aliases: [
      "KIA",
      "Insurance",
      "Insurance Disclosure",
      "Insurance Order Request",
      "KIA KYC",
      "KIA PAC/SWP",
    ],
    keywords: [
      "KIA",
      "insurance",
      "insurance disclosure",
      "electronic delivery",
      "dealer advisor change",
      "new application",
      "KYC update",
      "non financial change",
      "order request",
      "PAC",
      "SWP",
    ],
    items: [
      { documentCode: "10068", documentName: "KIA Consent to Electronic Delivery of Documents - 10068" },
      { documentCode: "10069", documentName: "KIA Dealer Advisor Change Authorization - 10069" },
      { documentCode: "10070", documentName: "KIA Insurance Disclosure Statement - 10070" },
      { documentCode: "10055", documentName: "KIA New Application KYC Update - 10055" },
      { documentCode: "10071", documentName: "KIA Non Financial Change Update - 10071" },
      { documentCode: "10054", documentName: "KIA Order Request - 10054" },
      { documentCode: "10072", documentName: "KIA PAC/SWP Request 1 Page - 10072" },
    ],
  },
  {
    category: "Government and CRA Forms",
    aliases: [
      "CRA",
      "RC518",
      "RC519",
      "RC720",
      "RC725",
      "SIN Application",
      "T1036",
      "T2030",
      "T2033",
      "T2151",
      "T2220",
      "T3012",
      "FHSA",
      "HBP",
      "Tax Residence",
    ],
    keywords: [
      "Canada Revenue Agency",
      "CRA",
      "RC518",
      "RC519",
      "RC720",
      "RC725",
      "SIN",
      "social insurance number",
      "T1036",
      "Home Buyers Plan",
      "HBP",
      "T2030",
      "T2033",
      "T2151",
      "T2220",
      "T3012",
      "FHSA",
      "RRSP",
      "RRIF",
      "tax deduction waiver",
      "tax residence",
      "qualifying withdrawal",
    ],
    items: [
      { documentCode: "RC518-20e", documentName: "CRA RC518-20e Declaration of Tax Residence for Individuals" },
      { documentCode: "RC519-20e", documentName: "CRA RC519-20e Declaration of Tax Residence for Entities" },
      { documentCode: "RC720-24e", documentName: "CRA RC720-24e Transfer from RRSP to FHSA" },
      { documentCode: "RC725-23e", documentName: "CRA RC725-23e Qualifying Withdrawal from FHSA" },
      { documentName: "SIN App Gov Government SIN Application Form" },
      { documentCode: "T1036", documentName: "T1036 Gov Home Buyers Plan Request to Withdraw Funds from RRSP" },
      { documentCode: "T2030", documentName: "T2030 Gov Direct Transfer Under Subparagraph 60(l)(v)" },
      { documentCode: "T2033", documentName: "T2033 Gov Direct Transfer Under Paragraph 146(16)(a) or 146.3(2)(e)" },
      { documentCode: "T2151", documentName: "T2151 Gov Direct Transfer of a Single Amount" },
      {
        documentCode: "T2220",
        documentName: "T2220 Gov Transfer from RRSP or RRIF on Breakdown of Marriage or Common Law Partnership",
      },
      { documentCode: "T3012", documentName: "T3012 Gov Tax Deduction Waiver" },
    ],
  },
  {
    category: "RESP and Education Forms",
    aliases: ["RESP", "ESDC", "HRSDC", "CESG", "CLB", "SDE 0100", "SDE 0074", "SDE 0093"],
    keywords: [
      "RESP",
      "education savings",
      "ESDC",
      "HRSDC",
      "SDE 0100",
      "SDE 0074",
      "SDE 0093",
      "CESG",
      "CLB",
      "Canada Education Savings Grant",
      "Canada Learning Bond",
      "subscriber request",
      "receiving promoter",
      "relinquishing promoter",
      "beneficiary",
      "custodial parent",
    ],
    items: [
      { documentName: "ESDC SDE 0100 Annex 1" },
      { documentName: "ESDC SDE 0100 Part A" },
      { documentName: "ESDC SDE 0100 Part B" },
      { documentName: "ESDC SDE 0100 Part C" },
      { documentName: "HRSDC SDE 0074" },
      { documentName: "HRSDC SDE 0093" },
      { documentName: "HRSDC SDE 0093 Annex A" },
      { documentName: "HRSDC SDE 0093 Annex B" },
    ],
  },
  {
    category: "RDBA Forms",
    aliases: ["RDBA", "Client Consent", "Identity Verification", "GIC Cert App"],
    keywords: [
      "RDBA",
      "client consent",
      "client information",
      "identity verification",
      "GIC certificate",
      "investment application",
    ],
    items: [
      { documentName: "RDBA Client Consent Form" },
      { documentName: "RDBA Client Identity Verification" },
      { documentName: "RDBA GIC Cert App" },
    ],
  },
  {
    category: "Calculation and Reference Documents",
    aliases: ["Daily Valuation", "Gain Loss", "Modified Dietz", "XIRR"],
    keywords: [
      "daily valuation",
      "gain loss",
      "modified dietz",
      "annualized modified dietz",
      "XIRR",
      "calculation explained",
      "performance calculation",
    ],
    items: [
      { documentName: "Daily Valuation" },
      { documentName: "Gain/Loss" },
      { documentName: "Modified Dietz" },
      { documentName: "XIRR" },
    ],
  },
  // Identity / supporting documents — kept as a small set so they appear in
  // the picker even though Keybase doesn't number them.
  {
    category: "Identity Documents",
    aliases: ["Passport", "Driver's License", "Driver's Licence", "Driving Licence"],
    keywords: [
      "passport",
      "nationality",
      "place of birth",
      "date of expiry",
      "passport no",
      "passport number",
      "issuing country",
      "given names",
      "surname",
      "driver's licence",
      "driver's license",
      "driving licence",
      "class",
      "restrictions",
      "licence no",
      "license no",
      "DOB",
    ],
    items: [
      { documentName: "Passport" },
      { documentName: "Driver's License" },
      { documentName: "Government ID (Other)" },
    ],
  },
  {
    category: "Banking",
    aliases: ["Void Cheque", "Voided Cheque", "Direct Deposit"],
    keywords: ["void cheque", "void check", "voided cheque", "void", "transit", "institution", "account number", "direct deposit", "routing"],
    items: [{ documentName: "Void Cheque" }],
  },
  {
    category: "Signature Pages",
    aliases: ["Signature Page", "Authorized Signature", "Client Signature"],
    keywords: [
      "signature page",
      "authorized signature",
      "client signature",
      "advisor signature",
      "date signed",
      "signed by",
    ],
    items: [{ documentName: "Signature Page" }],
  },
];

function expand(): DocumentCatalogItem[] {
  const out: DocumentCatalogItem[] = [];
  for (const group of GROUPS) {
    for (const item of group.items) {
      out.push({
        documentCode: item.documentCode,
        documentName: item.documentName,
        category: group.category,
        aliases: group.aliases,
        keywords: group.keywords,
        expectedPageCount: item.expectedPageCount,
        isCoreDocument: item.isCoreDocument,
        requiresReview: item.requiresReview,
      });
    }
  }
  return out;
}

export const DOCUMENT_CATALOG: DocumentCatalogItem[] = expand();

export const DOCUMENT_CATEGORIES: string[] = Array.from(
  new Set(DOCUMENT_CATALOG.map((d) => d.category))
).sort();

/**
 * Special non-catalog options shown at the bottom of the document picker so
 * the employee can mark a group manually.
 */
export const MANUAL_DOCUMENT_OPTIONS = [
  { documentName: "Other", category: "Other" },
  { documentName: "Unknown", category: "Unknown" },
] as const;

export interface CoreCoverageRequirement {
  /** Display label shown in the missing-documents warning. */
  label: string;
  /** Match if any of these documentName values appear, OR a category match. */
  matchDocumentNames?: readonly string[];
  matchCategories?: readonly string[];
}

/**
 * Core onboarding documents the system expects to see in every package.
 * The classifier flags any of these that aren't detected.
 */
export const CORE_DOCUMENT_REQUIREMENTS: readonly CoreCoverageRequirement[] = [
  {
    label: "New Application / NAAF",
    matchDocumentNames: [
      "New Application - 3 Pages - 10004",
      "New Application - 4 Pages - 10003",
      "New Application On Boarding - 10053",
    ],
    matchCategories: ["Keybase Account Opening"],
  },
  {
    label: "KYC Update",
    matchDocumentNames: [
      "KYC Update - 2 Pages - 10002",
      "KYC Update - 3 Pages - 10001",
    ],
    matchCategories: ["Keybase Know Your Client KYC"],
  },
  {
    label: "Client Risk Questionnaire",
    matchDocumentNames: [
      "Keybase Client Risk Questionnaire For Corporate - 10089",
      "Keybase Client Risk Questionnaire For Individual - 10087",
      "Keybase Client Risk Questionnaire For Joint - 10088",
    ],
    matchCategories: ["Keybase Client Risk Questionnaire"],
  },
];

/**
 * Look up a catalog item by exact document name. Useful when the employee
 * picks from the dropdown and we need to fill in category/code.
 */
export function findCatalogItemByName(
  documentName: string
): DocumentCatalogItem | undefined {
  return DOCUMENT_CATALOG.find((d) => d.documentName === documentName);
}

export function findCatalogItemByCode(
  documentCode: string
): DocumentCatalogItem | undefined {
  const needle = documentCode.toLowerCase();
  return DOCUMENT_CATALOG.find(
    (d) => d.documentCode && d.documentCode.toLowerCase() === needle
  );
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Build a single regex that matches any catalog form code. Codes are matched
 * with strict word boundaries so "10089" never matches inside "100891234"
 * and "T2033" never matches inside "T20332".
 *
 * Numeric codes (10001, 10089, etc.) use \b on both sides. Codes with non-word
 * trailing characters (e.g. "RC518-20e") use a (?!\w) lookahead because
 * standard \b only triggers on word/non-word transitions.
 */
function buildCatalogCodeRegex(): RegExp {
  const codes = DOCUMENT_CATALOG.map((d) => d.documentCode).filter(
    (c): c is string => typeof c === "string" && c.length > 0
  );
  const unique = Array.from(new Set(codes));
  // Sort longest-first so multi-char codes match before shorter prefixes.
  unique.sort((a, b) => b.length - a.length);
  const alternation = unique.map((code) => escapeRegExp(code)).join("|");
  return new RegExp(`(?<![A-Za-z0-9])(?:${alternation})(?![A-Za-z0-9])`, "gi");
}

const CATALOG_CODE_REGEX = buildCatalogCodeRegex();

/**
 * Find every catalog form code present in the given text. Returns the set of
 * unique catalog items whose documentCode appears (case-insensitive, strict
 * boundaries).
 */
export function findCatalogCodesInText(text: string): DocumentCatalogItem[] {
  if (!text) return [];
  CATALOG_CODE_REGEX.lastIndex = 0;
  const seen = new Set<string>();
  const hits: DocumentCatalogItem[] = [];
  let match: RegExpExecArray | null;
  while ((match = CATALOG_CODE_REGEX.exec(text)) !== null) {
    const code = match[0].toLowerCase();
    if (seen.has(code)) continue;
    seen.add(code);
    const item = findCatalogItemByCode(match[0]);
    if (item) hits.push(item);
  }
  return hits;
}
