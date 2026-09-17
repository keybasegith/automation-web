import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import ContentLogin from "@/components/content/ContentLogin";
import NewsroomArticle from "@/components/insights/NewsroomArticle";
import { getViewer } from "@/lib/content/viewer";
import { loadRevision, loadWorkspace } from "@/lib/content/service";
import { toInsightArticle } from "@/lib/content/render";
import { getRelatedArticles } from "@/lib/insights/registry";
import { ARTICLE_STATUS_LABELS } from "@/lib/content/types";

/**
 * The private preview.
 *
 * It renders <NewsroomArticle> — the same component the public route renders,
 * with the same data shape. Not a lookalike, not a second template: the exact
 * page a client would see, which is the only kind of preview a compliance
 * approval can safely be based on.
 *
 * Access is the article's own permission check, so an advisor sees their own
 * drafts and compliance sees what has been submitted to them. There is no
 * token, nothing is public, and a signed-out visitor gets the sign-in form
 * rather than a glimpse of unpublished copy.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Preview — Keybase Content",
  // Belt and braces alongside the auth check: a draft must never be indexed.
  robots: { index: false, follow: false, nocache: true },
};

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revision?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) return <ContentLogin />;

  const { id } = await params;
  const { revision: revisionId } = await searchParams;

  // A specific revision when one is asked for — that is how compliance reviews
  // the exact version submitted, and how anyone opens an older one from the
  // version history. Otherwise the working draft.
  const loaded = revisionId
    ? await loadRevision(viewer, id, revisionId)
    : await (async () => {
        const workspace = await loadWorkspace(viewer, id);
        if (!workspace.ok) return workspace;
        if (!workspace.value.draft) {
          return { ok: false as const, status: 404, error: "Nothing to preview yet." };
        }
        return {
          ok: true as const,
          value: {
            article: workspace.value.article,
            revision: workspace.value.draft,
            owner: workspace.value.owner,
          },
        };
      })();

  if (!loaded.ok) notFound();
  const { article, revision, owner } = loaded.value;

  const insight = toInsightArticle(article, revision, owner, {
    // An unpublished draft has no publication date. Showing today's keeps the
    // byline honest about what it is — a preview — rather than printing an
    // empty date or inventing a past one.
    previewDate: new Date().toISOString(),
  });

  return (
    <div>
      {/* A bar that could never be mistaken for part of the article. */}
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 bg-[#0a1f33] px-5 py-2.5 text-white sm:px-8">
        <Link
          href={`/content/articles/${article.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to editor
        </Link>
        <p className="text-xs text-white/70">
          <span className="font-semibold uppercase tracking-wider text-white">
            Preview
          </span>
          <span className="mx-2 text-white/30">·</span>
          Version {revision.revisionNumber}
          <span className="mx-2 text-white/30">·</span>
          {ARTICLE_STATUS_LABELS[article.status]}
          <span className="mx-2 text-white/30">·</span>
          Not visible to the public
        </p>
      </div>

      <NewsroomArticle
        article={insight}
        related={await getRelatedArticles(article.slug)}
        preview
      />
    </div>
  );
}
