import {
  AUDIT_ACTION_LABELS,
  type AuditLogEntry,
} from "@/lib/forms/types";

const formatTimestamp = (iso: string): string =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

export default function AuditTrailList({
  entries,
  showSubmissionId,
}: {
  entries: readonly AuditLogEntry[];
  showSubmissionId?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-sm text-slate-500">
        No audit entries yet.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
      {entries.map((e) => (
        <li key={e.id} className="px-5 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
              {AUDIT_ACTION_LABELS[e.action]}
            </span>
            {e.userRole && (
              <span className="text-xs text-slate-500">
                by {e.userRole}
              </span>
            )}
            {showSubmissionId && e.submissionId && (
              <span className="text-[10px] text-slate-400">
                submission {e.submissionId.slice(0, 8)}
              </span>
            )}
            <span className="ml-auto text-[11px] text-slate-400">
              {formatTimestamp(e.createdAt)}
            </span>
          </div>
          {Boolean(e.beforeValue || e.afterValue) && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] font-medium text-slate-500 hover:text-slate-700">
                Show before / after
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-[11px] leading-5 text-slate-700">
                {JSON.stringify(
                  { before: e.beforeValue ?? null, after: e.afterValue ?? null },
                  null,
                  2
                )}
              </pre>
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}
