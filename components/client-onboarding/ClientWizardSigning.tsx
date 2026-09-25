"use client";

/**
 * What the client sees from the signing link: the two filled documents, a
 * signature pad per account holder, and one confirmation. One signature signs
 * both documents, and the page says so.
 */

import { useState } from "react";
import { CheckCircle2, ExternalLink, FileText } from "lucide-react";

import SignatureField from "@/components/risk-questionnaire/SignatureField";

export default function ClientWizardSigning({
  token,
  documents,
  signers,
}: {
  token: string;
  documents: { id: string; title: string }[];
  /** One entry per person who signs: the account holder, and the joint holder if any. */
  signers: { key: "client1" | "client2"; label: string }[];
}) {
  const [signatures, setSignatures] = useState<Record<string, string | null>>({});
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const ready = consent && signers.every((s) => signatures[s.key]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/client-onboarding/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatures, consent: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Signing failed. Please try again.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signing failed.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 aria-hidden className="h-6 w-6" />
          <h2 className="text-lg font-semibold">Thank you — your documents are signed</h2>
        </div>
        <p className="mt-2 text-sm">Your advisor has been sent the signed copies. You can close this page.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">1. Review your documents</h2>
        <p className="mt-1 text-sm text-slate-500">Open each document and check the details are correct before signing.</p>
        <ul className="mt-3 flex flex-col gap-2">
          {documents.map((doc) => (
            <li key={doc.id}>
              <a
                href={`/api/client-onboarding/sign/${token}/documents/${doc.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm hover:border-[#0B6165]"
              >
                <FileText aria-hidden className="h-5 w-5 text-[#0B6165]" />
                <span className="flex-1 font-medium text-slate-900">{doc.title.replace(/ \(for signature\)$/, "")}</span>
                <ExternalLink aria-hidden className="h-4 w-4 text-slate-400" />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">2. Sign</h2>
        <p className="mt-1 text-sm text-slate-500">Your signature will be applied to both documents above and dated today.</p>
        <div className="mt-4 flex flex-col gap-6">
          {signers.map((s) => (
            <SignatureField
              key={s.key}
              id={`client-sign-${s.key}`}
              label={s.label}
              value={signatures[s.key] ?? null}
              onChange={(v) => setSignatures((prev) => ({ ...prev, [s.key]: v }))}
            />
          ))}
        </div>
        <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0B6165]" />
          I have reviewed both documents, the information in them is accurate, and I agree that my signature above signs them.
        </label>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={!ready || busy}
          className="mt-5 inline-flex h-11 items-center rounded-xl bg-[#0B6165] px-6 text-sm font-semibold text-white hover:bg-[#08504f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Signing…" : "Sign documents"}
        </button>
      </section>
    </div>
  );
}
