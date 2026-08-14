import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import ServicesTabs from "@/components/services/ServicesTabs";
import { getServiceTabs } from "@/lib/services/tabs";

/**
 * Shell for the tabbed services hub. The header, tab bar, and footer live here
 * so moving between tabs re-renders only the service body underneath.
 */
export default async function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const items = await getServiceTabs();
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />
      <ServicesTabs items={items} />
      {children}
      <SiteFooter />
    </div>
  );
}
