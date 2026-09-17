import ServiceResources from "@/components/services/ServiceResources";
import ServiceNavigation from "@/components/services/ServiceNavigation";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import ServiceHero from "@/components/home/ServiceHero";
import RdspBody from "@/components/services/bodies/RdspBody";
import { getPublishedServicePage } from "@/lib/cms/public";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata() {
  const page = await getPublishedServicePage("rdsp");
  return pageMetadata("/rdsp", page.seoTitle, page.seoDescription);
}

export default async function RDSPPage() {
  const page = await getPublishedServicePage("rdsp");
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />
      <ServiceNavigation />

      <main>
        <ServiceHero content={page} scrimClassName="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/80 via-[#0a1f33]/40 to-transparent" />

        <RdspBody />
        <ServiceResources slug="rdsp" />
      </main>

      <SiteFooter />
    </div>
  );
}
