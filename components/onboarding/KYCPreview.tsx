import { clientFullName, type ClientRecord } from "@/lib/onboarding";

interface KYCPreviewProps {
  client: ClientRecord;
  documentUrl: string | null;
  signedDocumentUrl?: string | null;
}

const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function KYCPreview({
  client,
  documentUrl,
  signedDocumentUrl,
}: KYCPreviewProps) {
  const url = signedDocumentUrl ?? documentUrl;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand">
            KYC Document
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
        <Field label="Full name" value={clientFullName(client)} />
        <Field label="Email" value={client.email} />
        <Field label="Phone" value={client.phone ?? "—"} />
        <Field label="Date of birth" value={formatDate(client.dateOfBirth)} />
        <Field label="Address" value={client.address ?? "—"} />
        <Field
          label="City / Country"
          value={[client.city, client.country].filter(Boolean).join(", ") || "—"}
        />
      </div>

      {url ? (
        <iframe
          src={url}
          title={`KYC document — ${clientFullName(client)}`}
          className="h-[480px] w-full border-t border-slate-100"
        />
      ) : (
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
          KYC document has not been generated yet.
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
