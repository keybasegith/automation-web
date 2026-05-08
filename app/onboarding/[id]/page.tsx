import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import KYCPreview from "@/components/onboarding/KYCPreview";
import NAAFPreview from "@/components/onboarding/NAAFPreview";
import OnboardingActions from "@/components/onboarding/OnboardingActions";
import StatusBadge from "@/components/onboarding/StatusBadge";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import {
  clientFullName,
  getOnboardingById,
  getSignatures,
} from "@/lib/onboarding";

export const dynamic = "force-dynamic";

const formatCurrency = (n: number | null): string =>
  n === null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(n);

const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default async function OnboardingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isServerSupabaseConfigured()) {
    return <NotConfigured />;
  }

  const { id } = await params;

  const result = await getOnboardingById(id);
  if (!result) notFound();
  const { onboarding, client } = result;

  const signatures = await getSignatures(onboarding.id);
  const advisorSig = signatures.find((s) => s.type === "advisor");
  const clientSig = signatures.find((s) => s.type === "client");

  // Build the absolute signing link from the request headers (works behind proxies).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const signingUrl = `${proto}://${host}/sign/onboarding/${onboarding.signingToken}`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href="/onboarding/active"
            className="text-xs font-medium text-brand transition hover:text-brand-hover"
          >
            ← All onboardings
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {clientFullName(client)}
          </h2>
          <p className="text-sm text-slate-500">{client.email}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={onboarding.status} />
          <p className="text-xs text-slate-500">
            Created {formatDate(onboarding.createdAt)}
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <Field label="Phone" value={client.phone ?? "—"} />
          <Field label="Date of birth" value={formatDate(client.dateOfBirth)} />
          <Field
            label="Country"
            value={[client.city, client.country].filter(Boolean).join(", ") || "—"}
          />
          <Field
            label="Employment"
            value={client.employmentStatus ?? "—"}
          />
          <Field
            label="Annual income"
            value={formatCurrency(client.annualIncome)}
          />
          <Field label="Risk profile" value={client.riskProfile} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <Link
            href={`/onboarding/${onboarding.id}/edit`}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Edit data
          </Link>
          <a
            href={signingUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-brand transition hover:text-brand-hover"
          >
            Open client signing page →
          </a>
        </div>
      </section>

      <OnboardingActions
        onboardingId={onboarding.id}
        status={onboarding.status}
        signingUrl={signingUrl}
        hasDocuments={Boolean(
          onboarding.kycDocumentUrl && onboarding.naafDocumentUrl
        )}
        hasAdvisorSignature={Boolean(advisorSig)}
        hasClientSignature={Boolean(clientSig)}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <KYCPreview
          client={client}
          documentUrl={onboarding.kycDocumentUrl}
          signedDocumentUrl={onboarding.signedKycUrl}
        />
        <NAAFPreview
          client={client}
          documentUrl={onboarding.naafDocumentUrl}
          signedDocumentUrl={onboarding.signedNaafUrl}
        />
      </div>
    </div>
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

function NotConfigured() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-sm font-semibold text-amber-900">
          Database is not configured
        </p>
      </div>
    </div>
  );
}
