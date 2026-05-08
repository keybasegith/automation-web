"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SignaturePad from "@/components/onboarding/SignaturePad";

export interface ClientSigningPanelProps {
  token: string;
  alreadySigned: boolean;
}

export default function ClientSigningPanel({
  token,
  alreadySigned,
}: ClientSigningPanelProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(alreadySigned);

  const submit = async (dataUrl: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/onboarding/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureDataUrl: dataUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Sign failed (${res.status})`);
      }
      setSubmitted(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
        <p className="font-semibold">Thank you.</p>
        <p className="mt-1">
          Your signature has been received. Your advisor will be notified.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Your signature</h3>
      <p className="mt-1 text-xs text-slate-500">
        By signing below you confirm that the information in the documents
        above is accurate and that you authorise Keybase Financial Group to
        proceed.
      </p>
      <div className="mt-4">
        <SignaturePad
          onSubmit={submit}
          submitLabel="Sign and submit"
          busy={busy}
          helperText="Use your finger, mouse or stylus to sign."
        />
      </div>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}
