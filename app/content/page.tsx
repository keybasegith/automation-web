import ContentLogin from "@/components/content/ContentLogin";
import ContentShell from "@/components/content/ContentShell";
import ContentDashboard from "@/components/content/ContentDashboard";
import { getViewer, viewerProps } from "@/lib/content/viewer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Content — Keybase Financial Group",
  // An internal tool has no business in a search index.
  robots: { index: false, follow: false },
};

/**
 * /content — the single entry point of the content system. The sign-in form for
 * visitors without a session, the dashboard for everyone else.
 */
export default async function ContentHome() {
  const viewer = await getViewer();
  if (!viewer) return <ContentLogin />;

  return (
    <ContentShell viewer={viewerProps(viewer)}>
      <ContentDashboard viewerRole={viewer.role} viewerName={viewer.name} />
    </ContentShell>
  );
}
