import Link from "next/link";
import SubmissionTable from "@/components/form-processing/SubmissionTable";
import WorkflowStepper from "@/components/form-processing/WorkflowStepper";
import { listSubmissionsForDashboard } from "@/lib/forms/repo";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import type { SubmissionSummary } from "@/lib/forms/types";

export const dynamic = "force-dynamic";

export default async function FormProcessingDashboardPage() {
  if (!isServerSupabaseConfigured()) {
    return <NotConfigured />;
  }
  let rows: SubmissionSummary[] = [];
  let loadError: string | null = null;
  try {
    rows = await listSubmissionsForDashboard();
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wider text-brand">
            Form Intelligence & Compliance Review
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            NAAF → KYC → CRQ → Compliance → BP/WindFund
          </h2>
          <p className="text-sm text-slate-500">
            The system flags potential mismatches and supports human review.
            All approvals remain with compliance.
          </p>
        </div>
        <Link
          href="/dashboard/form-processing/upload-naaf"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover"
        >
          + Start new NAAF upload
        </Link>
      </header>

      <WorkflowStepper status={null} />

      {loadError && (
        <p
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Failed to load submissions: {loadError}
        </p>
      )}

      <SubmissionTable rows={rows} />
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Form Intelligence & Compliance Review
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Form processing
        </h2>
      </header>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-sm font-semibold text-amber-900">
          Database is not configured
        </p>
        <p className="mt-2 text-sm text-amber-800">
          Set Supabase env vars in{" "}
          <code className="font-mono">.env.local</code> and run{" "}
          <code className="font-mono">supabase/006-form-processing.sql</code>.
        </p>
      </div>
    </div>
  );
}
