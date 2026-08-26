import { compact, type SchemaNode } from "./types";
import { absoluteUrl } from "../siteUrl";

export interface BreadcrumbCrumb {
  name: string;
  /** Route-relative path, e.g. "/retirement-planning". */
  path: string;
}

/**
 * A `BreadcrumbList` for the trail a page sits in.
 *
 * Returns `null` until a production domain is configured. Breadcrumb items are
 * identified by URL, and a trail built on a deploy-preview host would tell
 * search engines that a page's permanent position lives at a temporary address.
 * Emitting nothing is the correct behaviour; once NEXT_PUBLIC_SITE_URL is set,
 * every caller starts producing valid schema with no further change.
 *
 * The visible breadcrumbs on the service pages, the CEO message, and the
 * leadership page are unchanged — this consumes the same name/path pairs they
 * already display, so a future refactor can drive both from one source.
 */
export function buildBreadcrumbs(crumbs: BreadcrumbCrumb[]): SchemaNode | null {
  if (crumbs.length === 0) return null;

  const items = crumbs.map((crumb, i) =>
    compact({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    }),
  );

  // Every crumb but the last needs a resolvable item URL to be useful.
  const resolvable = items.slice(0, -1).every((item) => item.item);
  if (!resolvable) return null;

  return { "@type": "BreadcrumbList", itemListElement: items };
}
