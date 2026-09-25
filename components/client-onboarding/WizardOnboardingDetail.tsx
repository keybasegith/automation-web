/**
 * The record of one wizard onboarding: who, what state it is in, the CRQ
 * result, and every document filed for it. Server component.
 */

import Link from "next/link";
import { Columns2, ExternalLink, FileText, PenLine } from "lucide-react";

import StatusBadge from "@/components/onboarding/StatusBadge";
import type { ClientDocument, WizardOnboarding } from "@/lib/client-onboarding/repo";
import { EDITABLE_STATUSES } from "@/lib/client-onboarding/repo";
import { CRQ_FORMS } from "@/lib/risk-questionnaire/forms";
import { deriveRiskProfile } from "@/lib/risk-questionnaire/scoring";

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function WizardOnboardingDetail({
  onboarding,
  documents,
  signingUrl,
}: {
  onboarding: WizardOnboarding;
  documents: ClientDocument[];
  signingUrl: string;
}) {
  const { draft } = onboarding;
  const form = CRQ_FORMS[draft.variant];
  const a = draft.naaf.clientA;
  const b = draft.naaf.clientB;
  const name = draft.variant === "corporate" ? a.surname : [a.firstName, a.surname].filter(Boolean).join(" ");
  const jointName = [b.firstName, b.surname].filter(Boolean).join(" ");
  const profile = deriveRiskProfile(draft.crq.answers, form);
  const editable = EDITABLE_STATUSES.includes(onboarding.status);
  const linkLive =
    onboarding.status === "sent" && onboarding.signingTokenExpiresAt && new Date(onboarding.signingTokenExpiresAt) > new Date();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/onboarding/active" className="text-xs font-medium text-brand hover:text-brand-hover">
            ← All onboardings
          </Link>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{name || "Unnamed client"}</h2>
          <p className="text-sm text-slate-500">
            {form.label} account{jointName && ` · with ${jointName}`}
            {draft.naaf.clientId && ` · Client ID ${draft.naaf.clientId}`}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <StatusBadge status={onboarding.status} />
          <p className="text-xs text-slate-500">Started {when(onboarding.createdAt)}</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {editable && (
          <Link
            href={`/onboarding/${onboarding.id}/wizard`}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <PenLine aria-hidden className="h-4 w-4" /> Continue onboarding
          </Link>
        )}
        <Link
          href={`/dashboard/new-account?onboarding=${onboarding.id}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Columns2 aria-hidden className="h-4 w-4" /> {editable ? "Open in the forms" : "View the forms"}
        </Link>
        <Link
          href={`/dashboard/clients/${onboarding.clientId}`}
          className="inline-flex h-9 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Client record
        </Link>
      </div>

      {linkLive && (
        <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <h3 className="text-sm font-semibold text-sky-950">Waiting for the client to sign</h3>
          <p className="mt-1 text-sm text-sky-900/80">
            The link works once and expires {when(onboarding.signingTokenExpiresAt)}.
          </p>
          <code className="mt-2 block truncate rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs text-slate-700">{signingUrl}</code>
        </section>
      )}

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
        <Fact label="Risk capacity" value={profile.capacity.score === null ? "—" : `${profile.capacity.score} · ${profile.capacityLevel ?? "?"}`} />
        <Fact label="Risk tolerance" value={profile.tolerance.score === null ? "—" : `${profile.tolerance.score} · ${profile.toleranceLevel ?? "?"}`} />
        <Fact label={form.rankingLabel} value={profile.finalRiskRanking ?? "—"} />
        <Fact label="Signed" value={onboarding.completedAt ? when(onboarding.completedAt) : onboarding.signingMethod === "remote" ? "Sent to client" : "Not yet"} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">Documents</h3>
        {documents.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nothing filed yet — documents are generated at the Review &amp; sign step.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {documents.map((doc) => (
              <li key={doc.id}>
                <a
                  href={`/api/client-documents/${doc.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm hover:border-brand"
                >
                  <FileText aria-hidden className="h-5 w-5 shrink-0 text-brand" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">{doc.title}</span>
                    <span className="text-xs text-slate-500">
                      {when(doc.createdAt)} · {(doc.byteSize / 1024).toFixed(0)} KB
                    </span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      doc.signed ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {doc.kind === "supporting" ? "Supporting" : doc.signed ? "Signed" : "For signature"}
                  </span>
                  <ExternalLink aria-hidden className="h-4 w-4 text-slate-400" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
