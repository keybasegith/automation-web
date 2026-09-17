import ServiceResources from "@/components/services/ServiceResources";
import ServiceNavigation from "@/components/services/ServiceNavigation";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import ServiceHero from "@/components/home/ServiceHero";
import TaxPlanningBody from "@/components/services/bodies/TaxPlanningBody";
import { getPublishedServicePage } from "@/lib/cms/public";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata() {
  const page = await getPublishedServicePage("tax-planning");
  return pageMetadata("/tax-planning", page.seoTitle, page.seoDescription);
}

export default async function TaxPlanningPage() {
  const page = await getPublishedServicePage("tax-planning");
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />
      <ServiceNavigation />

      <main>
        <ServiceHero content={page} scrimClassName="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/45 via-[#0a1f33]/15 to-transparent" />

        <TaxPlanningBody />
        <ServiceResources slug="tax-planning" />
      </main>

      <SiteFooter />
    </div>
  );
}
