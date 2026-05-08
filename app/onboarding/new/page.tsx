import OnboardingForm from "@/components/onboarding/OnboardingForm";

export const dynamic = "force-dynamic";

export default function NewOnboardingPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Client Onboarding
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          New onboarding
        </h2>
        <p className="text-sm text-slate-500">
          Fill in the client&apos;s details, then save a draft or generate the
          KYC and NAAF documents.
        </p>
      </header>

      <OnboardingForm defaultAdvisorName="Admin" />
    </div>
  );
}
