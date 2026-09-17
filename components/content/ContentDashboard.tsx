"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import {
  ARTICLE_STATUS_LABELS,
  CONTENT_TYPES,
  CONTENT_TYPE_KEYS,
  type ArticleStatus,
  type ContentRole,
  type ContentType,
} from "@/lib/content/types";
import {
  EmptyState,
  ErrorNotice,
  RevisionTag,
  StatusBadge,
  SummaryCard,
  WhenLabel,
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from "./ui";
import NewArticleDialog from "./NewArticleDialog";

/**
 * The Content dashboard.
 *
 * What it shows depends on the signed-in role, but the FILTERING is not what
 * decides that — the server decides which articles an account may see and
 * returns only those. This screen renders what it is given.
 */

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  contentType: ContentType;
  status: ArticleStatus;
  ownerName: string;
  ownerId: string;
  updatedAt: string;
  publishedAt: string | null;
  draftRevisionNumber: number | null;
  latestRevisionNumber: number;
}

const STATUS_FILTERS: ArticleStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "changes_requested",
  "approved",
  "scheduled",
  "published",
  "rejected",
  "archived",
];

/** Days back, for the "updated within" filter. */
const DATE_FILTERS = [
  { label: "Any time", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

export default function ContentDashboard({
  viewerRole,
  viewerName,
}: {
  viewerRole: ContentRole;
  viewerName: string;
}) {
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ArticleStatus | "">("");
  const [type, setType] = useState<ContentType | "">("");
  const [days, setDays] = useState(0);

  // Debounced so typing in the search box does not fire a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (days > 0) {
      params.set(
        "updatedAfter",
        new Date(Date.now() - days * 86_400_000).toISOString()
      );
    }

    try {
      const res = await fetch(`/api/content/articles?${params}`);
      if (res.status === 401) {
        window.location.href = "/content";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not load your articles.");
      setRows(data.items ?? []);
      setCounts(data.counts ?? {});
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your articles.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, type, days]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const summary = useMemo(
    () => [
      { key: "draft" as const, label: "Drafts", value: counts.draft ?? 0 },
      {
        key: "under_review" as const,
        label: "In Review",
        value: (counts.submitted ?? 0) + (counts.under_review ?? 0),
      },
      {
        key: "changes_requested" as const,
        label: "Changes Requested",
        value: counts.changes_requested ?? 0,
        tone: "attention" as const,
      },
      {
        key: "approved" as const,
        label: "Approved",
        value: counts.approved ?? 0,
        tone: "good" as const,
      },
      {
        key: "published" as const,
        label: "Published",
        value: counts.published ?? 0,
        tone: "good" as const,
      },
    ],
    [counts]
  );

  const filtered = status || type || days > 0 || debouncedSearch.trim();

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Content
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create, manage, review and publish Keybase client-facing content.
            </p>
          </div>
          {viewerRole !== "compliance" && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className={buttonPrimary}
            >
              <Plus className="h-4 w-4" />
              New Article
            </button>
          )}
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {summary.map((card) => (
            <SummaryCard
              key={card.key}
              label={card.label}
              value={card.value}
              tone={card.tone}
              active={status === card.key}
              onClick={() =>
                setStatus((prev) => (prev === card.key ? "" : card.key))
              }
            />
          ))}
        </div>

        <div className="mt-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">
              {viewerRole === "advisor" ? "My Articles" : "All Articles"}
            </h2>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search titles and URLs"
                aria-label="Search articles"
                className={`${inputClass} pl-9`}
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ArticleStatus | "")}
              aria-label="Filter by status"
              className={`${inputClass} w-auto`}
            >
              <option value="">All statuses</option>
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {ARTICLE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ContentType | "")}
              aria-label="Filter by content type"
              className={`${inputClass} w-auto`}
            >
              <option value="">All types</option>
              {CONTENT_TYPE_KEYS.map((t) => (
                <option key={t} value={t}>
                  {CONTENT_TYPES[t].label}
                </option>
              ))}
            </select>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              aria-label="Filter by last updated"
              className={`${inputClass} w-auto`}
            >
              {DATE_FILTERS.map((d) => (
                <option key={d.days} value={d.days}>
                  {d.label}
                </option>
              ))}
            </select>
            {filtered && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatus("");
                  setType("");
                  setDays(0);
                }}
                className="text-sm font-medium text-[#006d6e] hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="flex items-center gap-2 py-20 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : error ? (
              <ErrorNotice>{error}</ErrorNotice>
            ) : rows.length === 0 ? (
              <EmptyState
                title={filtered ? "Nothing matches those filters." : "No articles yet."}
                body={
                  filtered
                    ? "Try widening the search, or clear the filters to see everything."
                    : viewerRole === "compliance"
                      ? "Submitted articles appear here once an advisor sends one for review."
                      : `Start writing, ${viewerName.split(" ")[0]}. Your first draft is private until you submit it to compliance.`
                }
                action={
                  filtered ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setStatus("");
                        setType("");
                        setDays(0);
                      }}
                      className={buttonSecondary}
                    >
                      Clear filters
                    </button>
                  ) : viewerRole !== "compliance" ? (
                    <button
                      type="button"
                      onClick={() => setCreating(true)}
                      className={buttonPrimary}
                    >
                      <Plus className="h-4 w-4" />
                      New Article
                    </button>
                  ) : null
                }
              />
            ) : (
              <ArticleTable rows={rows} showAuthor={viewerRole !== "advisor"} />
            )}
          </div>
        </div>
      </div>

      {creating && (
        <NewArticleDialog
          viewerRole={viewerRole}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}

function ArticleTable({
  rows,
  showAuthor,
}: {
  rows: ArticleRow[];
  showAuthor: boolean;
}) {
  return (
    // The wrapper scrolls, never the page.
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
            <th scope="col" className="px-5 py-3 font-medium">Article</th>
            {showAuthor && (
              <th scope="col" className="px-5 py-3 font-medium">Author</th>
            )}
            <th scope="col" className="px-5 py-3 font-medium">Type</th>
            <th scope="col" className="px-5 py-3 font-medium">Status</th>
            <th scope="col" className="px-5 py-3 font-medium">Rev</th>
            <th scope="col" className="px-5 py-3 font-medium">Updated</th>
            <th scope="col" className="px-5 py-3 font-medium">Published</th>
            <th scope="col" className="px-5 py-3 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
            >
              <td className="max-w-[320px] px-5 py-3.5">
                <Link
                  href={`/content/articles/${row.id}`}
                  className="font-medium text-slate-900 hover:text-[#006d6e]"
                >
                  {row.title || (
                    <span className="italic text-slate-400">Untitled article</span>
                  )}
                </Link>
                <p className="mt-0.5 truncate font-mono text-xs text-slate-400">
                  /newsroom/{row.slug}
                </p>
              </td>
              {showAuthor && (
                <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">
                  {row.ownerName}
                </td>
              )}
              <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">
                {CONTENT_TYPES[row.contentType]?.label ?? row.contentType}
              </td>
              <td className="px-5 py-3.5">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-5 py-3.5">
                <RevisionTag number={row.draftRevisionNumber ?? row.latestRevisionNumber} />
              </td>
              <td className="px-5 py-3.5 text-slate-500">
                <WhenLabel iso={row.updatedAt} />
              </td>
              <td className="px-5 py-3.5 text-slate-500">
                <WhenLabel iso={row.publishedAt} />
              </td>
              <td className="px-5 py-3.5 text-right">
                <Link
                  href={`/content/articles/${row.id}`}
                  className="text-sm font-medium text-[#006d6e] hover:underline"
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
