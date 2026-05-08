import Link from "next/link";
import StatusBadge from "@/components/onboarding/StatusBadge";
import {
  clientFullName,
  type OnboardingListItem,
} from "@/lib/onboarding";

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

export default function OnboardingTable({
  items,
  emptyHint,
}: {
  items: readonly OnboardingListItem[];
  emptyHint: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center">
        <p className="text-sm font-medium text-slate-700">No onboardings yet</p>
        <p className="mt-1 text-xs text-slate-500">{emptyHint}</p>
        <Link
          href="/onboarding/new"
          className="mt-4 inline-flex h-9 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover"
        >
          Start a new onboarding
        </Link>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3">Client name</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Created</th>
              <th className="px-6 py-3">Signed</th>
              <th className="px-6 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(({ onboarding, client }) => {
              const signedDate =
                onboarding.status === "completed"
                  ? onboarding.clientSignedAt ?? onboarding.advisorSignedAt
                  : null;
              return (
                <tr
                  key={onboarding.id}
                  className="text-slate-700 transition hover:bg-slate-50/50"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/onboarding/${onboarding.id}`}
                      className="flex flex-col"
                    >
                      <span className="font-medium text-slate-900">
                        {clientFullName(client)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {client.email}
                      </span>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={onboarding.status} />
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {formatDate(onboarding.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {formatDate(signedDate)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/onboarding/${onboarding.id}`}
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
