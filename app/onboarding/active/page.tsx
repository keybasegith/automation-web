import Link from "next/link";
import OnboardingTable from "@/components/onboarding/OnboardingTable";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";
import {
  listOnboardingsByStatuses,
  type OnboardingListItem,
} from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export default async function ActiveOnboardingsPage() {
  if (!isServerSupabaseConfigured()) {
    return <NotConfigured />;
  }

  let items: OnboardingListItem[] = [];
  let loadError: string | null = null;
  try {
    items = await listOnboardingsByStatuses(["draft", "in_progress", "sent", "signed"]);
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wider text-brand">
            Client Onboarding
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Active onboardings
          </h2>
          <p className="text-sm text-slate-500">
            Drafts, in-progress, sent for signature, and partially signed.
          </p>
        </div>
        <Link
          href="/onboarding/new"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover"
        >
          + New onboarding
        </Link>
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
        emptyHint="Create your first onboarding to see it here."
      />
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Client Onboarding
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Active onboardings
        </h2>
      </header>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-sm font-semibold text-amber-900">
          Database is not configured
        </p>
        <p className="mt-2 text-sm text-amber-800">
          Set Supabase env vars in{" "}
          <code className="font-mono">.env.local</code> and run the migrations
          in <code className="font-mono">supabase/</code> (including{" "}
          <code className="font-mono">003-onboarding.sql</code>).
        </p>
      </div>
    </div>
  );
}
