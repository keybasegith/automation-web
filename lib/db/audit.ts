import { getServerSupabase } from "@/lib/supabaseClient";
import type { AuditAction, AuditEntityType, AuditLogRow } from "@/lib/db/types";

export interface LogAuditInput {
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(input: LogAuditInput): Promise<void> {
  const supabase = getServerSupabase();
  const { error } = await supabase.from("audit_logs").insert({
    user_id: input.userId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    metadata: input.metadata ?? {},
  });

  if (error) {
    // Compliance posture: surface, do not swallow.
    throw new Error(`Audit log write failed: ${error.message}`);
  }
}

export interface AuditLogWithUser extends AuditLogRow {
  user_email: string | null;
}

export interface AuditLogFilters {
  action?: AuditAction;
  userId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export async function listRecentAuditLogs(
  filtersOrLimit: AuditLogFilters | number = {}
): Promise<AuditLogWithUser[]> {
  const filters: AuditLogFilters =
    typeof filtersOrLimit === "number" ? { limit: filtersOrLimit } : filtersOrLimit;

  const supabase = getServerSupabase();
  let query = supabase
    .from("audit_logs")
    .select("*, users(email)")
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.action) {
    query = query.eq("action", filters.action);
  }
  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }
  const { data, error } = await query;

  if (error) {
    throw new Error(`Audit log read failed: ${error.message}`);
  }

  type RowWithUser = AuditLogRow & { users: { email: string } | null };
  let rows = ((data ?? []) as unknown as RowWithUser[]).map((row) => ({
    ...row,
    user_email: row.users?.email ?? null,
  }));

  if (filters.search) {
    const needle = filters.search.toLowerCase();
    rows = rows.filter((row) => {
      const haystack = `${row.user_email ?? ""} ${row.entity_id} ${JSON.stringify(
        row.metadata ?? {}
      )}`.toLowerCase();
      return haystack.includes(needle);
    });
  }

  return rows;
}

export interface AuditUserOption {
  id: string;
  email: string;
}

export async function listAuditUsers(): Promise<AuditUserOption[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id, email")
    .order("email", { ascending: true });

  if (error) {
    throw new Error(`User list failed: ${error.message}`);
  }
  return ((data ?? []) as unknown as AuditUserOption[]).map((u) => ({
    id: u.id,
    email: u.email,
  }));
}
