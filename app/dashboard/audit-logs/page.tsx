import AuditTrailList from "@/components/form-processing/AuditTrailList";
import { listAuditLogs } from "@/lib/audit/createAuditLog";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default async function FormProcessingAuditLogsPage() {
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

  const entries = await listAuditLogs({ limit: 200 });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Form Intelligence & Compliance Review
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Audit logs
        </h2>
        <p className="text-sm text-slate-500">
          Append-only history of NAAF uploads, edits, drafts, consistency
          checks, compliance decisions, BP actions, and CSV exports. Updates
          and deletes are blocked at the database level.
        </p>
      </header>

      <AuditTrailList entries={entries} showSubmissionId />
    </div>
  );
}
