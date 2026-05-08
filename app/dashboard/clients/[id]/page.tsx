import Link from "next/link";
import { notFound } from "next/navigation";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import { getClientWithEmails } from "@/lib/db/clientsRepo";
import type { EmailStatus, GeneratedEmailRow } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatTimestamp = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  if (!isServerSupabaseConfigured()) {
    return <NotConfigured />;
  }

  const result = await getClientWithEmails(id);
  if (!result) {
    notFound();
  }

  const { client, emails } = result;
  const draftedCount = emails.filter((e) => e.status === "drafted").length;
  const approvedCount = emails.filter((e) => e.status === "approved").length;
  const sentCount = emails.filter((e) => e.status === "sent").length;

  const generateHref = `/secure-email-generator?clientId=${client.id}`;

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href="/dashboard/clients"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-900"
      >
        <span aria-hidden>←</span> Back to Clients
      </Link>

      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wider text-brand">
            Client profile
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {client.name}
          </h2>
          <p className="text-sm text-slate-500">{client.email}</p>
        </div>
        <Link
          href={generateHref}
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover"
        >
          + Draft new email
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Risk tolerance" value={client.risk_tolerance} />
        <Stat
          label="Portfolio"
          value={formatCurrency(Number(client.portfolio_value))}
        />
        <Stat label="Total emails" value={String(emails.length)} />
        <Stat
          label="Pending"
          value={String(draftedCount)}
          accent={draftedCount > 0 ? "amber" : "slate"}
        />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Email history
          </h3>
          <span className="text-xs text-slate-500">
            {sentCount} sent · {approvedCount} approved · {draftedCount} drafted
          </span>
        </header>

        {emails.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              No emails yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Use the button above to draft the first email for {client.name}.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {emails.map((email) => (
              <EmailRow key={email.id} email={email} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EmailRow({ email }: { email: GeneratedEmailRow }) {
  return (
    <li className="px-6 py-4">
      <details className="group">
        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 transition hover:text-slate-900">
          <div className="flex min-w-0 items-center gap-3">
            <StatusPill status={email.status} />
            <span className="truncate text-sm font-medium text-slate-900">
              {email.subject}
            </span>
          </div>
          <span className="shrink-0 text-xs text-slate-400">
            {formatTimestamp(email.created_at)}
          </span>
        </summary>
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {email.body}
          </p>
        </div>
      </details>
    </li>
  );
}

function StatusPill({ status }: { status: EmailStatus }) {
  const config: Record<EmailStatus, { label: string; className: string }> = {
    drafted: {
      label: "Drafted",
      className: "bg-slate-100 text-slate-700 ring-slate-200",
    },
    approved: {
      label: "Approved",
      className: "bg-amber-50 text-amber-800 ring-amber-200",
    },
    sent: {
      label: "Sent",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
  };
  const c = config[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${c.className}`}
    >
      {c.label}
    </span>
  );
}

function Stat({
  label,
  value,
  accent = "slate",
}: {
  label: string;
  value: string;
  accent?: "slate" | "amber";
}) {
  const valueClass =
    accent === "amber" ? "text-amber-700" : "text-slate-900";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-lg font-semibold tabular-nums ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-sm font-semibold text-amber-900">
          Database is not configured
        </p>
        <p className="mt-2 text-sm text-amber-800">
          Set Supabase env vars in{" "}
          <code className="font-mono">.env.local</code> and restart the dev
          server.
        </p>
      </div>
    </div>
  );
}
