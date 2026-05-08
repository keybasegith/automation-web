import Link from "next/link";
import StatusBadge from "@/components/form-processing/StatusBadge";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import { listApprovedBpPackages } from "@/lib/forms/repo";
import { BP_STATUS_LABELS } from "@/lib/forms/types";

export const dynamic = "force-dynamic";

const formatDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

export default async function ApprovedPackagesPage() {
  if (!isServerSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-semibold text-amber-900">
            Database is not configured
          </p>
        </div>
      </div>
    );
  }

  const rows = await listApprovedBpPackages();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          BP / back office
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Approved packages
        </h2>
        <p className="text-sm text-slate-500">
          Only compliance-approved packages appear here. Push to WindFund or
          export the core CSV from the detail page.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center text-sm text-slate-500">
          No approved packages in the queue yet.
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Advisor</th>
                  <th className="px-6 py-3">Compliance approved</th>
                  <th className="px-6 py-3">Package status</th>
                  <th className="px-6 py-3">WindFund status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="text-slate-700 transition hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <Link href={`/dashboard/bp/package/${row.id}`}>
                        {row.clientName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {row.advisorName ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {formatDate(row.bpUpdatedAt ?? row.lastUpdated)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {row.bpStatus ? BP_STATUS_LABELS[row.bpStatus] : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/bp/package/${row.id}`}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        View package
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
