import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import ServiceHero from "@/components/home/ServiceHero";
import NonRegisteredInvestmentsBody from "@/components/services/bodies/NonRegisteredInvestmentsBody";
import { getPublishedServicePage } from "@/lib/cms/public";

export async function generateMetadata() {
  const page = await getPublishedServicePage("non-registered-investments");
  return { title: page.seoTitle, description: page.seoDescription };
}

export default async function NonRegisteredInvestmentsPage() {
  const page = await getPublishedServicePage("non-registered-investments");
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      <ServiceHero content={page} scrimClassName="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/70 via-[#0a1f33]/35 to-transparent" />

      <NonRegisteredInvestmentsBody />

      <SiteFooter />
    </div>
  );
}
