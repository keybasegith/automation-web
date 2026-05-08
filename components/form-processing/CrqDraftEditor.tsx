"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import FieldGroupEditor, {
  type FieldGroup,
} from "@/components/form-processing/FieldGroupEditor";
import { RunConsistencyButton } from "@/components/form-processing/StepActions";
import type { CrqDraft, CrqField, CrqFields } from "@/lib/forms/types";

const GROUPS: readonly FieldGroup<CrqField>[] = [
  {
    title: "Administrative — auto-fillable from NAAF",
    fields: [
      { key: "clientFullName", label: "Client full name", required: true },
      { key: "accountType", label: "Account type", required: true },
      { key: "accountNumber", label: "Account number" },
      { key: "advisorName", label: "Advisor name", required: true },
      { key: "advisorCode", label: "Advisor code" },
      { key: "date", label: "Date", kind: "date" },
    ],
  },
  {
    title: "Risk profile — confirm with the client",
    fields: [
      { key: "riskTolerance", label: "Risk tolerance" },
      { key: "comfortWithLoss", label: "Comfort with loss", required: true },
      { key: "volatilityComfort", label: "Comfort with volatility" },
      { key: "reactionToMarketDrop", label: "Reaction to market drop" },
      { key: "capacityForLoss", label: "Capacity for loss", required: true },
    ],
  },
  {
    title: "Investment goals — confirm with the client",
    fields: [
      { key: "investmentObjective", label: "Investment objective" },
      {
        key: "primaryInvestmentGoal",
        label: "Primary investment goal",
        required: true,
      },
      { key: "incomeNeed", label: "Income need" },
      { key: "capitalPreservationNeed", label: "Capital preservation need" },
    ],
  },
  {
    title: "Time horizon, knowledge & liquidity",
    fields: [
      { key: "timeHorizon", label: "Time horizon" },
      {
        key: "fundsNeededWithin",
        label: "Funds needed within",
        required: true,
      },
      { key: "investmentKnowledge", label: "Investment knowledge" },
      { key: "investmentExperience", label: "Investment experience" },
      { key: "liquidityNeeds", label: "Liquidity needs" },
    ],
  },
];

export default function CrqDraftEditor({
  submissionId,
  initial,
}: {
  submissionId: string;
  initial: CrqDraft;
}) {
  const router = useRouter();
  const [values, setValues] = useState<CrqFields>(initial.fields);
  const [sourceMap, setSourceMap] = useState(initial.fieldSourceMap);
  const [ready, setReady] = useState(initial.ready);
  const [busy, setBusy] = useState<null | "save" | "ready">(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const update = (key: CrqField, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSourceMap((prev) => ({
      ...prev,
      [key]: value === "" ? "missing" : "manually_entered",
    }));
  };

  const send = async (markReady: boolean) => {
    setBusy(markReady ? "ready" : "save");
    setError(null);
    try {
      const res = await fetch(`/api/form-processing/${submissionId}/crq`, {
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
      setToast(markReady ? "CRQ marked ready." : "CRQ draft saved.");
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
      <div
        role="alert"
        className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900"
      >
        <p className="font-semibold">Confirm CRQ answers with the client.</p>
        <p className="mt-1 text-xs">
          The system does not determine the client&apos;s risk profile.
          Pre-suggested values are tagged &ldquo;Suggested, needs review&rdquo;
          and must be verified before submission.
        </p>
      </div>

      <FieldGroupEditor
        groups={GROUPS}
        values={values}
        sourceMap={sourceMap}
        onChange={update}
      />

      {ready && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          CRQ draft is marked as ready.
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
        <button
          type="button"
          onClick={() => send(false)}
          disabled={busy !== null}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {busy === "save" ? "Saving…" : "Save CRQ draft"}
        </button>
        <button
          type="button"
          onClick={() => send(true)}
          disabled={busy !== null}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
        >
          {busy === "ready" ? "Saving…" : "Mark CRQ ready"}
        </button>
        <RunConsistencyButton submissionId={submissionId} />
      </div>
    </div>
  );
}
