import Link from "next/link";
import {
  ArrowUpRight,
  Mail,
  Upload,
  ScanLine,
  Inbox,
} from "lucide-react";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import {
  getDashboardStats,
  type DashboardStats,
  type RecentActivityEntry,
} from "@/lib/db/stats";

export const dynamic = "force-dynamic";

const ACTION_META: Record<string, { label: string; dotClass: string }> = {
  GENERATE_EMAIL: { label: "Generated", dotClass: "bg-blue-500" },
  APPROVE_EMAIL: { label: "Approved", dotClass: "bg-amber-500" },
  SEND_EMAIL: { label: "Sent", dotClass: "bg-emerald-500" },
  IMPORT_CLIENTS: { label: "Imported", dotClass: "bg-violet-500" },
  EXTRACT_CLIENT_DATA: { label: "Extracted", dotClass: "bg-cyan-500" },
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

const greeting = (): string => {
  const h = new Date().getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const formatLongDate = (d: Date): string =>
  d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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

  const pendingCount = stats?.totals.pendingApproval ?? 0;

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-10">
        <p className="text-[13px] text-slate-500">{formatLongDate(new Date())}</p>
        <h2 className="font-display mt-1 text-[34px] font-semibold leading-tight tracking-tight text-slate-900">
          {greeting()}, Admin
        </h2>
        <p className="mt-1.5 text-[15px] text-slate-500">
          Here&rsquo;s what&rsquo;s happening across your team today.
        </p>
      </header>

      {loadError && (
        <div
          role="alert"
          className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
        >
          Failed to load metrics: {loadError}
        </div>
      )}

      <QuickActions pendingCount={pendingCount} />

      {stats && (
        <>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Generated"
              hint="Last 7 days"
              value={stats.totals.weeklyGenerated}
            />
            <StatCard
              label="Pending"
              hint="Awaiting review"
              value={stats.totals.pendingApproval}
              accent={stats.totals.pendingApproval > 0 ? "amber" : "default"}
            />
            <StatCard
              label="Sent"
              hint="Last 7 days"
              value={stats.totals.weeklySent}
              accent="emerald"
            />
            <StatCard
              label="All-time"
              hint="Across all clients"
              value={stats.totals.allTimeEmails}
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

function QuickActions({ pendingCount }: { pendingCount: number }) {
  const tiles = [
    {
      label: "Draft email",
      hint: "Generate and send",
      href: "/dashboard/client-communication",
      icon: Mail,
    },
    {
      label: "Import clients",
      hint: "Upload a CSV",
      href: "/dashboard/clients/import",
      icon: Upload,
    },
    {
      label: "Scan document",
      hint: "Smart intake",
      href: "/smart-document-intake",
      icon: ScanLine,
    },
    {
      label: "Review pending",
      hint:
        pendingCount > 0
          ? `${pendingCount} awaiting review`
          : "Nothing pending",
      href: "/dashboard/audit",
      icon: Inbox,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <Link
            key={tile.label}
            href={tile.href}
            className="group relative flex items-center gap-4 rounded-2xl border border-[var(--hairline)] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[var(--hairline-strong)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold tracking-tight text-slate-900">
                {tile.label}
              </p>
              <p className="truncate text-[12px] text-slate-500">{tile.hint}</p>
            </div>
            {tile.badge !== undefined && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white">
                {tile.badge}
              </span>
            )}
            <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-500" />
          </Link>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent = "default",
}: {
  label: string;
  value: number;
  hint: string;
  accent?: "default" | "amber" | "emerald";
}) {
  const valueClass =
    accent === "amber"
      ? "text-amber-600"
      : accent === "emerald"
        ? "text-emerald-600"
        : "text-slate-900";
  return (
    <div className="rounded-2xl border border-[var(--hairline)] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[12px] font-medium text-slate-500">{label}</p>
      <p
        className={`font-display mt-2 text-[40px] font-semibold leading-none tabular-nums tracking-tight ${valueClass}`}
      >
        {value}
      </p>
      <p className="mt-2 text-[12px] text-slate-400">{hint}</p>
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
    <section className="rounded-2xl border border-[var(--hairline)] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="mb-5 flex items-baseline justify-between">
        <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
          Activity
        </h3>
        <span className="text-[12px] text-slate-500">Last 7 days</span>
      </header>

      <div className="flex h-48 items-end gap-2.5">
        {data.map((d, i) => {
          const heightPct = (d.count / max) * 100;
          const empty = d.count === 0;
          return (
            <div
              key={`${d.day}-${i}`}
              className="group flex flex-1 flex-col items-center gap-2"
            >
              <div className="relative flex h-full w-full items-end">
                <div
                  className={`w-full rounded-md transition-all ${
                    empty
                      ? "bg-slate-100"
                      : "bg-gradient-to-t from-brand/70 to-brand"
                  } group-hover:from-brand group-hover:to-brand-hover`}
                  style={{
                    height: empty ? "6px" : `${Math.max(6, heightPct)}%`,
                  }}
                  title={`${d.count} email${d.count === 1 ? "" : "s"}`}
                />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[12px] font-semibold tabular-nums text-slate-700">
                  {d.count}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
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
    <section className="rounded-2xl border border-[var(--hairline)] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="mb-5 flex items-baseline justify-between">
        <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
          By event type
        </h3>
        <span className="text-[12px] text-slate-500">Last 7 days</span>
      </header>

      {total === 0 ? (
        <p className="py-8 text-center text-[13px] text-slate-400">
          No events yet this week.
        </p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {data.map((row) => {
            const pct = (row.count / total) * 100;
            return (
              <li key={row.eventType} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between text-[12px]">
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
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
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
    <section className="rounded-2xl border border-[var(--hairline)] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="flex items-baseline justify-between border-b border-[var(--hairline)] px-6 py-4">
        <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
          Recent activity
        </h3>
        <Link
          href="/dashboard/audit"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-brand transition hover:text-brand-hover"
        >
          View all
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {entries.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-[14px] font-medium text-slate-700">
            No activity yet
          </p>
          <p className="mt-1 text-[12px] text-slate-500">
            Generate or approve an email to see entries here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--hairline)]">
          {entries.map((entry) => {
            const meta = ACTION_META[entry.action] ?? {
              label: entry.action,
              dotClass: "bg-slate-400",
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
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dotClass}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-slate-900">
                    {clientName ?? "—"}
                    {eventType && (
                      <span className="ml-2 text-[12px] font-normal text-slate-500">
                        · {eventType}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[12px] text-slate-500">
                    {meta.label} by {entry.userEmail ?? "system"}
                  </p>
                </div>
                <span className="shrink-0 text-[12px] tabular-nums text-slate-400">
                  {formatRelative(entry.createdAt)}
                </span>
              </>
            );

            return (
              <li key={entry.id}>
                {entry.clientId ? (
                  <Link
                    href={`/dashboard/clients/${entry.clientId}`}
                    className="flex items-start gap-3 px-6 py-3.5 transition hover:bg-slate-50/60"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 px-6 py-3.5">
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
    <div className="mt-6 rounded-2xl border border-dashed border-[var(--hairline-strong)] bg-white/60 p-6 text-center">
      <p className="text-[14px] font-medium text-slate-700">
        Nothing to report yet
      </p>
      <p className="mt-1 text-[12px] text-slate-500">
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
      <header className="mb-8">
        <p className="text-[13px] text-slate-500">{formatLongDate(new Date())}</p>
        <h2 className="font-display mt-1 text-[34px] font-semibold leading-tight tracking-tight text-slate-900">
          {greeting()}, Admin
        </h2>
      </header>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-[14px] font-semibold text-amber-900">
          Database is not configured
        </p>
        <p className="mt-2 text-[13px] text-amber-800">
          Set Supabase env vars in{" "}
          <code className="font-mono">.env.local</code> and restart the dev
          server to see live metrics.
        </p>
      </div>
    </div>
  );
}
