import Link from "next/link";
import { notFound } from "next/navigation";
import StatusBadge from "@/components/form-processing/StatusBadge";
import {
  AddBpNoteForm,
  PushToWindFundButton,
} from "@/components/form-processing/StepActions";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import {
  getBpProcessing,
  getCrqDraft,
  getKycDraft,
  getSubmissionById,
  listComplianceReviews,
} from "@/lib/forms/repo";
import { BP_STATUS_LABELS } from "@/lib/forms/types";

export const dynamic = "force-dynamic";

const formatDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString() : "—";

export default async function BpPackagePage({
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
  const [submission, kyc, crq, reviews, bp] = await Promise.all([
    getSubmissionById(submissionId),
    getKycDraft(submissionId),
    getCrqDraft(submissionId),
    listComplianceReviews(submissionId),
    getBpProcessing(submissionId),
  ]);
  if (!submission) notFound();

  const approval = reviews.find((r) => r.decision === "approved");
  if (!approval) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-semibold text-amber-900">
            This package has not been approved by compliance yet.
          </p>
          <Link
            href="/dashboard/form-processing"
            className="mt-2 inline-block text-xs font-medium text-brand"
          >
            Back to dashboard →
          </Link>
        </div>
      </div>
    );
  }

  const coreData: ReadonlyArray<{ label: string; value: string }> = [
    { label: "Client full name", value: kyc?.fields.clientFullName ?? "—" },
    { label: "Date of birth", value: kyc?.fields.dateOfBirth ?? "—" },
    { label: "Account type", value: kyc?.fields.accountType ?? "—" },
    {
      label: "Account number",
      value: crq?.fields.accountNumber ?? "—",
    },
    { label: "Address", value: kyc?.fields.address ?? "—" },
    { label: "Phone", value: kyc?.fields.phone ?? "—" },
    { label: "Email", value: kyc?.fields.email ?? "—" },
    { label: "Advisor name", value: kyc?.fields.advisorName ?? "—" },
    { label: "Advisor code", value: kyc?.fields.advisorCode ?? "—" },
    { label: "Investment objective", value: kyc?.fields.investmentObjective ?? "—" },
    { label: "Risk tolerance", value: kyc?.fields.riskTolerance ?? "—" },
    { label: "Time horizon", value: kyc?.fields.timeHorizon ?? "—" },
    { label: "Investment knowledge", value: kyc?.fields.investmentKnowledge ?? "—" },
    { label: "Source of funds", value: kyc?.fields.sourceOfFunds ?? "—" },
    { label: "Compliance approved at", value: formatDate(approval.reviewedAt) },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href="/dashboard/bp/approved-packages"
            className="text-xs font-medium text-brand transition hover:text-brand-hover"
          >
            ← Back to BP queue
          </Link>
          <p className="text-xs font-medium uppercase tracking-wider text-brand">
            Approved package
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {submission.client_name}
          </h2>
          <p className="text-xs text-slate-500">
            BP processing status:{" "}
            {bp ? BP_STATUS_LABELS[bp.status] : "Awaiting processing"}
            {bp?.pushedToWindFundAt
              ? ` · Pushed ${formatDate(bp.pushedToWindFundAt)}`
              : ""}
          </p>
        </div>
        <StatusBadge status={submission.status} />
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand">
          Core data for WindFund
        </h3>
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {coreData.map((row) => (
            <div key={row.label} className="flex flex-col">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {row.label}
              </dt>
              <dd className="text-sm text-slate-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand">
            Approved KYC values
          </h3>
          {kyc ? (
            <pre className="max-h-72 overflow-auto rounded-lg bg-slate-50 p-3 text-[11px] leading-5 text-slate-700">
              {JSON.stringify(kyc.fields, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-slate-500">No KYC found.</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand">
            Approved CRQ values
          </h3>
          {crq ? (
            <pre className="max-h-72 overflow-auto rounded-lg bg-slate-50 p-3 text-[11px] leading-5 text-slate-700">
              {JSON.stringify(crq.fields, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-slate-500">No CRQ found.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand">
          Compliance approval
        </h3>
        <p className="text-sm text-slate-700">
          Approved on {formatDate(approval.reviewedAt)}.
        </p>
        {approval.notes && (
          <p className="mt-2 text-sm text-slate-700">
            <span className="font-medium">Notes:</span> {approval.notes}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand">
          BP actions
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/form-processing/${submissionId}/export`}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Export CSV
          </a>
          {bp?.status !== "pushed_to_windfund" && (
            <PushToWindFundButton submissionId={submissionId} />
          )}
        </div>
        {bp?.notes && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">BP notes</p>
            <p className="mt-1">{bp.notes}</p>
          </div>
        )}
        <div className="mt-4">
          <AddBpNoteForm submissionId={submissionId} />
        </div>
      </section>
    </div>
  );
}
