import { getServerSupabase } from "@/lib/supabaseClient";
import type { AuditAction, AuditLogEntry } from "@/lib/forms/types";

export interface CreateAuditLogInput {
  submissionId: string | null;
  userId: string | null;
  userRole: string | null;
  action: AuditAction;
  beforeValue?: unknown;
  afterValue?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Append a row to form_processing_audit_logs. Failures are surfaced via the
 * console but never throw — audit logging must not break the user-facing
 * action that triggered it.
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
  try {
    const supabase = getServerSupabase();
    const { error } = await supabase.from("form_processing_audit_logs").insert({
      submission_id: input.submissionId,
      user_id: input.userId,
      user_role: input.userRole,
      action: input.action,
      before_value: input.beforeValue ?? null,
      after_value: input.afterValue ?? null,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
    });
    if (error) {
      console.error("form_processing_audit_logs insert failed:", error.message);
    }
  } catch (err) {
    console.error("createAuditLog threw:", err);
  }
}

interface AuditRow {
  id: string;
  submission_id: string | null;
  user_id: string | null;
  user_role: string | null;
  action: AuditAction;
  before_value: unknown;
  after_value: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export async function listAuditLogs(args?: {
  submissionId?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  const supabase = getServerSupabase();
  let query = supabase
    .from("form_processing_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(args?.limit ?? 200);
  if (args?.submissionId) {
    query = query.eq("submission_id", args.submissionId);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`Audit log read failed: ${error.message}`);
  }
  return ((data ?? []) as unknown as AuditRow[]).map((r) => ({
    id: r.id,
    submissionId: r.submission_id,
    userId: r.user_id,
    userRole: r.user_role,
    action: r.action,
    beforeValue: r.before_value,
    afterValue: r.after_value,
    ipAddress: r.ip_address,
    userAgent: r.user_agent,
    createdAt: r.created_at,
  }));
}
