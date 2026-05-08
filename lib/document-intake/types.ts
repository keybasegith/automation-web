// Coarse legacy classification, kept for backward compatibility with the
// initial MVP. New code paths key off `documentName` / `category` instead.
export const DOCUMENT_TYPES = [
  "NAAF",
  "KYC",
  "CRQ",
  "Passport",
  "Driver's License",
  "Void Cheque",
  "Signature Page",
  "Tax Form",
  "Other",
  "Unknown",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export type DocumentGroupStatus =
  | "Ready"
  | "Needs Review"
  | "Low Confidence"
  | "Unsure"
  | "Unknown";

export const UNSURE_DOCUMENT_NAME = "Unsure";

export type ClassificationSource = "keyword" | "ai" | "manual" | "fallback";

export interface PageClassification {
  pageNumber: number;
  /** Coarse type for badges/back-compat. */
  documentType: DocumentType;
  /** Specific document name (from the catalog or "Other" / "Unknown"). */
  documentName: string;
  documentCode?: string;
  category: string;
  confidence: number;
  reason: string;
  matchedKeywords: string[];
  extractedTextPreview: string;
  needsReview: boolean;
  source: ClassificationSource;
}

export interface DocumentGroup {
  id: string;
  /** Coarse type for badges/back-compat. */
  documentType: DocumentType;
  documentName: string;
  documentCode?: string;
  category: string;
  startPage: number;
  endPage: number;
  pageNumbers: number[];
  averageConfidence: number;
  status: DocumentGroupStatus;
  needsReview: boolean;
  approved: boolean;
  reason: string;
  matchedKeywords: string[];
  extractedTextPreview: string;
  /** Highest source seen across the group's pages (manual > ai > keyword > fallback). */
  source: ClassificationSource;
  /** Auto-generated based on the template — recomputed when fields change. */
  suggestedFileName: string;
  /** What the employee will actually download. Initialized from suggestedFileName. */
  finalFileName: string;
}

export type AuditAction =
  | "file_uploaded"
  | "document_analyzed"
  | "document_type_changed"
  | "split_approved"
  | "final_documents_generated"
  | "employee_pin_confirmed"
  | "ai_classification_enabled"
  | "ai_classification_disabled"
  | "ai_classification_used"
  | "catalog_match_found"
  | "file_name_changed"
  | "batch_template_applied"
  | "downloaded_selected"
  | "downloaded_all";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  employeeName: string;
  action: AuditAction;
  clientName: string;
  fileName: string;
  details: string;
  /** Optional structured before/after — used for manual edits. */
  previousValue?: string;
  newValue?: string;
}

export interface SeparatedDocumentFile {
  id: string;
  fileName: string;
  documentName: string;
  documentCode?: string;
  category: string;
  documentType: DocumentType;
  startPage: number;
  endPage: number;
  pageCount: number;
  blobUrl: string;
  status: DocumentGroupStatus;
}

export const EXPECTED_CORE_DOCUMENTS: DocumentType[] = ["NAAF", "KYC", "CRQ"];
