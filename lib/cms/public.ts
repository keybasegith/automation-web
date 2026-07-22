import { draftMode } from "next/headers";
import { resolveMediaRef } from "@/lib/cms/media/url";
import { readDoc, readPublished } from "@/lib/cms/store";
import type { CmsResource } from "@/lib/cms/types";
import {
  seedCareers,
  seedContentPages,
  seedExecutives,
  seedFooter,
  seedGlobalSettings,
  seedNavigation,
  seedNewsroom,
  seedServicePages,
} from "@/lib/cms/seeds";
import type {
  CareersContent,
  ContentPage,
  ExecutiveItem,
  ExecutivesContent,
  FooterContent,
  GlobalSettings,
  JobPosting,
  NavContent,
  NewsArticle,
  NewsroomContent,
  ServicePageContent,
} from "@/lib/cms/types";

/**
 * Public read layer — the ONLY way the public website reads CMS content.
 *
 * Every function returns the *published* copy (never a draft) and falls back to
 * the seed (today's hardcoded values) if the store can't be read, so a public
 * page can never crash or leak unpublished edits.
 *
 * These read the filesystem, so they run server-side only (call them from
 * server components / route handlers, never from a client component).
 */

/**
 * Whether the current request is an authenticated admin preview (Next Draft
 * Mode). Enabled only via the admin preview route, so the public never sees it.
 */
async function isPreview(): Promise<boolean> {
  try {
    return (await draftMode()).isEnabled;
  } catch {
    return false;
  }
}

/**
 * Read a resource for rendering: the DRAFT copy during an admin preview,
 * otherwise the live published copy. Used by page-content pages so the admin can
 * preview unpublished edits on the real page; global chrome (header/footer) uses
 * readPublished to keep the rest of the site statically renderable.
 */
async function readView<T>(resource: CmsResource, seed: () => T): Promise<T> {
  const doc = await readDoc(resource, seed);
  if (await isPreview()) return doc.draft;
  return doc.published ?? doc.draft;
}

export async function getPublishedGlobalSettings(): Promise<GlobalSettings> {
  const settings = await (async () => {
    try {
      return await readPublished("global-settings", seedGlobalSettings);
    } catch {
      return seedGlobalSettings();
    }
  })();
  return {
    ...settings,
    logoUrl: resolveMediaRef(settings.logoUrl) ?? settings.logoUrl,
    defaultSocialImage:
      resolveMediaRef(settings.defaultSocialImage) ?? settings.defaultSocialImage,
  };
}

export async function getPublishedFooter(): Promise<FooterContent> {
  try {
    return await readPublished("footer", seedFooter);
  } catch {
    return seedFooter();
  }
}

export async function getPublishedNavigation(): Promise<NavContent> {
  try {
    return await readPublished("navigation", seedNavigation);
  } catch {
    return seedNavigation();
  }
}

/** All published executives, in order, including hidden ones. */
export async function getPublishedExecutivesContent(): Promise<ExecutivesContent> {
  const content = await (async () => {
    try {
      return await readPublished("executives", seedExecutives);
    } catch {
      return seedExecutives();
    }
  })();
  return {
    ...content,
    people: content.people.map((p) => ({
      ...p,
      photoUrl: resolveMediaRef(p.photoUrl),
    })),
  };
}

/** Only the executives an admin has marked visible — for the public page. */
export async function getVisiblePublishedExecutives(): Promise<ExecutiveItem[]> {
  const content = await getPublishedExecutivesContent();
  return content.people.filter((p) => p.isVisible);
}

/**
 * Published hero/SEO content for one service page, by slug. Always resolves to a
 * value: the published entry, else the seeded (original) entry, so a service
 * page can render its hero even before any editing. Safe to call from the
 * page's server component and generateMetadata.
 */
export async function getPublishedServicePage(
  slug: string
): Promise<ServicePageContent> {
  const seedEntry = () => {
    const seeded = seedServicePages().pages.find((p) => p.slug === slug);
    if (!seeded) throw new Error(`Unknown service page: ${slug}`);
    return seeded;
  };
  const page = await (async () => {
    try {
      const view = await readView("service-pages", seedServicePages);
      return view.pages.find((p) => p.slug === slug) ?? seedEntry();
    } catch {
      return seedEntry();
    }
  })();
  return { ...page, heroImage: resolveMediaRef(page.heroImage) ?? page.heroImage };
}

/** Careers content (hero + all roles, including hidden). Draft in preview. */
export async function getPublishedCareers(): Promise<CareersContent> {
  try {
    return await readView("careers", seedCareers);
  } catch {
    return seedCareers();
  }
}

/** Only the visible open positions — for the public Careers page. */
export async function getVisiblePublishedRoles(): Promise<JobPosting[]> {
  const content = await getPublishedCareers();
  return content.roles.filter((r) => r.isVisible);
}

/** Newsroom content (hero + all articles, including hidden). Draft in preview. */
export async function getPublishedNewsroom(): Promise<NewsroomContent> {
  try {
    return await readView("newsroom", seedNewsroom);
  } catch {
    return seedNewsroom();
  }
}

/** Only the visible articles — for the public Newsroom page. */
export async function getVisiblePublishedArticles(): Promise<NewsArticle[]> {
  const content = await getPublishedNewsroom();
  return content.articles.filter((a) => a.isVisible);
}

/**
 * Published hero/SEO for a standalone content page (About, CEO Message) by slug.
 * Always resolves to a value (published entry, else seed).
 */
export async function getPublishedContentPage(
  slug: string
): Promise<ContentPage> {
  const seedEntry = () => {
    const seeded = seedContentPages().pages.find((p) => p.slug === slug);
    if (!seeded) throw new Error(`Unknown content page: ${slug}`);
    return seeded;
  };
  try {
    const view = await readView("content-pages", seedContentPages);
    return view.pages.find((p) => p.slug === slug) ?? seedEntry();
  } catch {
    return seedEntry();
  }
}
