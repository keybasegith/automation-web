import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import ClientSigningPanel from "@/components/onboarding/ClientSigningPanel";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import {
  clientFullName,
  getOnboardingByToken,
  logOnboardingEvent,
} from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export default async function ClientSignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!isServerSupabaseConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          This signing link is temporarily unavailable. Please contact your
          advisor.
        </div>
      </main>
    );
  }

  const { token } = await params;
  const result = await getOnboardingByToken(token);
  if (!result) notFound();
  const { onboarding, client } = result;

  // Best-effort viewed-event log; ignore failures.
  try {
    const h = await headers();
    await logOnboardingEvent({
      onboardingId: onboarding.id,
      eventType: "viewed",
      ipAddress:
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent") ?? null,
    });
  } catch {
    // never block rendering on audit
  }

  const documentsAvailable = Boolean(
    onboarding.kycDocumentUrl && onboarding.naafDocumentUrl
  );
  const alreadySigned = Boolean(onboarding.clientSignedAt);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 p-1">
            <Image
              src="/keybase-logo%20copy.png"
              alt="Keybase Financial Group"
              width={200}
              height={200}
              priority
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-slate-900">
              Keybase Financial Group
            </span>
            <span className="text-xs text-slate-500">
              Secure document signing
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-brand">
            Welcome
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {clientFullName(client)}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Please review the following documents prepared by your advisor.
            When you are satisfied, sign below to complete your onboarding.
          </p>
        </section>

        {!documentsAvailable ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            Your advisor has not yet generated the documents for review. Please
            check back shortly.
          </div>
        ) : (
          <>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-100 px-5 py-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  KYC Document
                </h2>
              </header>
              <iframe
                src={onboarding.kycDocumentUrl!}
                title="KYC document"
                className="h-[520px] w-full"
              />
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-100 px-5 py-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  NAAF Document
                </h2>
              </header>
              <iframe
                src={onboarding.naafDocumentUrl!}
                title="NAAF document"
                className="h-[520px] w-full"
              />
            </section>

            <ClientSigningPanel
              token={onboarding.signingToken}
              alreadySigned={alreadySigned}
            />
          </>
        )}

        <footer className="pb-8 text-center text-xs text-slate-400">
          This link is unique to you. Please do not forward it.
        </footer>
      </div>
    </main>
  );
}
