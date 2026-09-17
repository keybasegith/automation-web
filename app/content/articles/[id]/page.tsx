import ContentLogin from "@/components/content/ContentLogin";
import ContentShell from "@/components/content/ContentShell";
import ArticleEditor from "@/components/content/ArticleEditor";
import { getViewer, viewerProps } from "@/lib/content/viewer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit article — Keybase Content",
  robots: { index: false, follow: false },
};

/**
 * The article editor. Whether this viewer may open THIS article is decided by
 * the API the editor loads from — an id they have no business with comes back
 * as a 404, which the editor renders as such.
 */
export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) return <ContentLogin />;

  const { id } = await params;
  return (
    <ContentShell viewer={viewerProps(viewer)}>
      <ArticleEditor articleId={id} />
    </ContentShell>
  );
}
