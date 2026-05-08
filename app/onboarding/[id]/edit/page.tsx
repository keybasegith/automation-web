import Link from "next/link";
import { notFound } from "next/navigation";
import OnboardingForm from "@/components/onboarding/OnboardingForm";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import { getOnboardingById, clientFullName } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export default async function OnboardingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isServerSupabaseConfigured()) {
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

  const { id } = await params;
  const result = await getOnboardingById(id);
  if (!result) notFound();
  const { onboarding, client } = result;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-col gap-1">
        <Link
          href={`/onboarding/${onboarding.id}`}
          className="text-xs font-medium text-brand transition hover:text-brand-hover"
        >
          ← Back to {clientFullName(client)}
        </Link>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Edit onboarding
        </h2>
        <p className="text-sm text-slate-500">
          Update client information. Saving will preserve the current signing
          token; regenerate the documents if you change anything that appears in
          them.
        </p>
      </header>

      <OnboardingForm
        defaultAdvisorName={client.advisorName ?? "Admin"}
        onboardingId={onboarding.id}
        initialValues={{
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          dateOfBirth: client.dateOfBirth,
          address: client.address,
          city: client.city,
          country: client.country,
          employmentStatus: client.employmentStatus,
          annualIncome: client.annualIncome,
          riskProfile: client.riskProfile,
          advisorName: client.advisorName,
        }}
      />
    </div>
  );
}
