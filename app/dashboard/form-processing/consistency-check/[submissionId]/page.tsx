import Link from "next/link";
import { notFound } from "next/navigation";
import ConsistencyResultPanel from "@/components/form-processing/ConsistencyResultPanel";
import StatusBadge from "@/components/form-processing/StatusBadge";
import WorkflowStepper from "@/components/form-processing/WorkflowStepper";
import {
  RunConsistencyButton,
  SubmitToComplianceButton,
} from "@/components/form-processing/StepActions";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import {
  getLatestConsistencyResult,
  getSubmissionById,
} from "@/lib/forms/repo";

export const dynamic = "force-dynamic";

export default async function ConsistencyCheckPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
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
  const { submissionId } = await params;
  const [submission, result] = await Promise.all([
    getSubmissionById(submissionId),
    getLatestConsistencyResult(submissionId),
  ]);
  if (!submission) notFound();

  const blocked = result?.overallStatus === "blocked_missing_required";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href={`/dashboard/form-processing/crq-draft/${submissionId}`}
            className="text-xs font-medium text-brand transition hover:text-brand-hover"
          >
            ← Back to CRQ draft
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            KYC / CRQ consistency check
          </h2>
          <p className="text-sm text-slate-500">
            Deterministic mismatch detection. The system never approves; humans
            make every final call.
          </p>
        </div>
        <StatusBadge status={submission.status} />
      </header>

      <WorkflowStepper status={submission.status} />

      {!result ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          No consistency check has been run yet for this submission. Click
          below to run the check.
        </div>
      ) : (
        <ConsistencyResultPanel result={result} />
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href={`/dashboard/form-processing/kyc-draft/${submissionId}`}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Edit KYC
        </Link>
        <Link
          href={`/dashboard/form-processing/crq-draft/${submissionId}`}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Edit CRQ
        </Link>
        <RunConsistencyButton submissionId={submissionId} />
        <SubmitToComplianceButton
          submissionId={submissionId}
          blocked={blocked || !result}
        />
      </div>
    </div>
  );
}
