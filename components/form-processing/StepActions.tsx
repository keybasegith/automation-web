"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface StepActionProps {
  submissionId: string;
  /** Submit-to-compliance is disabled when blocked. */
  blocked?: boolean;
}

/** Small reusable button that POSTs to an API route and refreshes the page. */
function ActionButton({
  label,
  busyLabel,
  href,
  onSuccess,
  variant = "primary",
  disabled,
}: {
  label: string;
  busyLabel?: string;
  href: string;
  onSuccess?: (data: unknown) => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const click = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(href, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Failed (${res.status})`);
        return;
      }
      onSuccess?.(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const cls =
    variant === "primary"
      ? "bg-brand text-white hover:bg-brand-hover"
      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={click}
        disabled={busy || disabled}
        className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium transition disabled:opacity-50 ${cls}`}
      >
        {busy ? (busyLabel ?? "Working…") : label}
      </button>
      {error && (
        <span className="text-xs text-red-700">{error}</span>
      )}
    </div>
  );
}

export function GenerateKycButton({ submissionId }: StepActionProps) {
  const router = useRouter();
  return (
    <ActionButton
      label="Generate KYC draft"
      busyLabel="Generating…"
      href={`/api/form-processing/${submissionId}/kyc`}
      onSuccess={() =>
        router.push(`/dashboard/form-processing/kyc-draft/${submissionId}`)
      }
    />
  );
}

export function GenerateCrqButton({ submissionId }: StepActionProps) {
  const router = useRouter();
  return (
    <ActionButton
      label="Generate CRQ draft"
      busyLabel="Generating…"
      href={`/api/form-processing/${submissionId}/crq`}
      onSuccess={() =>
        router.push(`/dashboard/form-processing/crq-draft/${submissionId}`)
      }
    />
  );
}

export function RunConsistencyButton({ submissionId }: StepActionProps) {
  const router = useRouter();
  return (
    <ActionButton
      label="Run consistency check"
      busyLabel="Running…"
      href={`/api/form-processing/${submissionId}/consistency`}
      onSuccess={() =>
        router.push(`/dashboard/form-processing/consistency-check/${submissionId}`)
      }
    />
  );
}

export function SubmitToComplianceButton({
  submissionId,
  blocked,
}: StepActionProps) {
  return (
    <ActionButton
      label={blocked ? "Submit to compliance (blocked)" : "Submit to compliance"}
      busyLabel="Submitting…"
      href={`/api/form-processing/${submissionId}/submit`}
      disabled={blocked}
    />
  );
}

export function PushToWindFundButton({ submissionId }: StepActionProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const click = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/form-processing/${submissionId}/bp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "push_to_windfund" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Failed (${res.status})`);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={click}
        disabled={busy}
        className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
      >
        {busy ? "Saving…" : "Mark as pushed to WindFund"}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}

export function AddBpNoteForm({ submissionId }: StepActionProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!note.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/form-processing/${submissionId}/bp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_note", notes: note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Failed (${res.status})`);
        return;
      }
      setToast("Note saved.");
      setNote("");
      router.refresh();
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={note}
        rows={3}
        onChange={(e) => setNote(e.target.value)}
        placeholder="BP note — visible to back office and admins."
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy || !note.trim()}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Add BP note"}
        </button>
        {toast && (
          <span className="text-xs text-emerald-700">{toast}</span>
        )}
        {error && <span className="text-xs text-red-700">{error}</span>}
      </div>
    </div>
  );
}
