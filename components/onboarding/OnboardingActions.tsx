"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SignaturePad from "@/components/onboarding/SignaturePad";
import type { OnboardingStatus } from "@/lib/onboarding";

export interface OnboardingActionsProps {
  onboardingId: string;
  status: OnboardingStatus;
  signingUrl: string;
  hasDocuments: boolean;
  hasAdvisorSignature: boolean;
  hasClientSignature: boolean;
}

export default function OnboardingActions(props: OnboardingActionsProps) {
  const router = useRouter();
  const {
    onboardingId,
    status,
    signingUrl,
    hasDocuments,
    hasAdvisorSignature,
    hasClientSignature,
  } = props;

  const [showAdvisorPad, setShowAdvisorPad] = useState(false);
  const [busy, setBusy] = useState<null | "regen" | "send" | "advisor" | "copy">(
    null
  );
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  const showMessage = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    if (type === "ok") {
      setTimeout(() => setMessage(null), 3500);
    }
  };

  const regenerate = async () => {
    setBusy("regen");
    try {
      const res = await fetch(`/api/onboarding/${onboardingId}/generate`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Generate failed (${res.status})`);
      }
      showMessage("ok", "Documents regenerated.");
      router.refresh();
    } catch (err) {
      showMessage("err", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const sendToClient = async () => {
    setBusy("send");
    try {
      const res = await fetch(`/api/onboarding/${onboardingId}/send`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Send failed (${res.status})`);
      }
      try {
        await navigator.clipboard.writeText(signingUrl);
      } catch {
        // Clipboard may be unavailable; non-fatal.
      }
      showMessage("ok", "Marked as sent. Signing link copied to clipboard.");
      router.refresh();
    } catch (err) {
      showMessage("err", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const copyLink = async () => {
    setBusy("copy");
    try {
      await navigator.clipboard.writeText(signingUrl);
      showMessage("ok", "Signing link copied to clipboard.");
    } catch (err) {
      showMessage("err", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const submitAdvisorSignature = async (dataUrl: string) => {
    setBusy("advisor");
    try {
      const res = await fetch(`/api/onboarding/${onboardingId}/sign-advisor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureDataUrl: dataUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Sign failed (${res.status})`);
      }
      setShowAdvisorPad(false);
      showMessage("ok", "Advisor signature saved.");
      router.refresh();
    } catch (err) {
      showMessage("err", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const isCompleted = status === "completed";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={regenerate}
          disabled={busy !== null || isCompleted}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {busy === "regen" ? "Generating…" : hasDocuments ? "Regenerate documents" : "Generate documents"}
        </button>

        <button
          type="button"
          onClick={() => setShowAdvisorPad((s) => !s)}
          disabled={busy !== null || isCompleted || !hasDocuments}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {hasAdvisorSignature ? "Replace advisor signature" : "Advisor sign now"}
        </button>

        <button
          type="button"
          onClick={sendToClient}
          disabled={busy !== null || !hasDocuments || isCompleted}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          {busy === "send" ? "Sending…" : "Send to client"}
        </button>

        <button
          type="button"
          onClick={copyLink}
          disabled={busy !== null}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {busy === "copy" ? "Copying…" : "Copy signing link"}
        </button>
      </div>

      {showAdvisorPad && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="mb-2 text-sm font-semibold text-slate-900">
            Advisor signature
          </h4>
          <SignaturePad
            onSubmit={submitAdvisorSignature}
            submitLabel="Save advisor signature"
            busy={busy === "advisor"}
            helperText="Sign on behalf of the advisor for this onboarding."
          />
        </div>
      )}

      {message && (
        <p
          role={message.type === "err" ? "alert" : "status"}
          className={`rounded-xl border px-4 py-2 text-sm ${
            message.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              hasAdvisorSignature ? "bg-emerald-500" : "bg-slate-300"
            }`}
          />
          Advisor signature {hasAdvisorSignature ? "received" : "pending"}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              hasClientSignature ? "bg-emerald-500" : "bg-slate-300"
            }`}
          />
          Client signature {hasClientSignature ? "received" : "pending"}
        </div>
      </div>
    </div>
  );
}
