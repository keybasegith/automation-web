import Link from "next/link";
import StatusBadge from "@/components/form-processing/StatusBadge";
import {
  BP_STATUS_LABELS,
  COMPLIANCE_DECISION_LABELS,
  type SubmissionSummary,
} from "@/lib/forms/types";

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function SubmissionTable({
  rows,
}: {
  rows: readonly SubmissionSummary[];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center">
        <p className="text-sm font-medium text-slate-700">No submissions yet</p>
        <p className="mt-1 text-xs text-slate-500">
          Start a new NAAF upload to see entries here.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3">Client</th>
              <th className="px-6 py-3">Advisor</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Mismatches</th>
              <th className="px-6 py-3">Compliance</th>
              <th className="px-6 py-3">BP / WindFund</th>
              <th className="px-6 py-3">Last updated</th>
              <th className="px-6 py-3" aria-label="Action" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="text-slate-700 transition hover:bg-slate-50/50"
              >
                <td className="px-6 py-4">
                  <Link
                    href={nextActionHref(row)}
                    className="font-medium text-slate-900"
                  >
                    {row.clientName}
                  </Link>
                </td>
                <td className="px-6 py-4 text-xs text-slate-500">
                  {row.advisorName ?? "—"}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-6 py-4 text-right text-sm tabular-nums text-slate-900">
                  {row.mismatchCount}
                </td>
                <td className="px-6 py-4 text-xs text-slate-600">
                  {row.complianceStatus
                    ? COMPLIANCE_DECISION_LABELS[row.complianceStatus]
                    : "—"}
                </td>
                <td className="px-6 py-4 text-xs text-slate-600">
                  {row.bpStatus ? BP_STATUS_LABELS[row.bpStatus] : "—"}
                </td>
                <td className="px-6 py-4 text-xs text-slate-500">
                  {formatDate(row.lastUpdated)}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={nextActionHref(row)}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Pick the most useful next page for the row. Each status maps to whichever
 * step is in flight. This stays static (URL-only); the page itself decides
 * what is permitted.
 */
function nextActionHref(row: SubmissionSummary): string {
  switch (row.status) {
    case "naaf_uploaded":
    case "extraction_completed":
      return `/dashboard/form-processing/extracted-data/${row.id}`;
    case "kyc_draft_created":
      return `/dashboard/form-processing/kyc-draft/${row.id}`;
    case "crq_draft_created":
      return `/dashboard/form-processing/crq-draft/${row.id}`;
    case "ready_for_consistency_check":
      return `/dashboard/form-processing/consistency-check/${row.id}`;
    case "submitted_to_compliance":
    case "returned_to_advisor":
    case "clarification_requested":
      return `/dashboard/compliance/review/${row.id}`;
    case "approved_by_compliance":
    case "sent_to_bp":
    case "pushed_to_windfund":
      return `/dashboard/bp/package/${row.id}`;
    case "rejected_by_compliance":
      return `/dashboard/compliance/review/${row.id}`;
  }
}
