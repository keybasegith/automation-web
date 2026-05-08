import Link from "next/link";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import {
  getDashboardStats,
  type DashboardStats,
  type RecentActivityEntry,
} from "@/lib/db/stats";

export const dynamic = "force-dynamic";

const ACTION_META: Record<string, { label: string; className: string }> = {
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

const formatRelative = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export default async function DashboardHomePage() {
  if (!isServerSupabaseConfigured()) {
    return <NotConfigured />;
  }

  let stats: DashboardStats | null = null;
  let loadError: string | null = null;
  try {
    stats = await getDashboardStats();
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Overview
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Welcome back, Admin
        </h2>
        <p className="text-sm text-slate-500">
          A live view of client communication activity across your team.
        </p>
      </header>

      {loadError && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Failed to load metrics: {loadError}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Generated this week"
              value={stats.totals.weeklyGenerated}
              hint="Last 7 days"
              accent="brand"
            />
            <StatCard
              label="Pending approval"
              value={stats.totals.pendingApproval}
              hint="Drafted, awaiting review"
              accent={stats.totals.pendingApproval > 0 ? "amber" : "slate"}
            />
            <StatCard
              label="Sent this week"
              value={stats.totals.weeklySent}
              hint="Last 7 days"
              accent="emerald"
            />
            <StatCard
              label="All-time emails"
              value={stats.totals.allTimeEmails}
              hint="Across all clients"
              accent="slate"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <WeeklyChart data={stats.weeklyByDay} />
            <EventTypeBreakdown data={stats.eventTypeBreakdown} />
          </div>

          <div className="mt-6">
            <RecentActivity entries={stats.recentActivity} />
          </div>

          {stats.totals.allTimeEmails === 0 && <EmptyHint />}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent = "slate",
}: {
  label: string;
  value: number;
  hint: string;
  accent?: "brand" | "amber" | "emerald" | "slate";
}) {
  const valueClass =
    accent === "brand"
      ? "text-brand"
      : accent === "amber"
        ? "text-amber-700"
        : accent === "emerald"
          ? "text-emerald-600"
          : "text-slate-900";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${valueClass}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

function WeeklyChart({
  data,
}: {
  data: { day: string; count: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Generation activity
        </h3>
        <span className="text-xs text-slate-500">Last 7 days</span>
      </header>

      <div className="flex h-44 items-end gap-3">
        {data.map((d, i) => {
          const heightPct = (d.count / max) * 100;
          return (
            <div
              key={`${d.day}-${i}`}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <div className="relative flex h-full w-full items-end">
                <div
                  className="w-full rounded-t-lg bg-brand/80 transition-all"
                  style={{
                    height: d.count === 0 ? "4px" : `${Math.max(4, heightPct)}%`,
                    backgroundColor: d.count === 0 ? "#e2e8f0" : undefined,
                  }}
                  title={`${d.count} email${d.count === 1 ? "" : "s"}`}
                />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium tabular-nums text-slate-700">
                  {d.count}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  {d.day}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EventTypeBreakdown({
  data,
}: {
  data: { eventType: string; count: number }[];
}) {
  const total = data.reduce((sum, row) => sum + row.count, 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          By event type
        </h3>
        <span className="text-xs text-slate-500">Last 7 days</span>
      </header>

      {total === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">
          No events yet this week.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((row) => {
            const pct = (row.count / total) * 100;
            return (
              <li key={row.eventType} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">
                    {row.eventType}
                  </span>
                  <span className="tabular-nums text-slate-500">
                    {row.count}
                    <span className="ml-1.5 text-slate-400">
                      {pct.toFixed(0)}%
                    </span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RecentActivity({ entries }: { entries: RecentActivityEntry[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Recent activity
        </h3>
        <Link
          href="/dashboard/audit"
          className="text-xs font-medium text-brand transition hover:text-brand-hover"
        >
          View all →
        </Link>
      </header>

      {entries.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">
            No activity yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Generate or approve an email to see entries here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {entries.map((entry) => {
            const meta = ACTION_META[entry.action] ?? {
              label: entry.action,
              className: "bg-slate-100 text-slate-600 ring-slate-200",
            };
            const clientName =
              typeof entry.metadata?.clientName === "string"
                ? (entry.metadata.clientName as string)
                : null;
            const eventType =
              typeof entry.metadata?.eventType === "string"
                ? (entry.metadata.eventType as string)
                : null;
            const inner = (
              <>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.className}`}
                >
                  {meta.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-900">
                    {clientName ?? "—"}
                    {eventType && (
                      <span className="ml-2 text-xs text-slate-500">
                        · {eventType}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    by {entry.userEmail ?? "system"}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {formatRelative(entry.createdAt)}
                </span>
              </>
            );

            return (
              <li key={entry.id}>
                {entry.clientId ? (
                  <Link
                    href={`/dashboard/clients/${entry.clientId}`}
                    className="flex items-center gap-4 px-6 py-3 transition hover:bg-slate-50/60"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 px-6 py-3">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function EmptyHint() {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
      <p className="text-sm font-medium text-slate-700">
        Nothing to report yet
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Head over to{" "}
        <Link
          href="/dashboard/client-communication"
          className="font-medium text-brand hover:text-brand-hover"
        >
          Client Communication
        </Link>{" "}
        to draft your first email — metrics will appear here automatically.
      </p>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Overview
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Welcome back, Admin
        </h2>
      </header>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-sm font-semibold text-amber-900">
          Database is not configured
        </p>
        <p className="mt-2 text-sm text-amber-800">
          Set Supabase env vars in{" "}
          <code className="font-mono">.env.local</code> and restart the dev
          server to see live metrics.
        </p>
      </div>
    </div>
  );
}
