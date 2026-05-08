import {
  listRecentAuditLogs,
  type AuditLogFilters,
} from "@/lib/db/audit";
import {
  isServerSupabaseConfigured,
  SupabaseConfigError,
} from "@/lib/supabaseClient";
import type { AuditAction } from "@/lib/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ACTIONS: readonly AuditAction[] = [
  "GENERATE_EMAIL",
  "APPROVE_EMAIL",
  "SEND_EMAIL",
  "IMPORT_CLIENTS",
  "EXTRACT_CLIENT_DATA",
];

const escapeCsv = (value: unknown): string => {
  const str =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : JSON.stringify(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export async function GET(request: Request) {
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const params = url.searchParams;

  const action = params.get("action");
  const userId = params.get("userId");
  const search = params.get("search");
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");

  const filters: AuditLogFilters = { limit: 5000 };
  if (action && (VALID_ACTIONS as readonly string[]).includes(action)) {
    filters.action = action as AuditAction;
  }
  if (userId) filters.userId = userId;
  if (search) filters.search = search;
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;

  try {
    const rows = await listRecentAuditLogs(filters);

    const headers = [
      "timestamp",
      "user_email",
      "user_id",
      "action",
      "entity_type",
      "entity_id",
      "client_name",
      "client_email",
      "event_type",
      "metadata",
    ];

    const lines = [headers.join(",")];
    for (const row of rows) {
      const meta = row.metadata ?? {};
      lines.push(
        [
          row.created_at,
          row.user_email,
          row.user_id,
          row.action,
          row.entity_type,
          row.entity_id,
          (meta as Record<string, unknown>).clientName,
          (meta as Record<string, unknown>).clientEmail,
          (meta as Record<string, unknown>).eventType,
          meta,
        ]
          .map(escapeCsv)
          .join(",")
      );
    }

    const csv = lines.join("\n");
    const filename = `audit-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof SupabaseConfigError) {
      return Response.json({ error: err.message }, { status: 500 });
    }
    return Response.json(
      {
        error: "Failed to export audit log.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
