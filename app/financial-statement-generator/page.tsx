import Link from "next/link";

import TrialBalanceUpload from "@/components/financial-statements/TrialBalanceUpload";
import { StatusPill } from "@/components/financial-statements/ui";
import { store } from "@/lib/financial-statements/repo";
import { isPersistenceAvailable } from "@/lib/financial-statements/store/localStore";

export const dynamic = "force-dynamic";

export default async function FinancialStatementGeneratorPage() {
  // Where the deployment has no writable storage there is no history to show;
  // a run lives in the browser tab that produced it.
  const keepsHistory = isPersistenceAvailable();
  const packages = keepsHistory ? await store.listPackages() : [];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Finance
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Financial Statement Generator
        </h2>
        <p className="max-w-3xl text-sm text-slate-500">
          Upload a Trial Balance to automatically create the Balance Sheet and Income Statement.
          Every figure is derived from the uploaded accounts and the approved GL mapping table, and
          every line traces back to the GL rows behind it.
        </p>
      </header>

      <TrialBalanceUpload />

      {keepsHistory ? (
      <section className="mt-8">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Statement packages</h3>

        {packages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-sm font-medium text-slate-700">No packages yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Upload a Trial Balance above to generate the first one.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Period</th>
                  <th className="px-4 py-2 font-medium">Source file</th>
                  <th className="px-4 py-2 font-medium">Version</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packages.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900">{entry.periodLabel}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-600">{entry.sourceFileName}</td>
                    <td className="px-4 py-2 tabular-nums text-slate-600">{entry.currentVersion}</td>
                    <td className="px-4 py-2"><StatusPill status={entry.status} /></td>
                    <td className="px-4 py-2 text-slate-500">
                      {new Date(entry.createdAt).toLocaleString("en-CA")}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/financial-statement-generator/${entry.id}`}
                        className="font-medium text-brand hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      ) : null}

      <p className="mt-6 text-xs text-slate-500">
        Need to change where an account lands?{" "}
        <Link href="/financial-statement-generator/gl-mapping" className="text-brand hover:underline">
          Manage the GL mapping table
        </Link>
        .
      </p>
    </div>
  );
}
