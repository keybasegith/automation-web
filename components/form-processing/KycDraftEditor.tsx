"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import FieldGroupEditor, {
  type FieldGroup,
} from "@/components/form-processing/FieldGroupEditor";
import { GenerateCrqButton } from "@/components/form-processing/StepActions";
import type { KycDraft, KycField, KycFields } from "@/lib/forms/types";

const GROUPS: readonly FieldGroup<KycField>[] = [
  {
    title: "Client",
    fields: [
      { key: "clientFullName", label: "Client full name", required: true },
      { key: "dateOfBirth", label: "Date of birth", kind: "date", required: true },
      { key: "email", label: "Email", kind: "email" },
      { key: "phone", label: "Phone", kind: "tel" },
      { key: "address", label: "Address" },
    ],
  },
  {
    title: "Account & advisor",
    fields: [
      { key: "accountType", label: "Account type", required: true },
      { key: "advisorName", label: "Advisor name", required: true },
      { key: "advisorCode", label: "Advisor code" },
      { key: "completedDate", label: "Completed date", kind: "date" },
    ],
  },
  {
    title: "Employment & financials",
    fields: [
      { key: "employmentStatus", label: "Employment status" },
      { key: "occupation", label: "Occupation" },
      { key: "annualIncome", label: "Annual income" },
      { key: "totalNetWorth", label: "Total net worth" },
      { key: "liquidNetWorth", label: "Liquid net worth" },
      { key: "sourceOfFunds", label: "Source of funds", kind: "textarea" },
    ],
  },
  {
    title: "Investment profile",
    fields: [
      { key: "investmentKnowledge", label: "Investment knowledge", required: true },
      { key: "investmentObjective", label: "Investment objective", required: true },
      { key: "riskTolerance", label: "Risk tolerance", required: true },
      { key: "timeHorizon", label: "Time horizon", required: true },
      { key: "liquidityNeeds", label: "Liquidity needs" },
    ],
  },
];

export default function KycDraftEditor({
  submissionId,
  initial,
}: {
  submissionId: string;
  initial: KycDraft;
}) {
  const router = useRouter();
  const [values, setValues] = useState<KycFields>(initial.fields);
  const [sourceMap, setSourceMap] = useState(initial.fieldSourceMap);
  const [ready, setReady] = useState(initial.ready);
  const [busy, setBusy] = useState<null | "save" | "ready">(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const update = (key: KycField, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSourceMap((prev) => ({
      ...prev,
      [key]: value === "" ? "missing" : "manually_edited",
    }));
  };

  const send = async (markReady: boolean) => {
    setBusy(markReady ? "ready" : "save");
    setError(null);
    try {
      const res = await fetch(`/api/form-processing/${submissionId}/kyc`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: values, ready: markReady }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Save failed (${res.status})`);
        return;
      }
      setReady(Boolean(data.ready));
      setToast(markReady ? "KYC marked ready." : "KYC draft saved.");
      router.refresh();
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <FieldGroupEditor
        groups={GROUPS}
        values={values}
        sourceMap={sourceMap}
        onChange={update}
      />

      {ready && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          KYC draft is marked as ready.
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {toast && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {toast}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href={`/dashboard/form-processing/extracted-data/${submissionId}`}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          View source NAAF data
        </Link>
        <button
          type="button"
          onClick={() => send(false)}
          disabled={busy !== null}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {busy === "save" ? "Saving…" : "Save KYC draft"}
        </button>
        <button
          type="button"
          onClick={() => send(true)}
          disabled={busy !== null}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
        >
          {busy === "ready" ? "Saving…" : "Mark KYC ready"}
        </button>
        <GenerateCrqButton submissionId={submissionId} />
      </div>
    </div>
  );
}
