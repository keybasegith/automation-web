import ServiceResources from "@/components/services/ServiceResources";
import ServiceNavigation from "@/components/services/ServiceNavigation";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import ServiceHero from "@/components/home/ServiceHero";
import InsuranceBody from "@/components/services/bodies/InsuranceBody";
import { getPublishedServicePage } from "@/lib/cms/public";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata() {
  const page = await getPublishedServicePage("insurance");
  return pageMetadata("/insurance", page.seoTitle, page.seoDescription);
}

export default async function InsurancePage() {
  const page = await getPublishedServicePage("insurance");
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />
      <ServiceNavigation />

      <main>
        <ServiceHero content={page} scrimClassName="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/70 via-[#0a1f33]/25 to-transparent" />

        <InsuranceBody />
        <ServiceResources slug="insurance" />
      </main>

      <SiteFooter />
    </div>
  );
}
