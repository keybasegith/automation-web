import ServiceResources from "@/components/services/ServiceResources";
import ServiceNavigation from "@/components/services/ServiceNavigation";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import ServiceHero from "@/components/home/ServiceHero";
import TfsaBody from "@/components/services/bodies/TfsaBody";
import { getPublishedServicePage } from "@/lib/cms/public";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata() {
  const page = await getPublishedServicePage("tfsa");
  return pageMetadata("/tfsa", page.seoTitle, page.seoDescription);
}

export default async function TFSAPage() {
  const page = await getPublishedServicePage("tfsa");
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />
      <ServiceNavigation />

      <main>
        <ServiceHero content={page} scrimClassName="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/85 via-[#0a1f33]/45 to-transparent" />

        <TfsaBody />
        <ServiceResources slug="tfsa" />
      </main>

      <SiteFooter />
    </div>
  );
}
