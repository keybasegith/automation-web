import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import ServiceHero from "@/components/home/ServiceHero";
import RdspBody from "@/components/services/bodies/RdspBody";
import { getPublishedServicePage } from "@/lib/cms/public";

export async function generateMetadata() {
  const page = await getPublishedServicePage("rdsp");
  return { title: page.seoTitle, description: page.seoDescription };
}

export default async function RDSPPage() {
  const page = await getPublishedServicePage("rdsp");
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      <ServiceHero content={page} scrimClassName="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/80 via-[#0a1f33]/40 to-transparent" />

      <RdspBody />

      <SiteFooter />
    </div>
  );
}
