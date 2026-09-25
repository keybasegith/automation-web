"use client";

/**
 * Review & sign: what is still open, a look at the filled official forms, and
 * the signing itself — on this screen with the client, or by sending them a
 * link. One signature per signer signs both the NAAF and the CRQ, and the
 * signers are told so before they sign.
 */

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, FileText, Send, UserCheck } from "lucide-react";

import SignatureField from "@/components/risk-questionnaire/SignatureField";
import type { OnboardingDraft, SigningMethod } from "@/lib/client-onboarding/draft";
import type { StepDefinition, StepFinding, StepId } from "@/lib/client-onboarding/steps";
import { CRQ_FORMS } from "@/lib/risk-questionnaire/forms";

import { Section } from "./fields";

export interface SignatureSet {
  client1: string | null;
  client2: string | null;
  advisor: string | null;
}

export interface FinishResult {
  kind: "completed" | "sent";
  signingUrl?: string;
  expiresAt?: string;
  documents: { id: string; title: string }[];
}

export default function ReviewStep({
  draft,
  steps,
  findings,
  blocking,
  onGoTo,
  canStore,
  storageMessage,
  onFinish,
}: {
  draft: OnboardingDraft;
  steps: StepDefinition[];
  findings: StepFinding[];
  blocking: StepFinding[];
  onGoTo: (step: StepId, fieldId?: string) => void;
  /** False when the onboarding cannot be saved (no storage configured or reachable). */
  canStore: boolean;
  storageMessage: string | null;
  onFinish: (method: SigningMethod, signatures: SignatureSet) => Promise<FinishResult>;
}) {
  const [method, setMethod] = useState<SigningMethod>("in_person");
  const [signatures, setSignatures] = useState<SignatureSet>({ client1: null, client2: null, advisor: null });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FinishResult | null>(null);
  const [previewing, setPreviewing] = useState<"naaf" | "crq" | null>(null);

  const joint = draft.naaf.hasJointHolder;
  const corporate = draft.variant === "corporate";
  const a = draft.naaf.clientA;
  const b = draft.naaf.clientB;
  const nameA = corporate ? "Authorized Signing Officer" : [a.firstName, a.surname].filter(Boolean).join(" ") || "Account holder";
  const nameB = [b.firstName, b.surname].filter(Boolean).join(" ") || "Joint account holder";
  const toConfirm = findings.filter((f) => f.kind === "review");

  const preview = async (document: "naaf" | "crq") => {
    setPreviewing(document);
    setError(null);
    try {
      const res = await fetch("/api/client-onboarding/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Signatures drawn so far are applied, so the preview shows the signed document.
        body: JSON.stringify({ draft, document, signatures }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Preview failed (${res.status}).`);
      const url = URL.createObjectURL(await res.blob());
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed.");
    } finally {
      setPreviewing(null);
    }
  };

  const signersReady =
    method === "remote"
      ? Boolean(signatures.advisor)
      : Boolean(signatures.client1 && signatures.advisor && (!joint || signatures.client2));
  const ready = blocking.length === 0 && signersReady && (method === "remote" || consent) && canStore;

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await onFinish(method, signatures));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (result) return <Done result={result} />;

  return (
    <div className="flex flex-col gap-4">
      {/* ------------------------------------------------ open items */}
      {blocking.length > 0 ? (
        <Section
          title={`${blocking.length} item${blocking.length === 1 ? "" : "s"} to complete before signing`}
          description="Select an item to go to it."
        >
          <FindingList findings={blocking} steps={steps} onGoTo={onGoTo} tone="red" />
        </Section>
      ) : (
        <div className="flex items-center gap-2.5 rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[14px] text-emerald-900">
          <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0" />
          Every required box on the NAAF and the CRQ is filled in.
        </div>
      )}
      {toConfirm.length > 0 && (
        <Section title={`${toConfirm.length} optional item${toConfirm.length === 1 ? "" : "s"} left blank`} description="Confirm these were left blank on purpose. They do not block signing.">
          <FindingList findings={toConfirm} steps={steps} onGoTo={onGoTo} tone="amber" />
        </Section>
      )}

      {/* ------------------------------------------------ documents */}
      <Section title="Documents" description="Keybase's official forms, filled in from these answers.">
        <div className="grid gap-2 @xl:grid-cols-2">
          {(
            [
              ["naaf", "New Account Application Form", "V3-NAAF-2022"],
              ["crq", "Client Risk Questionnaire", CRQ_FORMS[draft.variant].subtitle],
            ] as const
          ).map(([key, title, sub]) => (
            <button
              key={key}
              type="button"
              onClick={() => preview(key)}
              disabled={previewing !== null}
              className="flex items-center gap-3 rounded-[8px] border border-slate-200 bg-white px-3.5 py-3 text-left transition hover:border-[#0B6165] disabled:opacity-60"
            >
              <FileText aria-hidden className="h-5 w-5 shrink-0 text-[#0B6165]" />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium text-slate-900">{title}</span>
                <span className="block text-[12px] text-slate-500">{sub}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#0B6165]">
                {previewing === key ? "Filling…" : "Preview"} <ExternalLink aria-hidden className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------------ signing */}
      <Section title="Signing">
        <div role="radiogroup" aria-label="How the client signs" className="grid gap-2 @xl:grid-cols-2">
          {(
            [
              ["in_person", "Sign now, in person", "The client signs on this screen, then the onboarding is complete.", UserCheck],
              ["remote", "Send to the client", "You sign now; the client gets a link to review and sign.", Send],
            ] as const
          ).map(([value, title, body, Icon]) => {
            const selected = method === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setMethod(value)}
                className={`flex items-start gap-3 rounded-[10px] border p-3.5 text-left transition ${
                  selected ? "border-[#0B6165] bg-[#EEF5F5] ring-1 ring-[#0B6165]" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Icon aria-hidden className={`mt-0.5 h-5 w-5 shrink-0 ${selected ? "text-[#0B6165]" : "text-slate-400"}`} />
                <span>
                  <span className="block text-[14px] font-semibold text-slate-900">{title}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-slate-500">{body}</span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 rounded-[8px] bg-slate-50 px-3 py-2.5 text-[13px] leading-snug text-slate-600">
          Each signature below is applied to <b>both</b> the New Account Application Form and the Client Risk
          Questionnaire, dated today.
        </p>

        <div className="mt-4 flex flex-col gap-6">
          {method === "in_person" && (
            <>
              <SignatureField
                id="wizard-signature-client1"
                label={`${nameA}${corporate ? "" : " — client signature"}`}
                value={signatures.client1}
                onChange={(client1) => setSignatures((s) => ({ ...s, client1 }))}
              />
              {joint && (
                <SignatureField
                  id="wizard-signature-client2"
                  label={`${nameB} — joint account holder signature`}
                  value={signatures.client2}
                  onChange={(client2) => setSignatures((s) => ({ ...s, client2 }))}
                />
              )}
            </>
          )}
          <SignatureField
            id="wizard-signature-advisor"
            label={`${draft.naaf.advisor.name || "Advisor"} — advisor signature`}
            value={signatures.advisor}
            onChange={(advisor) => setSignatures((s) => ({ ...s, advisor }))}
          />
          {method === "in_person" && (
            <label className="flex cursor-pointer items-start gap-2.5 text-[14px] leading-snug text-slate-700">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0B6165]" />
              The {joint ? "clients have" : corporate ? "signing officer has" : "client has"} reviewed both documents and agree that the
              signature{joint ? "s" : ""} above sign{joint ? "" : "s"} them.
            </label>
          )}
        </div>
      </Section>

      {!canStore && (
        <div className="flex items-start gap-2.5 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-900">
          <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {storageMessage ?? "Client storage is unavailable, so the onboarding can't be signed and filed yet."} You can
            still preview and print the filled forms above — with any signatures drawn below.
          </span>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-800">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={finish}
          disabled={!ready || busy}
          className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-[#0B6165] px-5 text-[15px] font-semibold text-white transition hover:bg-[#08504f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy
            ? "Generating documents…"
            : method === "in_person"
              ? "Sign & complete onboarding"
              : "Generate documents & create signing link"}
        </button>
      </div>
    </div>
  );
}

function FindingList({
  findings,
  steps,
  onGoTo,
  tone,
}: {
  findings: StepFinding[];
  steps: StepDefinition[];
  onGoTo: (step: StepId, fieldId?: string) => void;
  tone: "red" | "amber";
}) {
  return (
    <div className="grid gap-x-6 gap-y-3 @2xl:grid-cols-2">
      {steps
        .map((step) => ({ step, items: findings.filter((f) => f.step === step.id) }))
        .filter((g) => g.items.length > 0)
        .map(({ step, items }) => (
          <div key={step.id}>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">{step.title}</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {items.map((f) => (
                <li key={`${f.form}-${f.fieldId}-${f.message}`}>
                  <button
                    type="button"
                    onClick={() => onGoTo(f.step, f.fieldId)}
                    className={`text-left text-[13px] underline-offset-2 hover:underline ${tone === "red" ? "text-red-700" : "text-amber-800"}`}
                  >
                    <span className="mr-1.5 rounded bg-slate-100 px-1 py-px text-[10.5px] font-semibold text-slate-500">{f.form}</span>
                    {f.message}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}

function Done({ result }: { result: FinishResult }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[12px] border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-center gap-2.5 text-emerald-900">
          <CheckCircle2 aria-hidden className="h-6 w-6" />
          <h3 className="text-[18px] font-semibold">
            {result.kind === "completed" ? "Onboarding complete" : "Ready for the client to sign"}
          </h3>
        </div>
        <p className="mt-1.5 text-[14px] text-emerald-900/80">
          {result.kind === "completed"
            ? "The signed NAAF and CRQ are filed on the client's record."
            : "Send the client this link. It opens the documents for review and signing, works once, and expires on " +
              (result.expiresAt ? new Date(result.expiresAt).toLocaleDateString("en-CA", { dateStyle: "long" }) : "") +
              "."}
        </p>
        {result.signingUrl && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-[7px] border border-emerald-200 bg-white px-3 py-2 text-[13px] text-slate-700">
              {result.signingUrl}
            </code>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(result.signingUrl!);
                setCopied(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-[7px] bg-emerald-800 px-3 text-[13px] font-semibold text-white hover:bg-emerald-900"
            >
              <Copy aria-hidden className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        )}
      </div>
      <Section title="Filed documents">
        <ul className="flex flex-col gap-2">
          {result.documents.map((doc) => (
            <li key={doc.id}>
              <a
                href={`/api/client-documents/${doc.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-[8px] border border-slate-200 px-3.5 py-2.5 text-[14px] text-slate-800 hover:border-[#0B6165]"
              >
                <FileText aria-hidden className="h-4.5 w-4.5 text-[#0B6165]" />
                <span className="flex-1">{doc.title}</span>
                <ExternalLink aria-hidden className="h-3.5 w-3.5 text-slate-400" />
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
