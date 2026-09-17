import ServicesTabs from "./ServicesTabs";
import { getServiceTabs } from "@/lib/services/tabs";
export default async function ServiceNavigation() {
  return <ServicesTabs items={await getServiceTabs()} />;
}
