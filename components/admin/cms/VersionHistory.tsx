"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, History, RotateCcw, ArrowRight } from "lucide-react";
import type { CmsResource } from "@/lib/cms/types";
import { ToastProvider, useToast } from "./Toast";
import ConfirmDialog from "./ConfirmDialog";
import {
  RESOURCE_EDIT_HREF,
  formatDateTime,
  type ResourceSummary,
  type ActivityEntry,
} from "./resourceLinks";

/**
 * Version History — lists previously published versions of each editable area
 * and lets an admin restore one. Restoring loads that version into the draft
 * only; it never changes the live site until the admin publishes.
 */
export default function VersionHistory() {
  return (
    <ToastProvider>
      <History_ />
    </ToastProvider>
  );
}

interface Pending {
  resource: CmsResource;
  label: string;
  versionId: string;
  versionNumber: number;
}

function History_() {
  const toast = useToast();
  const [resources, setResources] = useState<ResourceSummary[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [restoring, setRestoring] = useState(false);

  // State updates happen only after the await (see useCmsDoc for rationale).
  async function load() {
    try {
      const res = await fetch("/api/admin/summary");
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load.");
      setResources(data.resources as ResourceSummary[]);
      setActivity(data.activity as ActivityEntry[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, []);

  async function confirmRestore() {
    if (!pending) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/admin/cms/${pending.resource}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore_version", versionId: pending.versionId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Version restored as a draft. Review it, then publish when ready.");
        await load();
      } else {
        toast.error(data?.error ?? "Could not restore.");
      }
    } finally {
      setRestoring(false);
      setPending(null);
    }
  }

  const withVersions = resources.filter((r) => r.versions.length > 0);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-6 py-3.5 backdrop-blur sm:px-10">
        <h1 className="text-base font-semibold text-slate-900">Version History</h1>
        <p className="text-xs text-slate-400">
          Previously published versions. Restoring creates a draft — it won&apos;t change the live site.
        </p>
      </div>

      <div className="flex-1 px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-3xl space-y-6">
          {loading ? (
            <div className="flex items-center gap-2 py-24 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : withVersions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 py-20 text-center text-sm text-slate-400">
              <History className="h-8 w-8" strokeWidth={1.5} />
              No previous versions yet. A version is saved each time you publish a change.
            </div>
          ) : (
            withVersions.map((r) => (
              <section key={r.resource} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">{r.label}</h2>
                  <Link
                    href={RESOURCE_EDIT_HREF[r.resource]}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#006d6e] hover:underline"
                  >
                    Edit <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <ul className="divide-y divide-slate-100">
                  {r.versions.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-700">
                          {v.changeSummary || "Content updated"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDateTime(v.createdAt)} · {v.createdBy}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setPending({
                            resource: r.resource,
                            label: r.label,
                            versionId: v.id,
                            versionNumber: v.versionNumber,
                          })
                        }
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore as Draft
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}

          {!loading && !error && activity.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-base font-semibold text-slate-900">Recent activity</h2>
              <ul className="divide-y divide-slate-100">
                {activity.slice(0, 15).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-4 py-2.5">
                    <span className="min-w-0 truncate text-sm text-slate-600">{a.description}</span>
                    <span className="shrink-0 text-xs text-slate-400">{formatDateTime(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={`Restore this version of ${pending?.label ?? ""}?`}
        confirmLabel="Restore as Draft"
        busy={restoring}
        onCancel={() => setPending(null)}
        onConfirm={confirmRestore}
        body="Restoring this version will create a new draft. It will not immediately change the live website — you'll review and publish it separately."
      />
    </div>
  );
}
