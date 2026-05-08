import Link from "next/link";
import { notFound } from "next/navigation";
import AuditTrailList from "@/components/form-processing/AuditTrailList";
import ComplianceReviewActions from "@/components/form-processing/ComplianceReviewActions";
import ConsistencyResultPanel from "@/components/form-processing/ConsistencyResultPanel";
import FieldGroupEditor, {
  type FieldGroup,
} from "@/components/form-processing/FieldGroupEditor";
import StatusBadge from "@/components/form-processing/StatusBadge";
import WorkflowStepper from "@/components/form-processing/WorkflowStepper";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import { listAuditLogs } from "@/lib/audit/createAuditLog";
import {
  getCrqDraft,
  getExtractedData,
  getKycDraft,
  getLatestConsistencyResult,
  getNaafDocument,
  getSubmissionById,
  listComplianceReviews,
} from "@/lib/forms/repo";
import {
  COMPLIANCE_DECISION_LABELS,
  type CrqField,
  type KycField,
  type NaafField,
} from "@/lib/forms/types";

export const dynamic = "force-dynamic";

const KYC_GROUP: FieldGroup<KycField> = {
  title: "KYC values",
  fields: [
    { key: "clientFullName", label: "Client full name" },
    { key: "dateOfBirth", label: "Date of birth", kind: "date" },
    { key: "accountType", label: "Account type" },
    { key: "advisorName", label: "Advisor name" },
    { key: "advisorCode", label: "Advisor code" },
    { key: "investmentObjective", label: "Investment objective" },
    { key: "riskTolerance", label: "Risk tolerance" },
    { key: "timeHorizon", label: "Time horizon" },
    { key: "investmentKnowledge", label: "Investment knowledge" },
    { key: "liquidityNeeds", label: "Liquidity needs" },
    { key: "annualIncome", label: "Annual income" },
    { key: "totalNetWorth", label: "Total net worth" },
  ],
};

const CRQ_GROUP: FieldGroup<CrqField> = {
  title: "CRQ values",
  fields: [
    { key: "clientFullName", label: "Client full name" },
    { key: "accountType", label: "Account type" },
    { key: "comfortWithLoss", label: "Comfort with loss" },
    { key: "primaryInvestmentGoal", label: "Primary investment goal" },
    { key: "fundsNeededWithin", label: "Funds needed within" },
    { key: "capacityForLoss", label: "Capacity for loss" },
    { key: "investmentExperience", label: "Investment experience" },
    { key: "liquidityNeeds", label: "Liquidity needs" },
  ],
};

const NAAF_GROUP: FieldGroup<NaafField> = {
  title: "Confirmed NAAF values",
  fields: [
    { key: "fullName", label: "Full name" },
    { key: "dateOfBirth", label: "Date of birth", kind: "date" },
    { key: "email", label: "Email", kind: "email" },
    { key: "phone", label: "Phone", kind: "tel" },
    { key: "address", label: "Address" },
    { key: "accountType", label: "Account type" },
    { key: "advisorName", label: "Advisor" },
    { key: "annualIncome", label: "Annual income" },
    { key: "totalNetWorth", label: "Total net worth" },
    { key: "riskTolerance", label: "Risk tolerance" },
  ],
};

export default async function ComplianceReviewPage({
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
  const [submission, naaf, kyc, crq, result, naafDoc, reviews, auditEntries] =
    await Promise.all([
      getSubmissionById(submissionId),
      getExtractedData(submissionId),
      getKycDraft(submissionId),
      getCrqDraft(submissionId),
      getLatestConsistencyResult(submissionId),
      getNaafDocument(submissionId),
      listComplianceReviews(submissionId),
      listAuditLogs({ submissionId, limit: 50 }),
    ]);

  if (!submission) notFound();

  const alreadyApproved = reviews.some((r) => r.decision === "approved");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href="/dashboard/form-processing"
            className="text-xs font-medium text-brand transition hover:text-brand-hover"
          >
            ← Back to dashboard
          </Link>
          <p className="text-xs font-medium uppercase tracking-wider text-brand">
            Compliance review
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {submission.client_name}
          </h2>
        </div>
        <StatusBadge status={submission.status} />
      </header>

      <WorkflowStepper status={submission.status} />

      {naafDoc && (
        <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-slate-700">
            Original NAAF document ({naafDoc.fileName})
          </summary>
          <iframe
            src={naafDoc.fileUrl}
            title="NAAF preview"
            className="h-[480px] w-full border-t border-slate-100"
          />
        </details>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {naaf && (
          <FieldGroupEditor
            groups={[NAAF_GROUP]}
            values={naaf.fields}
            sourceMap={naaf.fieldSourceMap}
            confidenceMap={naaf.fieldConfidenceMap}
            onChange={() => undefined}
            disabled
          />
        )}
        {kyc && (
          <FieldGroupEditor
            groups={[KYC_GROUP]}
            values={kyc.fields}
            sourceMap={kyc.fieldSourceMap}
            onChange={() => undefined}
            disabled
          />
        )}
      </div>

      {crq && (
        <FieldGroupEditor
          groups={[CRQ_GROUP]}
          values={crq.fields}
          sourceMap={crq.fieldSourceMap}
          onChange={() => undefined}
          disabled
        />
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand">
          Consistency check
        </h3>
        {result ? (
          <ConsistencyResultPanel result={result} />
        ) : (
          <p className="text-sm text-slate-500">
            No consistency check has been recorded for this submission yet.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand">
          Compliance actions
        </h3>
        <ComplianceReviewActions
          submissionId={submissionId}
          alreadyApproved={alreadyApproved}
        />
      </section>

      {reviews.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand">
            Decision history
          </h3>
          <ul className="divide-y divide-slate-100">
            {reviews.map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                    {COMPLIANCE_DECISION_LABELS[r.decision]}
                  </span>
                  {r.pinVerified && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      PIN verified
                    </span>
                  )}
                  <span className="ml-auto text-xs text-slate-500">
                    {new Date(r.reviewedAt).toLocaleString()}
                  </span>
                </div>
                {r.notes && (
                  <p className="mt-2 text-sm text-slate-700">{r.notes}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-brand">
          Audit trail
        </h3>
        <AuditTrailList entries={auditEntries} />
      </section>
    </div>
  );
}
