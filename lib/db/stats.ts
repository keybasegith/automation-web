import { getServerSupabase } from "@/lib/supabaseClient";
import type { AuditAction, AuditLogRow } from "@/lib/db/types";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface DashboardStats {
  totals: {
    weeklyGenerated: number;
    pendingApproval: number;
    weeklySent: number;
    allTimeEmails: number;
  };
  eventTypeBreakdown: { eventType: string; count: number }[];
  recentActivity: RecentActivityEntry[];
  weeklyByDay: { day: string; count: number }[];
}

export interface RecentActivityEntry {
  id: string;
  action: AuditAction;
  entityId: string;
  /** Resolved client id when entity is an email — used to link to the client detail page. */
  clientId: string | null;
  userEmail: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

const sinceWeekAgo = (): string =>
  new Date(Date.now() - ONE_WEEK_MS).toISOString();

const formatDayLabel = (date: Date): string =>
  date.toLocaleDateString("en-US", { weekday: "short" });

const dayKey = (iso: string): string => iso.slice(0, 10);

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = getServerSupabase();
  const weekAgo = sinceWeekAgo();

  const [
    weeklyGeneratedRes,
    pendingApprovalRes,
    weeklySentRes,
    allTimeRes,
    breakdownRes,
    recentRes,
    weeklyEmailsRes,
  ] = await Promise.all([
    supabase
      .from("generated_emails")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    supabase
      .from("generated_emails")
      .select("*", { count: "exact", head: true })
      .eq("status", "drafted"),
    supabase
      .from("generated_emails")
      .select("*", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("created_at", weekAgo),
    supabase
      .from("generated_emails")
      .select("*", { count: "exact", head: true }),
    // Aggregate event types in JS — small data volume, no need for an RPC.
    supabase
      .from("audit_logs")
      .select("metadata, created_at")
      .eq("action", "GENERATE_EMAIL")
      .gte("created_at", weekAgo)
      .limit(500),
    supabase
      .from("audit_logs")
      .select("id, action, entity_id, metadata, created_at, users(email)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("generated_emails")
      .select("created_at")
      .gte("created_at", weekAgo)
      .limit(2000),
  ]);

  const eventTypeCounts = new Map<string, number>();
  type BreakdownRow = Pick<AuditLogRow, "metadata" | "created_at">;
  for (const row of (breakdownRes.data ?? []) as unknown as BreakdownRow[]) {
    const eventType =
      typeof row.metadata?.eventType === "string"
        ? (row.metadata.eventType as string)
        : "Unknown";
    eventTypeCounts.set(eventType, (eventTypeCounts.get(eventType) ?? 0) + 1);
  }
  const eventTypeBreakdown = Array.from(eventTypeCounts.entries())
    .map(([eventType, count]) => ({ eventType, count }))
    .sort((a, b) => b.count - a.count);

  type RecentRow = Pick<
    AuditLogRow,
    "id" | "action" | "entity_id" | "metadata" | "created_at"
  > & { users: { email: string } | null };
  const recentRows = (recentRes.data ?? []) as unknown as RecentRow[];

  // Resolve email entity_ids → client_ids for click-through links.
  const emailEntityIds = Array.from(
    new Set(recentRows.map((r) => r.entity_id))
  );
  const clientByEmail = new Map<string, string>();
  if (emailEntityIds.length > 0) {
    const { data: emailRows } = await supabase
      .from("generated_emails")
      .select("id, client_id")
      .in("id", emailEntityIds);
    type EmailIdRow = { id: string; client_id: string };
    for (const row of (emailRows ?? []) as unknown as EmailIdRow[]) {
      clientByEmail.set(row.id, row.client_id);
    }
  }

  const recentActivity: RecentActivityEntry[] = recentRows.map((row) => ({
    id: row.id,
    action: row.action,
    entityId: row.entity_id,
    clientId: clientByEmail.get(row.entity_id) ?? null,
    metadata: row.metadata,
    createdAt: row.created_at,
    userEmail: row.users?.email ?? null,
  }));

  // Build last-7-day series, including days with zero activity.
  const dayCounts = new Map<string, number>();
  for (
    let i = 6, base = new Date();
    i >= 0;
    i -= 1
  ) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    dayCounts.set(d.toISOString().slice(0, 10), 0);
  }
  type DateRow = { created_at: string };
  for (const row of (weeklyEmailsRes.data ?? []) as DateRow[]) {
    const key = dayKey(row.created_at);
    if (dayCounts.has(key)) {
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    }
  }
  const weeklyByDay = Array.from(dayCounts.entries()).map(([key, count]) => ({
    day: formatDayLabel(new Date(key)),
    count,
  }));

  return {
    totals: {
      weeklyGenerated: weeklyGeneratedRes.count ?? 0,
      pendingApproval: pendingApprovalRes.count ?? 0,
      weeklySent: weeklySentRes.count ?? 0,
      allTimeEmails: allTimeRes.count ?? 0,
    },
    eventTypeBreakdown,
    recentActivity,
    weeklyByDay,
  };
}
