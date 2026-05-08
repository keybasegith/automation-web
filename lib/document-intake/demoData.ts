import { findCatalogItemByName } from "./documentCatalog";
import { buildSuggestedFileName } from "./groupPages";
import type {
  ClassificationSource,
  DocumentGroup,
  DocumentGroupStatus,
  DocumentType,
} from "./types";

interface DemoPlanItem {
  pageStart: number;
  pageEnd: number;
  documentName: string;
  documentCode?: string;
  category: string;
  documentType: DocumentType;
  confidence: number;
  reason: string;
  matchedKeywords: string[];
  preview: string;
  source: ClassificationSource;
}

const PLAN: DemoPlanItem[] = [
  {
    pageStart: 1,
    pageEnd: 4,
    documentName: "New Application - 4 Pages - 10003",
    documentCode: "10003",
    category: "Keybase Account Opening",
    documentType: "NAAF",
    confidence: 96,
    reason: "exact form code match (10003); title-level match near top of page",
    matchedKeywords: ["New Application", "account opening", "client information", "account type"],
    preview:
      "NEW APPLICATION - 4 PAGES - 10003. Account Holder: Jane Smith. Account Type: Individual Cash. Investment Dealer: Keybase Financial Group. Client information…",
    source: "keyword",
  },
  {
    pageStart: 5,
    pageEnd: 7,
    documentName: "KYC Update - 3 Pages - 10001",
    documentCode: "10001",
    category: "Keybase Know Your Client KYC",
    documentType: "KYC",
    confidence: 93,
    reason: "exact form code match (10001); aliases: KYC, Know Your Client; keywords: investment objectives, time horizon, risk tolerance",
    matchedKeywords: ["KYC", "Know Your Client", "investment objectives", "risk tolerance", "time horizon"],
    preview:
      "KYC Update - 3 Pages - 10001. Investment Objectives: Growth. Risk Tolerance: Medium. Time Horizon: 10+ years. Net Worth: $500,000…",
    source: "keyword",
  },
  {
    pageStart: 8,
    pageEnd: 10,
    documentName: "Keybase Client Risk Questionnaire For Individual - 10087",
    documentCode: "10087",
    category: "Keybase Client Risk Questionnaire",
    documentType: "CRQ",
    confidence: 91,
    reason: "exact form code match (10087); title match; aliases: CRQ, Client Risk Questionnaire",
    matchedKeywords: ["CRQ", "Client Risk Questionnaire", "risk profile", "risk score", "individual"],
    preview:
      "Keybase Client Risk Questionnaire For Individual - 10087. Risk Score: 14 / 25. Risk Profile: Medium. Q1: How would you react to a 15% portfolio decline?",
    source: "keyword",
  },
  {
    pageStart: 11,
    pageEnd: 11,
    documentName: "Trusted Contact Person TCP - 10079",
    documentCode: "10079",
    category: "Keybase Know Your Client KYC",
    documentType: "KYC",
    confidence: 78,
    reason: "exact form code match (10079); aliases: Trusted Contact Person, TCP",
    matchedKeywords: ["Trusted Contact Person", "TCP"],
    preview:
      "Trusted Contact Person (TCP) — Name of trusted contact: ____________. Relationship: ____________. Phone: ____________.",
    source: "keyword",
  },
  {
    pageStart: 12,
    pageEnd: 12,
    documentName: "Consent to Electronic Delivery of Documents - 10016",
    documentCode: "10016",
    category: "Keybase Account Opening",
    documentType: "NAAF",
    confidence: 88,
    reason: "exact form code match (10016); title match; keywords: electronic delivery, consent",
    matchedKeywords: ["electronic delivery", "consent"],
    preview:
      "Consent to Electronic Delivery of Documents - 10016. The undersigned agrees to receive statements and confirmations electronically…",
    source: "keyword",
  },
  {
    pageStart: 13,
    pageEnd: 15,
    documentName: "Keybase SD TFSA Application - 10009",
    documentCode: "10009",
    category: "Keybase Nominee SD Account",
    documentType: "Other",
    confidence: 82,
    reason: "exact form code match (10009); aliases: TFSA, SD, nominee; keywords: self directed, beneficiary",
    matchedKeywords: ["TFSA", "self directed", "nominee", "beneficiary"],
    preview:
      "Keybase SD TFSA Application - 10009. Account holder: Jane Smith. Successor holder: ____________. Contributions per year: ____________.",
    source: "keyword",
  },
  {
    pageStart: 16,
    pageEnd: 16,
    documentName: "Passport",
    documentCode: undefined,
    category: "Identity Documents",
    documentType: "Passport",
    confidence: 96,
    reason: "Machine Readable Zone (MRZ) pattern detected",
    matchedKeywords: ["MRZ", "passport", "nationality"],
    preview:
      "PASSPORT — Surname: SMITH. Given Names: JANE M. Nationality: CANADIAN. Place of Birth: TORONTO. Date of Expiry: 2031-08-14. P<CANSMITH<<JANE…",
    source: "keyword",
  },
  {
    pageStart: 17,
    pageEnd: 17,
    documentName: "Void Cheque",
    documentCode: undefined,
    category: "Banking",
    documentType: "Void Cheque",
    confidence: 64,
    reason: "aliases: Void Cheque; keywords: transit, institution, account number",
    matchedKeywords: ["void cheque", "transit", "institution", "account number"],
    preview:
      "VOID — Pay to the order of: VOID. Transit: 12345. Institution: 003. Account Number: 0001234. (For direct deposit only.)",
    source: "keyword",
  },
];

function statusFor(item: DemoPlanItem): DocumentGroupStatus {
  if (item.documentName === "Unsure") return "Unsure";
  if (item.documentName === "Unknown") return "Unknown";
  if (item.confidence < 60) return "Low Confidence";
  if (item.confidence < 85) return "Needs Review";
  return "Ready";
}

export const DEMO_TOTAL_PAGES = PLAN.reduce(
  (max, item) => Math.max(max, item.pageEnd),
  0
);

export function buildDemoGroups(args: {
  clientName: string;
  clientId?: string;
  advisorName?: string;
}): DocumentGroup[] {
  return PLAN.map((item, idx) => {
    const pageNumbers: number[] = [];
    for (let p = item.pageStart; p <= item.pageEnd; p++) pageNumbers.push(p);
    const status = statusFor(item);
    // Confirm each demo entry exists in the catalog where applicable — this
    // catches accidental drift between the demo data and the real catalog.
    void findCatalogItemByName(item.documentName);
    const suggested = buildSuggestedFileName({
      clientName: args.clientName || "Demo_Client",
      clientId: args.clientId,
      advisorName: args.advisorName,
      documentName: item.documentName,
      documentCode: item.documentCode,
      category: item.category,
      startPage: item.pageStart,
      endPage: item.pageEnd,
    });
    return {
      id: `demo_${idx}_${item.documentCode ?? item.documentName.replace(/\s+/g, "_")}`,
      documentType: item.documentType,
      documentName: item.documentName,
      documentCode: item.documentCode,
      category: item.category,
      startPage: item.pageStart,
      endPage: item.pageEnd,
      pageNumbers,
      averageConfidence: item.confidence,
      status,
      needsReview: status !== "Ready",
      approved: false,
      reason: item.reason,
      matchedKeywords: item.matchedKeywords,
      extractedTextPreview: item.preview,
      source: item.source,
      suggestedFileName: suggested,
      finalFileName: suggested,
    };
  });
}
