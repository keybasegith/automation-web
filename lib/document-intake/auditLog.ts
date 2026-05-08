import type { AuditAction, AuditLogEntry } from "./types";

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `audit_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function createIntakeAuditEntry(args: {
  employeeName: string;
  action: AuditAction;
  clientName: string;
  fileName: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}): AuditLogEntry {
  return {
    id: makeId(),
    timestamp: new Date().toISOString(),
    employeeName: args.employeeName,
    action: args.action,
    clientName: args.clientName,
    fileName: args.fileName,
    details: args.details,
    previousValue: args.previousValue,
    newValue: args.newValue,
  };
}

/**
 * Human-readable label for an audit action. Phrasing follows the compliance
 * guidance — never says "approved by AI" or "verified", uses "confirmed" /
 * "reviewed" / "detected".
 */
export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  file_uploaded: "File uploaded",
  document_analyzed: "Document analyzed",
  document_type_changed: "Document type manually changed",
  split_approved: "Split confirmed by employee",
  final_documents_generated: "Final documents generated",
  employee_pin_confirmed: "Employee PIN confirmed",
  ai_classification_enabled: "AI classification enabled",
  ai_classification_disabled: "AI classification disabled",
  ai_classification_used: "AI classification used on page",
  catalog_match_found: "Document catalog match found",
  file_name_changed: "File name manually changed",
  batch_template_applied: "Batch naming template applied",
  downloaded_selected: "Downloaded selected files",
  downloaded_all: "Downloaded all files",
};

/**
 * Persist an intake audit entry to a backend store.
 *
 * TODO: wire this up to Supabase once a `smart_document_intake_audit` table
 * is provisioned. For MVP we only log locally in component state — this
 * function is the integration point.
 */
export async function persistIntakeAuditEntry(
  entry: AuditLogEntry
): Promise<void> {
  void entry;
}
