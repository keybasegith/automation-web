"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Menu as MenuIcon,
  PanelBottom,
  Settings,
  Image as ImageIcon,
  History,
  FileText,
  Briefcase,
  Newspaper,
  Building2,
  ArrowRight,
  ExternalLink,
  CircleCheck,
  CircleDot,
  Loader2,
} from "lucide-react";
import {
  RESOURCE_EDIT_HREF,
  formatRelative,
  formatDateTime,
  type ResourceSummary,
  type ActivityEntry,
} from "@/components/admin/cms/resourceLinks";

/**
 * Overview dashboard. Shows real publish state read from the CMS: what has
 * unpublished changes, when the site was last published and by whom, recently
 * edited areas, and recent activity — plus quick actions.
 */
export default function AdminOverview() {
  const [resources, setResources] = useState<ResourceSummary[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/website-admin-cms/summary");
        if (res.status === 401) {
          window.location.href = "/website-admin-cms";
          return;
        }
        const data = await res.json();
        if (!active) return;
        if (!res.ok) throw new Error(data?.error ?? "Failed to load.");
        setResources(data.resources as ResourceSummary[]);
        setActivity(data.activity as ActivityEntry[]);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const pending = resources.filter((r) => r.hasUnpublishedChanges);
  const lastPublished = resources
    .map((r) => r.publishedAt)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);
  const lastPublishedBy = resources
    .filter((r) => r.publishedAt === lastPublished)
    .map((r) => r.publishedBy)
    .find(Boolean);
  const recentlyEdited = [...resources]
    .sort((a, b) => (a.draftUpdatedAt < b.draftUpdatedAt ? 1 : -1))
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Website Content</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Manage the content shown on the public Keybase website.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 py-24 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <>
          {/* Status row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatusCard
              icon={pending.length === 0 ? <CircleCheck className="h-5 w-5" /> : <CircleDot className="h-5 w-5" />}
              tone={pending.length === 0 ? "ok" : "pending"}
              label="Website status"
              value={pending.length === 0 ? "All changes published" : `${pending.length} area${pending.length === 1 ? "" : "s"} with unpublished changes`}
            />
            <StatusCard
              label="Last published"
              value={lastPublished ? formatRelative(lastPublished) : "—"}
              sub={lastPublished ? formatDateTime(lastPublished) : undefined}
            />
            <StatusCard
              label="Last published by"
              value={lastPublishedBy ?? "—"}
            />
          </div>

          {/* Pending changes callout */}
          {pending.length > 0 && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="text-sm font-semibold text-amber-800">Unpublished changes</h2>
              <p className="mt-0.5 text-sm text-amber-700">
                These areas have edits that aren&apos;t live yet. Open each one to review and publish.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pending.map((r) => (
                  <Link
                    key={r.resource}
                    href={RESOURCE_EDIT_HREF[r.resource]}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
                  >
                    {r.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-700">Manage content</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ActionCard href="/website-admin-cms/executives" icon={<Users className="h-5 w-5" />} title="Key Executives" desc="Add, edit, reorder, and publish the leadership team." />
            <ActionCard href="/website-admin-cms/company-pages" icon={<Building2 className="h-5 w-5" />} title="Company Pages" desc="Edit the About and CEO Message page content." />
            <ActionCard href="/website-admin-cms/service-pages" icon={<FileText className="h-5 w-5" />} title="Service Pages" desc="Edit hero copy, images, and SEO for the services pages." />
            <ActionCard href="/website-admin-cms/careers" icon={<Briefcase className="h-5 w-5" />} title="Careers" desc="Post open positions and edit the careers page." />
            <ActionCard href="/website-admin-cms/newsroom" icon={<Newspaper className="h-5 w-5" />} title="Newsroom" desc="Publish articles and insights." />
            <ActionCard href="/website-admin-cms/navigation" icon={<MenuIcon className="h-5 w-5" />} title="Navigation" desc="Edit the main menu and top-bar links." />
            <ActionCard href="/website-admin-cms/footer" icon={<PanelBottom className="h-5 w-5" />} title="Footer" desc="Update footer link columns and legal links." />
            <ActionCard href="/website-admin-cms/global-settings" icon={<Settings className="h-5 w-5" />} title="Global Settings" desc="Company details, contact info, social, and SEO." />
            <ActionCard href="/website-admin-cms/media" icon={<ImageIcon className="h-5 w-5" />} title="Media Library" desc="Upload and manage website images." />
            <ActionCard href="/website-admin-cms/history" icon={<History className="h-5 w-5" />} title="Version History" desc="Review and restore previously published versions." />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* Recently edited */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Recently edited</h2>
              <ul className="divide-y divide-slate-100">
                {recentlyEdited.map((r) => (
                  <li key={r.resource} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={RESOURCE_EDIT_HREF[r.resource]} className="text-sm font-medium text-slate-700 hover:text-[#006d6e]">
                      {r.label}
                    </Link>
                    <span className="flex items-center gap-2 text-xs text-slate-400">
                      {r.hasUnpublishedChanges && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">Draft</span>
                      )}
                      {formatRelative(r.draftUpdatedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Recent activity */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent activity</h2>
              {activity.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">No activity yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {activity.slice(0, 6).map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0 truncate text-sm text-slate-600">{a.description}</span>
                      <span className="shrink-0 text-xs text-slate-400">{formatRelative(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-[#006d6e] hover:underline"
          >
            <ExternalLink className="h-4 w-4" /> View Live Website
          </a>
        </>
      )}
    </div>
  );
}

function StatusCard({
  icon,
  tone,
  label,
  value,
  sub,
}: {
  icon?: React.ReactNode;
  tone?: "ok" | "pending";
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        {icon && (
          <span className={tone === "pending" ? "text-amber-500" : "text-emerald-600"}>{icon}</span>
        )}
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#006d6e]/40 hover:shadow-md"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#006d6e]/10 text-[#006d6e]">
        {icon}
      </span>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
      <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#006d6e]">
        Open
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
