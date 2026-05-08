import { clientFullName, type ClientRecord } from "@/lib/onboarding";

interface NAAFPreviewProps {
  client: ClientRecord;
  documentUrl: string | null;
  signedDocumentUrl?: string | null;
}

const formatCurrency = (n: number | null): string =>
  n === null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(n);

export default function NAAFPreview({
  client,
  documentUrl,
  signedDocumentUrl,
}: NAAFPreviewProps) {
  const url = signedDocumentUrl ?? documentUrl;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand">
            NAAF Document
          </p>
          <h3 className="text-sm font-semibold text-slate-900">
            {clientFullName(client)}
          </h3>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-brand transition hover:text-brand-hover"
          >
            Open in new tab →
          </a>
        )}
      </header>

      <div className="grid gap-4 px-6 py-4 text-sm sm:grid-cols-2">
        <Field label="Employment status" value={client.employmentStatus ?? "—"} />
        <Field label="Annual income" value={formatCurrency(client.annualIncome)} />
        <Field label="Risk profile" value={client.riskProfile} />
        <Field label="Advisor" value={client.advisorName ?? "—"} />
      </div>

      {url ? (
        <iframe
          src={url}
          title={`NAAF document — ${clientFullName(client)}`}
          className="h-[480px] w-full border-t border-slate-100"
        />
      ) : (
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
          NAAF document has not been generated yet.
        </div>
      )}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span className="text-sm text-slate-900">{value}</span>
    </div>
  );
}
