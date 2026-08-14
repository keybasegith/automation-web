import { notFound } from "next/navigation";
import ServiceHero, {
  serviceScrim,
  serviceHeroPadding,
  serviceHeroFraming,
} from "@/components/home/ServiceHero";
import { SERVICE_BODIES } from "@/components/services/bodies";
import { getPublishedServicePage } from "@/lib/cms/public";

/**
 * One service, shown inside the tabbed hub. Renders the same hero and the same
 * body component as the standalone /<slug> route, so the tab shows the full
 * page content rather than a summary.
 */

export async function generateStaticParams() {
  return Object.keys(SERVICE_BODIES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!SERVICE_BODIES[slug]) return {};
  const page = await getPublishedServicePage(slug);
  return {
    title: page.seoTitle,
    description: page.seoDescription,
    // Same content as the standalone route; point search engines at that one.
    alternates: { canonical: `/${slug}` },
  };
}

export default async function ServiceTabPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const Body = SERVICE_BODIES[slug];
  if (!Body) notFound();

  const page = await getPublishedServicePage(slug);
  return (
    <>
      <ServiceHero
        content={page}
        scrimClassName={serviceScrim(slug)}
        paddingClassName={serviceHeroPadding(slug)}
        framingClassName={serviceHeroFraming(slug)}
      />
      <Body />
    </>
  );
}
