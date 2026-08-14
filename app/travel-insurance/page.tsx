import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import ServiceHero from "@/components/home/ServiceHero";
import TravelInsuranceBody from "@/components/services/bodies/TravelInsuranceBody";
import { getPublishedServicePage } from "@/lib/cms/public";

export async function generateMetadata() {
  const page = await getPublishedServicePage("travel-insurance");
  return { title: page.seoTitle, description: page.seoDescription };
}

export default async function TravelInsurancePage() {
  const page = await getPublishedServicePage("travel-insurance");
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      <ServiceHero content={page} scrimClassName="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/80 via-[#0a1f33]/40 to-transparent" />

      <TravelInsuranceBody />

      <SiteFooter />
    </div>
  );
}
