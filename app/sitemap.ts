import { getVisiblePublishedRoles } from "@/lib/cms/public";
import { hasJobPage, jobPath } from "@/lib/seo/jobs";
import type { MetadataRoute } from "next";

import { getProfilePeople, profilePath } from "@/lib/people/people";
import { getPublishedArticles } from "@/lib/insights/registry";
import { STATIC_ROUTES, serviceRoutes } from "@/lib/seo/routes";
import { isIndexableDeployment, PRODUCTION_ORIGIN } from "@/lib/seo/deployment";
import { getLeadershipProfiles } from "@/lib/people/leadership";
import { isProfileReady } from "@/lib/people/people";

/**
 * /sitemap.xml — every URL Keybase wants indexed, and only those.
 *
 * Empty until a production domain is configured. A sitemap is a list of
 * absolute URLs, so there is no honest way to write one without knowing the
 * origin; robots.txt is disallowing everything in that state anyway.
 *
 * Three sources, each already the authority for its own set of pages:
 *   - STATIC_ROUTES for the fixed marketing pages,
 *   - SERVICE_BODIES (via serviceRoutes) for the 16 services,
 *   - the people and article registries for profiles and insights.
 *
 * Reading the registries rather than a second hand-kept list is what stops the
 * sitemap drifting: a person whose profile is not yet publishable, or an
 * article still in review, is absent from both the site and this file for the
 * same reason and at the same moment.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = PRODUCTION_ORIGIN;
  if (!isIndexableDeployment()) return [];

  /**
   * The origin is resolved once, at the top, and every URL below is built from
   * that one value. Calling absoluteUrl() per entry would re-read the
   * environment between awaits, so a sitemap built across an async boundary
   * could emit some absolute URLs and some undefined ones in the same document.
   */
  const url = (path: string) =>
    // The root is the bare origin, with no trailing slash, because that is the
    // form Next emits in the homepage's own canonical tag. A sitemap entry that
    // disagreed with the canonical it points at is exactly the kind of split
    // signal this file exists to prevent.
    path === "/" ? base : new URL(path, `${base}/`).toString();


  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: url(path),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));

  /**
   * The standalone /<slug> path only. /services/<slug> renders the same content
   * and canonicals to this URL, so listing both would put a page in the sitemap
   * that its own canonical tag disclaims.
   */
  const services: MetadataRoute.Sitemap = serviceRoutes().map((path) => ({
    url: url(path),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  /** Only people who clear the profile bar — the rest have no page to point at. */
  const profiles = [...getProfilePeople().filter((p) => !p.profileTypes.includes("leadership")), ...(await getLeadershipProfiles())].filter(isProfileReady);
  const people: MetadataRoute.Sitemap = profiles.map((person) => ({
    url: url(profilePath(person.id)),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  /**
   * Article timestamps are real: the newest of the dates the piece itself
   * carries, so a revised or re-reviewed article reports the change instead of
   * every article claiming to have been touched at build time.
   */
  const articles: MetadataRoute.Sitemap = (await getPublishedArticles()).map(
    (article) => ({
      url: url(`/newsroom/${article.slug}`),
      lastModified: articleLastModified(article),
      changeFrequency: "yearly",
      priority: 0.6,
    }),
  );

  const jobs = (await getVisiblePublishedRoles()).filter(j=>hasJobPage(j)).map(job=>({url:url(jobPath(job))}));
  return Array.from(new Map([...jobs, ...staticEntries, ...services, ...people, ...articles].map((entry) => [entry.url, entry])).values());
}

function articleLastModified(article: {
  publishedAt: string;
  modifiedAt?: string;
  reviewedAt?: string;
}): Date | undefined {
  const dates = [article.modifiedAt, article.reviewedAt, article.publishedAt]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()));

  return dates.length
    ? new Date(Math.max(...dates.map((date) => date.getTime())))
    : undefined;
}
