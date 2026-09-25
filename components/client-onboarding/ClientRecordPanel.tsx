/**
 * On a client's page: their onboardings and every document filed for them.
 * Server component; loads its own data so the client page only has to place it.
 */

import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";

import StatusBadge from "@/components/onboarding/StatusBadge";
import { listClientDocuments, listClientOnboardings } from "@/lib/client-onboarding/repo";
import { CRQ_FORMS } from "@/lib/risk-questionnaire/forms";

const when = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { dateStyle: "medium" });

export default async function ClientRecordPanel({ clientId }: { clientId: string }) {
  let onboardings: Awaited<ReturnType<typeof listClientOnboardings>> = [];
  let documents: Awaited<ReturnType<typeof listClientDocuments>> = [];
  let error: string | null = null;
  try {
    [onboardings, documents] = await Promise.all([listClientOnboardings(clientId), listClientDocuments(clientId)]);
  } catch (err) {
    // Before migration 016 is run these tables do not exist; the rest of the page still works.
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <section className="mb-6 grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Onboardings</h3>
          <Link href="/onboarding/new" className="text-xs font-medium text-brand hover:text-brand-hover">
            + New onboarding
          </Link>
        </div>
        {error ? (
          <p className="mt-2 text-sm text-amber-700">Onboarding records are unavailable: {error}</p>
        ) : onboardings.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No onboardings through the wizard yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {onboardings.map((o) => (
              <li key={o.id}>
                <Link href={`/onboarding/${o.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-2.5 text-sm hover:border-brand">
                  <span>
                    <span className="block font-medium text-slate-900">
                      {CRQ_FORMS[o.draft.variant].label} account{o.draft.naaf.formType ? ` · ${o.draft.naaf.formType}` : ""}
                    </span>
                    <span className="text-xs text-slate-500">Started {when(o.createdAt)}</span>
                  </span>
                  <StatusBadge status={o.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Documents</h3>
        {error ? (
          <p className="mt-2 text-sm text-slate-500">—</p>
        ) : documents.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No documents filed yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {documents.map((d) => (
              <li key={d.id}>
                <a
                  href={`/api/client-documents/${d.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-2.5 text-sm hover:border-brand"
                >
                  <FileText aria-hidden className="h-4.5 w-4.5 shrink-0 text-brand" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">{d.title}</span>
                    <span className="text-xs text-slate-500">{when(d.createdAt)}</span>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${d.signed ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                    {d.kind === "supporting" ? "Supporting" : d.signed ? "Signed" : "For signature"}
                  </span>
                  <ExternalLink aria-hidden className="h-3.5 w-3.5 text-slate-400" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
