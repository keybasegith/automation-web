import { notFound, redirect } from "next/navigation";

import OnboardingWizard from "@/components/client-onboarding/OnboardingWizard";
import { EDITABLE_STATUSES, getWizardOnboarding, isUuid } from "@/lib/client-onboarding/repo";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

/** Resumes a saved wizard onboarding where the advisor left it. */
export default async function ResumeOnboardingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isServerSupabaseConfigured() || !isUuid(id)) notFound();
  const onboarding = await getWizardOnboarding(id);
  if (!onboarding) notFound();
  // Once sent for signature or signed, the answers are locked — show the record instead.
  if (!EDITABLE_STATUSES.includes(onboarding.status)) redirect(`/onboarding/${id}`);

  return (
    <OnboardingWizard
      storageConfigured
      initial={{
        id: onboarding.id,
        draft: onboarding.draft,
        currentStep: onboarding.currentStep,
        visitedSteps: onboarding.visitedSteps,
      }}
    />
  );
}
