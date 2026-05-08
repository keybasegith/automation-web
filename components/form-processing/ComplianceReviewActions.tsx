"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ComplianceDecision } from "@/lib/forms/types";

export interface ComplianceReviewActionsProps {
  submissionId: string;
  alreadyApproved: boolean;
}

type Mode = ComplianceDecision | null;

export default function ComplianceReviewActions({
  submissionId,
  alreadyApproved,
}: ComplianceReviewActionsProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [pin, setPin] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const reset = () => {
    setMode(null);
    setPin("");
    setAcknowledged(false);
    setNotes("");
    setError(null);
  };

  const submit = async () => {
    if (!mode) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/form-processing/${submissionId}/compliance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision: mode,
            notes: notes.trim() || undefined,
            acknowledged: mode === "approved" ? acknowledged : undefined,
            pin: mode === "approved" ? pin : undefined,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Action failed (${res.status})`);
        return;
      }
      setToast(`Decision recorded: ${mode}`);
      reset();
      router.refresh();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (alreadyApproved) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
        This package has been approved by compliance. No further action is
        available from this view.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("approved")}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover"
        >
          Approve…
        </button>
        <button
          type="button"
          onClick={() => setMode("returned_to_advisor")}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Return to advisor…
        </button>
        <button
          type="button"
          onClick={() => setMode("clarification_requested")}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Request clarification…
        </button>
        <button
          type="button"
          onClick={() => setMode("rejected")}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-sm font-medium text-red-700 transition hover:bg-red-50"
        >
          Reject…
        </button>
      </div>

      {toast && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {toast}
        </p>
      )}

      {mode && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-900">
            {modeTitle(mode)}
          </h4>
          <div className="mt-3 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-700">
                {mode === "approved"
                  ? "Notes (optional)"
                  : mode === "clarification_requested"
                    ? "Clarification question (required)"
                    : "Reason (required)"}
              </span>
              <textarea
                value={notes}
                rows={4}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </label>

            {mode === "approved" && (
              <>
                <label className="flex items-start gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  />
                  <span>
                    I confirm that I have reviewed the client onboarding package
                    and consistency flags.
                  </span>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-slate-700">
                    Compliance PIN
                  </span>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="h-10 w-32 rounded-xl border border-slate-200 bg-white px-3 text-sm font-mono tracking-widest text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                  <span className="text-[11px] text-slate-500">
                    The PIN is verified server-side against a salted hash.
                    Demo PIN: <span className="font-mono">123456</span>.
                  </span>
                </label>
              </>
            )}

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={reset}
                disabled={busy}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-brand px-3 text-xs font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
              >
                {busy ? "Saving…" : `Confirm ${modeVerb(mode)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function modeTitle(mode: ComplianceDecision): string {
  switch (mode) {
    case "approved":
      return "Approve package";
    case "returned_to_advisor":
      return "Return to advisor";
    case "clarification_requested":
      return "Request clarification";
    case "rejected":
      return "Reject";
  }
}

function modeVerb(mode: ComplianceDecision): string {
  switch (mode) {
    case "approved":
      return "approval";
    case "returned_to_advisor":
      return "return";
    case "clarification_requested":
      return "clarification";
    case "rejected":
      return "rejection";
  }
}
