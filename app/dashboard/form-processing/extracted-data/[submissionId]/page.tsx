import Link from "next/link";
import { notFound } from "next/navigation";
import ExtractedDataEditor from "@/components/form-processing/ExtractedDataEditor";
import StatusBadge from "@/components/form-processing/StatusBadge";
import WorkflowStepper from "@/components/form-processing/WorkflowStepper";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import {
  getExtractedData,
  getNaafDocument,
  getSubmissionById,
} from "@/lib/forms/repo";

export const dynamic = "force-dynamic";

export default async function ExtractedDataPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  if (!isServerSupabaseConfigured()) {
    return <NotConfigured />;
  }
  const { submissionId } = await params;
  const [submission, extracted, naafDoc] = await Promise.all([
    getSubmissionById(submissionId),
    getExtractedData(submissionId),
    getNaafDocument(submissionId),
  ]);
  if (!submission || !extracted) notFound();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href="/dashboard/form-processing"
            className="text-xs font-medium text-brand transition hover:text-brand-hover"
          >
            ← Back to dashboard
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Review extracted NAAF data
          </h2>
          <p className="text-sm text-slate-500">
            Confirm or correct every value. The advisor owns this data — KYC and
            CRQ drafts will be derived from it.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={submission.status} />
          <p className="text-xs text-slate-500">
            Extraction confidence:{" "}
            <span className="tabular-nums">
              {Math.round(extracted.extractionConfidence * 100)}%
            </span>
          </p>
        </div>
      </header>

      <WorkflowStepper status={submission.status} />

      {naafDoc && (
        <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-slate-700">
            Show original NAAF preview ({naafDoc.fileName})
          </summary>
          <iframe
            src={naafDoc.fileUrl}
            title="NAAF preview"
            className="h-[480px] w-full border-t border-slate-100"
          />
        </details>
      )}

      <ExtractedDataEditor submissionId={submissionId} initial={extracted} />
    </div>
  );
}

function NotConfigured() {
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
