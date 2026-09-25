import type { Metadata } from "next";
import { notFound } from "next/navigation";

import NewAccountWorkspace, { type SavedOnboarding } from "@/components/new-account/NewAccountWorkspace";
import { EDITABLE_STATUSES, getWizardOnboarding, isUuid } from "@/lib/client-onboarding/repo";
import { isCrqVariant } from "@/lib/risk-questionnaire/forms";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const metadata: Metadata = {
  title: "New Account Application · Keybase",
  description:
    "The New Account Application Form and the Client Risk Questionnaire side by side, with shared fields filled in across both.",
};

export const dynamic = "force-dynamic";

const VIEWS = ["split", "naaf", "crq"] as const;
type View = (typeof VIEWS)[number];

/**
 * `?crq=individual|joint|corporate` picks the CRQ edition; `?view=naaf|crq`
 * opens one form full width instead of side by side; `?onboarding=<id>` opens
 * a saved wizard onboarding in the forms, saving edits back to it.
 */
export default async function NewAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ crq?: string; view?: string; onboarding?: string }>;
}) {
  const { crq, view, onboarding: onboardingId } = await searchParams;
  const layout: View = (VIEWS as readonly string[]).includes(view ?? "") ? (view as View) : "split";

  let saved: SavedOnboarding | undefined;
  if (onboardingId) {
    if (!isUuid(onboardingId) || !isServerSupabaseConfigured()) notFound();
    const record = await getWizardOnboarding(onboardingId);
    if (!record) notFound();
    const a = record.draft.naaf.clientA;
    saved = {
      id: record.id,
      draft: record.draft,
      editable: EDITABLE_STATUSES.includes(record.status),
      clientName: record.draft.variant === "corporate" ? a.surname : [a.firstName, a.surname].filter(Boolean).join(" "),
    };
  }

  const variant = saved?.draft.variant ?? (isCrqVariant(crq) ? crq : "individual");
  return (
    <NewAccountWorkspace
      key={`${saved?.id ?? "new"}-${variant}-${layout}`}
      initialVariant={variant}
      initialLayout={layout}
      onboarding={saved}
    />
  );
}
