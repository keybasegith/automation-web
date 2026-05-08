import { getServerSupabase } from "@/lib/supabaseClient";
import type {
  ClientSegment,
  ClientStage,
  DraftStatus,
  EmailPurpose,
  Tone,
  Urgency,
} from "@/lib/secureEmail/types";

export interface SecureEmailDraftRow {
  id: string;
  advisor_id: string | null;
  client_id: string | null;
  email_purpose: EmailPurpose;
  client_segment: ClientSegment | null;
  client_stage: ClientStage | null;
  tone: Tone | null;
  urgency: Urgency | null;
  sanitized_context: Record<string, unknown>;
  generated_draft: string;
  final_body: string | null;
  template_name: string;
  risk_flags: string[];
  status: DraftStatus;
  created_at: string;
  reviewed_at: string | null;
  final_subject: string | null;
  recipient_email: string | null;
  sent_at: string | null;
  /** PIN-resolved approver (the user who entered the PIN at send time). */
  approved_by: string | null;
  approved_at: string | null;
  /** Name stamped into [Advisor Name] at the moment of approval. */
  approved_name_snapshot: string | null;
}

export interface InsertSecureEmailDraftInput {
  advisorId: string;
  clientId: string;
  emailPurpose: EmailPurpose;
  clientSegment: ClientSegment;
  clientStage: ClientStage;
  tone: Tone;
  urgency: Urgency;
  sanitizedContext: Record<string, unknown>;
  /** Body with `[Client First Name]` / `[Advisor Name]` placeholders intact. */
  generatedDraft: string;
  /** Body after server-side placeholder substitution. */
  finalBody: string;
  /** Subject after server-side placeholder substitution. */
  finalSubject: string;
  recipientEmail: string;
  templateName: string;
  riskFlags: string[];
}

export async function insertSecureEmailDraft(
  input: InsertSecureEmailDraftInput
): Promise<SecureEmailDraftRow> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("secure_email_drafts")
    .insert({
      advisor_id: input.advisorId,
      client_id: input.clientId,
      email_purpose: input.emailPurpose,
      client_segment: input.clientSegment,
      client_stage: input.clientStage,
      tone: input.tone,
      urgency: input.urgency,
      sanitized_context: input.sanitizedContext,
      generated_draft: input.generatedDraft,
      final_subject: input.finalSubject,
      final_body: input.finalBody,
      recipient_email: input.recipientEmail,
      template_name: input.templateName,
      risk_flags: input.riskFlags,
      // The spec is explicit: a freshly generated draft is never "final".
      status: "advisor_review_required",
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(
      `Secure draft insert failed: ${error?.message ?? "no row returned"}`
    );
  }
  return data as SecureEmailDraftRow;
}

export async function updateSecureEmailDraftStatus(
  id: string,
  status: DraftStatus
): Promise<SecureEmailDraftRow> {
  const supabase = getServerSupabase();
  const patch: Record<string, unknown> = { status };
  if (status === "reviewed") {
    patch.reviewed_at = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from("secure_email_drafts")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(
      `Secure draft status update failed: ${error?.message ?? "not found"}`
    );
  }
  return data as SecureEmailDraftRow;
}

export interface MarkDraftSentInput {
  id: string;
  finalSubject: string;
  finalBody: string;
  recipientEmail: string;
  appendedRiskFlags: string[];
  /** User id resolved from the PIN entered to approve the send. */
  approvedBy: string;
  /** Display name substituted into [Advisor Name] at the moment of approval. */
  approvedNameSnapshot: string;
}

/**
 * Stores the advisor-approved final copy and stamps the row as sent. The
 * original generated_draft column is preserved untouched for audit purposes.
 */
export async function markDraftSent(
  input: MarkDraftSentInput
): Promise<SecureEmailDraftRow> {
  const supabase = getServerSupabase();

  // Read existing flags so we can union the output-side scan results without
  // losing what the original generation captured.
  const { data: existing, error: readErr } = await supabase
    .from("secure_email_drafts")
    .select("risk_flags")
    .eq("id", input.id)
    .maybeSingle();
  if (readErr) {
    throw new Error(`Draft lookup failed: ${readErr.message}`);
  }
  if (!existing) {
    throw new Error("Draft not found.");
  }
  const existingFlags = Array.isArray(existing.risk_flags)
    ? (existing.risk_flags as string[])
    : [];
  const mergedFlags = Array.from(
    new Set([...existingFlags, ...input.appendedRiskFlags])
  );

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("secure_email_drafts")
    .update({
      final_subject: input.finalSubject,
      final_body: input.finalBody,
      recipient_email: input.recipientEmail,
      sent_at: now,
      reviewed_at: now,
      status: "sent",
      risk_flags: mergedFlags,
      approved_by: input.approvedBy,
      approved_at: now,
      approved_name_snapshot: input.approvedNameSnapshot,
    })
    .eq("id", input.id)
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(
      `Send failed: ${error?.message ?? "draft could not be updated"}`
    );
  }
  return data as SecureEmailDraftRow;
}

export async function listRecentDraftsForAdvisor(
  advisorId: string,
  limit = 10
): Promise<SecureEmailDraftRow[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("secure_email_drafts")
    .select("*")
    .eq("advisor_id", advisorId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    throw new Error(`Recent drafts read failed: ${error.message}`);
  }
  return (data ?? []) as SecureEmailDraftRow[];
}
