import type { Metadata } from "next";

import OnboardingWizard from "@/components/client-onboarding/OnboardingWizard";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New client onboarding · Keybase",
  description: "Onboard a new client section by section; the NAAF and CRQ are filled in, signed and filed at the end.",
};

/**
 * Replaced the single-page onboarding form (which produced HTML summaries)
 * with the section-by-section wizard that fills the official NAAF and CRQ.
 * Onboardings made with the old form still open and sign as before.
 */
export default function NewOnboardingPage() {
  return <OnboardingWizard storageConfigured={isServerSupabaseConfigured()} />;
}
