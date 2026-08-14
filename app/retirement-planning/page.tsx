import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import ServiceHero from "@/components/home/ServiceHero";
import RetirementPlanningBody from "@/components/services/bodies/RetirementPlanningBody";
import { getPublishedServicePage } from "@/lib/cms/public";

export async function generateMetadata() {
  const page = await getPublishedServicePage("retirement-planning");
  return { title: page.seoTitle, description: page.seoDescription };
}

export default async function RetirementPlanningPage() {
  const page = await getPublishedServicePage("retirement-planning");
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      <ServiceHero content={page} scrimClassName="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/45 via-[#0a1f33]/15 to-transparent" />

      <RetirementPlanningBody />

      <SiteFooter />
    </div>
  );
}
