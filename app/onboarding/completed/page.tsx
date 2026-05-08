import OnboardingTable from "@/components/onboarding/OnboardingTable";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import {
  listOnboardingsByStatuses,
  type OnboardingListItem,
} from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export default async function CompletedOnboardingsPage() {
  if (!isServerSupabaseConfigured()) {
    return <NotConfigured />;
  }

  let items: OnboardingListItem[] = [];
  let loadError: string | null = null;
  try {
    items = await listOnboardingsByStatuses(["completed"]);
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Client Onboarding
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Completed onboardings
        </h2>
        <p className="text-sm text-slate-500">
          All onboardings with both client and advisor signatures on file.
        </p>
      </header>

      {loadError && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Failed to load onboardings: {loadError}
        </div>
      )}

      <OnboardingTable
        items={items}
        emptyHint="Onboardings appear here once both signatures are collected."
      />
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
