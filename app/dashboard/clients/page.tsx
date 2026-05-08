import Link from "next/link";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import {
  listClientsWithStats,
  type ClientWithStats,
} from "@/lib/db/clientsRepo";

export const dynamic = "force-dynamic";

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatRelative = (iso: string | null): string => {
  if (!iso) return "Never";
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export default async function ClientsListPage() {
  if (!isServerSupabaseConfigured()) {
    return <NotConfigured />;
  }

  let clients: ClientWithStats[] = [];
  let loadError: string | null = null;
  try {
    clients = await listClientsWithStats();
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  const totalEmails = clients.reduce((sum, c) => sum + c.stats.total, 0);
  const totalPending = clients.reduce((sum, c) => sum + c.stats.drafted, 0);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wider text-brand">
            Book of Business
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Clients
          </h2>
          <p className="text-sm text-slate-500">
            {clients.length} {clients.length === 1 ? "client" : "clients"} ·{" "}
            {totalEmails} total emails · {totalPending} pending approval
          </p>
        </div>
        <Link
          href="/dashboard/clients/import"
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          📥 Import CSV
        </Link>
      </header>

      {loadError && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Failed to load clients: {loadError}
        </div>
      )}

      {clients.length === 0 && !loadError ? (
        <EmptyState />
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Risk</th>
                  <th className="px-6 py-3 text-right">Portfolio</th>
                  <th className="px-6 py-3 text-right">Emails</th>
                  <th className="px-6 py-3">Last contact</th>
                  <th className="px-6 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="text-slate-700 transition hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/clients/${client.id}`}
                        className="flex flex-col"
                      >
                        <span className="font-medium text-slate-900">
                          {client.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {client.email}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <RiskPill risk={client.risk_tolerance} />
                    </td>
                    <td className="px-6 py-4 text-right text-sm tabular-nums text-slate-900">
                      {formatCurrency(Number(client.portfolio_value))}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <EmailStatBlock stats={client.stats} />
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {formatRelative(client.stats.lastEmailAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/clients/${client.id}`}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function RiskPill({ risk }: { risk: "Low" | "Medium" | "High" }) {
  const cls =
    risk === "High"
      ? "bg-red-50 text-red-700 ring-red-200"
      : risk === "Medium"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {risk}
    </span>
  );
}

function EmailStatBlock({
  stats,
}: {
  stats: {
    total: number;
    drafted: number;
    approved: number;
    sent: number;
  };
}) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-sm font-semibold tabular-nums text-slate-900">
        {stats.total}
      </span>
      {stats.total > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          {stats.drafted > 0 && (
            <span title="Drafted">
              <span className="font-medium text-slate-600">
                {stats.drafted}
              </span>{" "}
              draft
            </span>
          )}
          {stats.approved > 0 && (
            <span title="Approved" className="text-amber-700">
              <span className="font-medium">{stats.approved}</span> appr
            </span>
          )}
          {stats.sent > 0 && (
            <span title="Sent" className="text-emerald-700">
              <span className="font-medium">{stats.sent}</span> sent
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center">
      <p className="text-sm font-medium text-slate-700">No clients yet</p>
      <p className="mt-1 text-xs text-slate-500">
        Run the seed migration in{" "}
        <code className="font-mono">supabase/schema.sql</code> to populate the
        five fixture clients.
      </p>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Book of Business
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Clients
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
