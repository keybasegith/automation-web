import Link from "next/link";
import { notFound } from "next/navigation";
import KycDraftEditor from "@/components/form-processing/KycDraftEditor";
import StatusBadge from "@/components/form-processing/StatusBadge";
import WorkflowStepper from "@/components/form-processing/WorkflowStepper";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import { getKycDraft, getSubmissionById } from "@/lib/forms/repo";

export const dynamic = "force-dynamic";

export default async function KycDraftPage({
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
  const [submission, draft] = await Promise.all([
    getSubmissionById(submissionId),
    getKycDraft(submissionId),
  ]);
  if (!submission) notFound();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href={`/dashboard/form-processing/extracted-data/${submissionId}`}
            className="text-xs font-medium text-brand transition hover:text-brand-hover"
          >
            ← Back to extracted data
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            KYC draft
          </h2>
          <p className="text-sm text-slate-500">
            Auto-filled from confirmed NAAF data. Edit any field below.
          </p>
        </div>
        <StatusBadge status={submission.status} />
      </header>

      <WorkflowStepper status={submission.status} />

      {!draft ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          KYC draft has not been generated yet. Go back to extracted data and
          click <span className="font-medium">Generate KYC draft</span>.
        </div>
      ) : (
        <KycDraftEditor submissionId={submissionId} initial={draft} />
      )}
    </div>
  );
}
