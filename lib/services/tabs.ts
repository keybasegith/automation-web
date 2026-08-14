import { getPublishedServicePages } from "@/lib/cms/public";
import type { TabItem } from "@/components/services/ServicesTabs";

/** Category display order. Anything else falls in after these, in CMS order. */
const CATEGORY_ORDER = [
  "Wealth Planning",
  "Investment Solutions",
  "Preservation Strategies",
];

/**
 * Tab labels for services whose full name is too long to sit in a nav row. The
 * full `breadcrumbLabel` still heads the page itself, so nothing is lost.
 */
const SHORT_LABEL: Record<string, string> = {
  rdsp: "RDSP",
  resp: "RESP",
  rrsp: "RRSP",
  tfsa: "TFSA",
  fhsa: "FHSA",
};

/** Ordered tab items for the /services bar, built from published CMS content. */
export async function getServiceTabs(): Promise<TabItem[]> {
  const pages = await getPublishedServicePages();
  const rank = (group: string) => {
    const i = CATEGORY_ORDER.indexOf(group);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return pages
    .map((p, order) => ({ p, order }))
    .sort((a, b) => rank(a.p.group) - rank(b.p.group) || a.order - b.order)
    .map(({ p }) => ({
      slug: p.slug,
      label: SHORT_LABEL[p.slug] ?? p.breadcrumbLabel,
      category: p.group,
    }));
}
