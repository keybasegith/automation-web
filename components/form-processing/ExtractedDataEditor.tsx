"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import FieldGroupEditor, {
  type FieldGroup,
} from "@/components/form-processing/FieldGroupEditor";
import {
  GenerateCrqButton,
  GenerateKycButton,
} from "@/components/form-processing/StepActions";
import type {
  ExtractedNAAFData,
  NaafField,
  NaafFields,
} from "@/lib/forms/types";

const GROUPS: readonly FieldGroup<NaafField>[] = [
  {
    title: "Client information",
    fields: [
      { key: "firstName", label: "First name" },
      { key: "lastName", label: "Last name" },
      { key: "fullName", label: "Full name" },
      { key: "dateOfBirth", label: "Date of birth", kind: "date" },
      { key: "email", label: "Email", kind: "email" },
      { key: "phone", label: "Phone", kind: "tel" },
      { key: "address", label: "Address" },
      { key: "city", label: "City" },
      { key: "province", label: "Province" },
      { key: "postalCode", label: "Postal code" },
      { key: "country", label: "Country" },
      { key: "sin", label: "SIN (optional, masked)", kind: "masked-sin" },
    ],
  },
  {
    title: "Employment & financial information",
    fields: [
      { key: "employmentStatus", label: "Employment status" },
      { key: "employerName", label: "Employer name" },
      { key: "occupation", label: "Occupation" },
      { key: "annualIncome", label: "Annual income" },
      { key: "liquidNetWorth", label: "Liquid net worth" },
      { key: "fixedAssets", label: "Fixed assets" },
      { key: "totalNetWorth", label: "Total net worth" },
      { key: "investmentKnowledge", label: "Investment knowledge" },
      { key: "sourceOfFunds", label: "Source of funds", kind: "textarea" },
    ],
  },
  {
    title: "Account information",
    fields: [
      { key: "accountType", label: "Account type" },
      { key: "accountNumber", label: "Account number" },
      { key: "accountPurpose", label: "Account purpose" },
      { key: "jurisdiction", label: "Jurisdiction" },
      { key: "currency", label: "Currency" },
      { key: "advisorName", label: "Advisor name" },
      { key: "advisorCode", label: "Advisor code" },
      { key: "branch", label: "Branch" },
      { key: "dateCompleted", label: "Date completed", kind: "date" },
    ],
  },
  {
    title: "Investment profile",
    fields: [
      { key: "investmentObjective", label: "Investment objective" },
      { key: "riskTolerance", label: "Risk tolerance" },
      { key: "timeHorizon", label: "Time horizon" },
      { key: "liquidityNeeds", label: "Liquidity needs" },
      { key: "intendedUse", label: "Intended use", kind: "textarea" },
      { key: "investmentExperience", label: "Investment experience" },
    ],
  },
];

export default function ExtractedDataEditor({
  submissionId,
  initial,
}: {
  submissionId: string;
  initial: ExtractedNAAFData;
}) {
  const router = useRouter();
  const [values, setValues] = useState<NaafFields>(initial.fields);
  const [sourceMap, setSourceMap] = useState(initial.fieldSourceMap);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const update = (key: NaafField, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSourceMap((prev) => ({
      ...prev,
      [key]: value === "" ? "missing" : "manually_edited",
    }));
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/form-processing/${submissionId}/extracted`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields: values }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Save failed (${res.status})`);
        return;
      }
      setToast("Extracted data saved.");
      router.refresh();
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {initial.extractionWarnings.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <p className="font-semibold">Extraction warnings</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
            {initial.extractionWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <FieldGroupEditor
        groups={GROUPS}
        values={values}
        sourceMap={sourceMap}
        confidenceMap={initial.fieldConfidenceMap}
        onChange={update}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-sm">
        <p>
          OCR is not perfect. Edit any field above before generating the KYC or
          CRQ — the downstream draft uses what you confirm here.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
        >
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
          onClick={save}
          disabled={busy}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save extracted data"}
        </button>
        <GenerateKycButton submissionId={submissionId} />
        <GenerateCrqButton submissionId={submissionId} />
      </div>
    </div>
  );
}
