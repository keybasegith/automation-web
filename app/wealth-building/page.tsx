import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import ServiceHero, {
  serviceHeroPadding,
  serviceHeroFraming,
} from "@/components/home/ServiceHero";
import WealthBuildingBody from "@/components/services/bodies/WealthBuildingBody";
import { getPublishedServicePage } from "@/lib/cms/public";

export async function generateMetadata() {
  const page = await getPublishedServicePage("wealth-building");
  return { title: page.seoTitle, description: page.seoDescription };
}

export default async function WealthBuildingPage() {
  const page = await getPublishedServicePage("wealth-building");
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      <ServiceHero
        content={page}
        scrimClassName="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/45 via-[#0a1f33]/15 to-transparent"
        paddingClassName={serviceHeroPadding("wealth-building")}
        framingClassName={serviceHeroFraming("wealth-building")}
      />

      <WealthBuildingBody />

      <SiteFooter />
    </div>
  );
}
