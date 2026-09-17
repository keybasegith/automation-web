import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/insights/registry", () => ({ getPublishedArticles: async () => [
  { slug: "verified-article", publishedAt: "2026-08-01", modifiedAt: "2026-08-09" },
  { slug: "undated-article", publishedAt: "invalid" },
] }));
vi.mock("@/lib/cms/public", () => ({ getVisiblePublishedRoles: async () => [] }));
vi.mock("@/lib/people/leadership", () => ({ getLeadershipProfiles: async () => [] }));
vi.mock("@/lib/auth/session", () => ({ requestHasValidSession: () => false }));

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { canonical, pageMetadata, siteRobots } from "./metadata";
import { isIndexableDeployment, PRODUCTION_ORIGIN } from "./deployment";
import { SERVICE_SLUGS, LEGACY_REDIRECTS, canonicalPublicHref } from "./public-paths";
import { SERVICE_BODIES } from "@/components/services/bodies";
import { isInternalPath } from "./routes";
import config from "@/next.config";
import { proxy } from "@/proxy";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", PRODUCTION_ORIGIN);
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("SITE_DEPLOYMENT_ENV", "");
  vi.stubEnv("SEO_INDEXING_ENABLED", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("deployment indexing", () => {
  it.each(["preview", "development"])("blocks %s even with the production canonical origin", async (env) => {
    vi.stubEnv("VERCEL_ENV", env);
    expect(isIndexableDeployment()).toBe(false);
    expect(siteRobots().robots).toMatchObject({ index: false, follow: false });
    expect(robots().sitemap).toBeUndefined();
    expect(await sitemap()).toEqual([]);
    expect(canonical("/rrsp").alternates?.canonical).toBe(`${PRODUCTION_ORIGIN}/rrsp`);
  });
  it("requires explicit production mode on other hosting", () => {
    vi.stubEnv("VERCEL_ENV", "");
    expect(isIndexableDeployment()).toBe(false);
    vi.stubEnv("SITE_DEPLOYMENT_ENV", "production");
    expect(isIndexableDeployment()).toBe(true);
    vi.stubEnv("SEO_INDEXING_ENABLED", "false");
    expect(isIndexableDeployment()).toBe(false);
  });
  it("rejects missing and staging origins", () => {
    for (const origin of ["", "https://automation-web-red.vercel.app", "https://example.com"]) {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
      expect(isIndexableDeployment()).toBe(false);
    }
  });
  it("lets production public pages be indexed and keeps internal paths blocked", () => {
    expect(siteRobots().robots).toMatchObject({ index: true });
    expect(robots().sitemap).toBe(`${PRODUCTION_ORIGIN}/sitemap.xml`);
    expect(robots().rules).toEqual(expect.arrayContaining([expect.objectContaining({userAgent: "OAI-SearchBot", disallow: expect.arrayContaining(["/dashboard", "/api/"])})]));
    expect(proxy(new NextRequest("https://automation-web-red.vercel.app/rrsp")).headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(proxy(new NextRequest(`${PRODUCTION_ORIGIN}/dashboard`)).headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(proxy(new NextRequest(`${PRODUCTION_ORIGIN}/rrsp`)).headers.get("x-robots-tag")).toBeNull();
  });
});

describe("canonical routes", () => {
  it("keeps the route registry in sync with every service component", () => {
    expect([...SERVICE_SLUGS].sort()).toEqual(Object.keys(SERVICE_BODIES).sort());
  });
  it("uses 301 aliases with direct existing destinations and no loops", async () => {
    const rules = await config.redirects!();
    for (const [source, destination] of Object.entries({...LEGACY_REDIRECTS, ...Object.fromEntries(SERVICE_SLUGS.map((s) => [`/services/${s}`, `/${s}`]))})) {
      for (const path of [source, `${source}/`]) expect(rules).toContainEqual({source: path, destination, statusCode: 301});
      expect(source).not.toBe(destination);
      expect(LEGACY_REDIRECTS[destination]).toBeUndefined();
    }
  });
  it("normalizes public slash/host variants in one hop and retains the query", () => {
    const res = proxy(new NextRequest("https://keybase.com/rrsp/?source=test"));
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe(`${PRODUCTION_ORIGIN}/rrsp?source=test`);
  });
  it("normalizes local CMS links but leaves external links alone", () => {
    expect(canonicalPublicHref("/services/rrsp/?x=1#faq")).toBe("/rrsp?x=1#faq");
    expect(canonicalPublicHref("https://other.example/services/rrsp/")).toBe("https://other.example/services/rrsp/");
    expect(canonicalPublicHref("/services/unknown")).toBe("/services/unknown");
  });
  it("builds route-specific share metadata using the canonical destination", () => {
    const m = pageMetadata("/services/rrsp", "RRSP | Keybase", "Retirement savings");
    expect(m.alternates?.canonical).toBe(`${PRODUCTION_ORIGIN}/rrsp`);
    expect(m.openGraph).toMatchObject({url: `${PRODUCTION_ORIGIN}/rrsp`, locale: "en_CA", title: "RRSP | Keybase"});
    expect(m.twitter).toMatchObject({card: "summary_large_image"});
  });
});

describe("sitemap", () => {
  it("lists only unique public destinations", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const slug of SERVICE_SLUGS) expect(urls).toContain(`${PRODUCTION_ORIGIN}/${slug}`);
    for (const url of urls) {
      expect(isInternalPath(new URL(url).pathname)).toBe(false);
      expect(url).not.toContain("/services/");
      expect(new URL(url).origin).toBe(PRODUCTION_ORIGIN);
    }
  });
  it("does not invent modification dates", async () => {
    const entries = await sitemap();
    expect(entries.find((e) => e.url === `${PRODUCTION_ORIGIN}/rrsp`)?.lastModified).toBeUndefined();
    expect(entries.find((e) => e.url.endsWith("/verified-article"))?.lastModified).toEqual(new Date("2026-08-09"));
    expect(entries.find((e) => e.url.endsWith("/undated-article"))?.lastModified).toBeUndefined();
  });
});
