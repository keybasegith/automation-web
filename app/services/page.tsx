import { redirect } from "next/navigation";
import { getServiceTabs } from "@/lib/services/tabs";

/**
 * "Our Services" in the header points here. There is no separate landing view —
 * the hub opens on the first service with every tab already in reach.
 */
export default async function ServicesPage() {
  const items = await getServiceTabs();
  redirect(`/services/${items[0]?.slug ?? "wealth-building"}`);
}
