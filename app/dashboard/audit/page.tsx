import {
  listAuditUsers,
  listRecentAuditLogs,
  type AuditLogFilters,
  type AuditLogWithUser,
  type AuditUserOption,
} from "@/lib/db/audit";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import type { AuditAction } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const VALID_ACTIONS: readonly AuditAction[] = [
  "GENERATE_EMAIL",
  "APPROVE_EMAIL",
  "SEND_EMAIL",
  "IMPORT_CLIENTS",
  "EXTRACT_CLIENT_DATA",
];

const ACTION_LABELS: Record<string, { label: string; className: string }> = {
  GENERATE_EMAIL: {
    label: "Generated",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  APPROVE_EMAIL: {
    label: "Approved",
    className: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  SEND_EMAIL: {
    label: "Sent",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  IMPORT_CLIENTS: {
    label: "Imported",
    className: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  EXTRACT_CLIENT_DATA: {
    label: "Extracted",
    className: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  },
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

interface SearchParams {
  action?: string;
  userId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

const isAuditAction = (value: unknown): value is AuditAction =>
  typeof value === "string" &&
  (VALID_ACTIONS as readonly string[]).includes(value);

const buildExportHref = (params: SearchParams): string => {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value);
  }
  const qs = sp.toString();
  return `/api/audit/export${qs ? `?${qs}` : ""}`;
};

const hasActiveFilter = (p: SearchParams): boolean =>
  Boolean(p.action || p.userId || p.search || p.dateFrom || p.dateTo);

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!isServerSupabaseConfigured()) {
    return <NotConfigured />;
  }

  const params = await searchParams;

  const filters: AuditLogFilters = { limit: 200 };
  if (isAuditAction(params.action)) filters.action = params.action;
  if (params.userId) filters.userId = params.userId;
  if (params.search?.trim()) filters.search = params.search.trim();
  if (params.dateFrom) filters.dateFrom = params.dateFrom;
  if (params.dateTo) filters.dateTo = params.dateTo;

  let logs: AuditLogWithUser[] = [];
  let users: AuditUserOption[] = [];
  let loadError: string | null = null;
  try {
    [logs, users] = await Promise.all([
      listRecentAuditLogs(filters),
      listAuditUsers(),
    ]);
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  const activeFilters = hasActiveFilter(params);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Compliance
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Audit Logs
        </h2>
        <p className="text-sm text-slate-500">
          Append-only record of every email generation, approval, and send
          action.
        </p>
      </header>

      <FilterBar params={params} users={users} />

      {loadError && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Failed to load audit logs: {loadError}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Activity</h3>
            <span className="text-xs text-slate-500">
              {logs.length} {logs.length === 1 ? "entry" : "entries"}
              {activeFilters && " · filtered"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {activeFilters && (
              <a
                href="/dashboard/audit"
                className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Clear filters
              </a>
            )}
            <a
              href={buildExportHref(params)}
              download
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white transition hover:bg-slate-800"
            >
              <DownloadIcon /> Export CSV
            </a>
          </div>
        </header>

        {logs.length === 0 && !loadError ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-700">
              {activeFilters ? "No matching entries" : "No audit entries yet"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {activeFilters
                ? "Try widening the filters or clearing them."
                : "Generate, approve, or send an email to record activity here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Entity</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top text-slate-700">
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-600">
                      {formatTime(log.created_at)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {log.user_email ?? log.user_id}
                    </td>
                    <td className="px-6 py-4">
                      <ActionPill action={log.action} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-900">
                          {log.entity_type}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {log.entity_id}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <MetadataView metadata={log.metadata} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function FilterBar({
  params,
  users,
}: {
  params: SearchParams;
  users: AuditUserOption[];
}) {
  return (
    <form
      method="get"
      className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <Field label="Action" htmlFor="action">
        <select
          id="action"
          name="action"
          defaultValue={params.action ?? ""}
          className={selectClass}
        >
          <option value="">All actions</option>
          <option value="GENERATE_EMAIL">Generated</option>
          <option value="APPROVE_EMAIL">Approved</option>
          <option value="SEND_EMAIL">Sent</option>
          <option value="IMPORT_CLIENTS">Imported</option>
          <option value="EXTRACT_CLIENT_DATA">Extracted</option>
        </select>
      </Field>

      <Field label="User" htmlFor="userId">
        <select
          id="userId"
          name="userId"
          defaultValue={params.userId ?? ""}
          className={selectClass}
        >
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email}
            </option>
          ))}
        </select>
      </Field>

      <Field label="From" htmlFor="dateFrom">
        <input
          id="dateFrom"
          name="dateFrom"
          type="date"
          defaultValue={params.dateFrom ?? ""}
          className={inputClass}
        />
      </Field>

      <Field label="To" htmlFor="dateTo">
        <input
          id="dateTo"
          name="dateTo"
          type="date"
          defaultValue={params.dateTo ?? ""}
          className={inputClass}
        />
      </Field>

      <Field label="Search" htmlFor="search" grow>
        <input
          id="search"
          name="search"
          type="text"
          placeholder="Client name, email, entity ID…"
          defaultValue={params.search ?? ""}
          className={inputClass}
        />
      </Field>

      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover"
      >
        Apply
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
  grow = false,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  grow?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${grow ? "min-w-[180px] flex-1" : ""}`}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium uppercase tracking-wider text-slate-500"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ActionPill({ action }: { action: string }) {
  const config = ACTION_LABELS[action] ?? {
    label: action,
    className: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function MetadataView({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata ?? {});
  if (entries.length === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  return (
    <div className="flex flex-col gap-0.5">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-2 text-xs">
          <span className="text-slate-500">{key}:</span>
          <span className="font-mono text-slate-700">
            {typeof value === "string" ? value : JSON.stringify(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function NotConfigured() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Compliance
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Audit Logs
        </h2>
      </header>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-sm font-semibold text-amber-900">
          Database is not configured
        </p>
        <p className="mt-2 text-sm text-amber-800">
          Set Supabase env vars in{" "}
          <code className="font-mono">.env.local</code> and restart the dev
          server.
        </p>
      </div>
    </div>
  );
}

const inputClass =
  "h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15";

const selectClass = `${inputClass} pr-8`;
