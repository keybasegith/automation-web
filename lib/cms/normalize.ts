import { randomUUID } from "crypto";
import {
  email as vEmail,
  firstError,
  maxLength,
  required,
  safeUrl,
  mediaRef,
} from "@/lib/cms/validation";
import { seedContentPages, seedServicePages } from "@/lib/cms/seeds";
import { randomId } from "@/lib/cms/id";
import type {
  CareersContent,
  ContentPage,
  ContentPagesContent,
  ExecutivesContent,
  FooterColumn,
  FooterContent,
  FooterLink,
  GlobalSettings,
  JobPosting,
  NavChild,
  NavContent,
  NavItem,
  NewsArticle,
  NewsroomContent,
  ServicePageContent,
  ServicePagesContent,
  SocialLink,
} from "@/lib/cms/types";

/**
 * Server-side normalizers: turn an untrusted request payload into a clean,
 * fully-typed content object, or return a human-readable error. This is the
 * real validation gate — the admin UI's checks are only for friendly UX.
 *
 * Each returns `{ value }` on success or `{ error }` on the first problem.
 */

export type NormalizeResult<T> = { value: T } | { error: string };

const asString = (v: unknown): string => (typeof v === "string" ? v : "");
const asBool = (v: unknown): boolean => Boolean(v);
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const SOCIAL_PLATFORMS: SocialLink["platform"][] = [
  "linkedin",
  "x",
  "instagram",
  "youtube",
  "facebook",
  "other",
];

// ---------------------------------------------------------------------------
// Global settings
// ---------------------------------------------------------------------------
export function normalizeGlobalSettings(
  raw: unknown
): NormalizeResult<GlobalSettings> {
  if (typeof raw !== "object" || raw === null) return { error: "Invalid data." };
  const d = raw as Record<string, unknown>;

  const companyName = asString(d.companyName).trim();
  const nameErr = firstError(
    required(companyName, "Company name"),
    maxLength(companyName, 120, "Company name")
  );
  if (nameErr) return { error: nameErr };

  const socialRaw = asArray(d.socialLinks);
  const socialLinks: SocialLink[] = [];
  for (let i = 0; i < socialRaw.length; i++) {
    const s = socialRaw[i] as Record<string, unknown>;
    const label = asString(s?.label).trim();
    const url = asString(s?.url).trim();
    if (!label && !url) continue; // skip empty rows
    const err = firstError(
      required(label, `Social link #${i + 1} label`),
      safeUrl(url, `Social link #${i + 1} URL`),
      required(url, `Social link #${i + 1} URL`)
    );
    if (err) return { error: err };
    const platform = SOCIAL_PLATFORMS.includes(s?.platform as SocialLink["platform"])
      ? (s.platform as SocialLink["platform"])
      : "other";
    socialLinks.push({ platform, label, url });
  }

  const logoUrl = asString(d.logoUrl).trim();
  const primaryCtaUrl = asString(d.primaryCtaUrl).trim();
  const headerAnnouncementUrl = asString(d.headerAnnouncementUrl).trim();
  const generalEmail = asString(d.generalEmail).trim();
  const supportEmail = asString(d.supportEmail).trim();

  const linkErr = firstError(
    mediaRef(logoUrl, "Logo URL"),
    safeUrl(primaryCtaUrl, "Call-to-action link"),
    safeUrl(headerAnnouncementUrl, "Announcement link"),
    mediaRef(asString(d.defaultSocialImage).trim(), "Default social image"),
    vEmail(generalEmail, "General email"),
    vEmail(supportEmail, "Support email")
  );
  if (linkErr) return { error: linkErr };

  return {
    value: {
      companyName,
      logoUrl,
      logoAlt: asString(d.logoAlt).trim() || companyName,
      address: asString(d.address).trim(),
      phone: asString(d.phone).trim(),
      generalEmail,
      supportEmail,
      socialLinks,
      copyrightText:
        asString(d.copyrightText).trim() ||
        "© {year} " + companyName + ". All rights reserved.",
      footerDescription: asString(d.footerDescription).trim(),
      defaultSeoTitle: asString(d.defaultSeoTitle).trim() || companyName,
      defaultSeoDescription: asString(d.defaultSeoDescription).trim(),
      defaultSocialImage: asString(d.defaultSocialImage).trim(),
      headerAnnouncement: asString(d.headerAnnouncement).trim(),
      headerAnnouncementUrl,
      primaryCtaLabel: asString(d.primaryCtaLabel).trim(),
      primaryCtaUrl,
    },
  };
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
function normalizeLinkList(
  raw: unknown,
  context: string
): NormalizeResult<FooterLink[]> {
  const out: FooterLink[] = [];
  const list = asArray(raw);
  for (let i = 0; i < list.length; i++) {
    const l = list[i] as Record<string, unknown>;
    const label = asString(l?.label).trim();
    const url = asString(l?.url).trim();
    if (!label && !url) continue;
    const err = firstError(
      required(label, `${context} link #${i + 1} label`),
      required(url, `${context} link #${i + 1} link`),
      safeUrl(url, `${context} link #${i + 1} link`)
    );
    if (err) return { error: err };
    out.push({ label, url, openInNewTab: asBool(l?.openInNewTab) });
  }
  return { value: out };
}

export function normalizeFooter(raw: unknown): NormalizeResult<FooterContent> {
  if (typeof raw !== "object" || raw === null) return { error: "Invalid data." };
  const d = raw as Record<string, unknown>;

  const columns: FooterColumn[] = [];
  const cols = asArray(d.columns);
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i] as Record<string, unknown>;
    const heading = asString(c?.heading).trim();
    const hErr = required(heading, `Footer column #${i + 1} heading`);
    if (!hErr.ok) return { error: hErr.message };
    const links = normalizeLinkList(c?.links, `Column "${heading}"`);
    if ("error" in links) return links;
    columns.push({ heading, links: links.value });
  }

  const legal = normalizeLinkList(d.legalLinks, "Legal");
  if ("error" in legal) return legal;

  return { value: { columns, legalLinks: legal.value } };
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
function normalizeNavChildren(
  raw: unknown,
  context: string
): NormalizeResult<NavChild[]> {
  const out: NavChild[] = [];
  const list = asArray(raw);
  for (let i = 0; i < list.length; i++) {
    const c = list[i] as Record<string, unknown>;
    const label = asString(c?.label).trim();
    const url = asString(c?.url).trim();
    if (!label && !url) continue;
    const err = firstError(
      required(label, `${context} item #${i + 1} label`),
      required(url, `${context} item #${i + 1} link`),
      safeUrl(url, `${context} item #${i + 1} link`)
    );
    if (err) return { error: err };
    out.push({
      label,
      url,
      openInNewTab: asBool(c?.openInNewTab),
      isVisible: c?.isVisible === undefined ? true : asBool(c?.isVisible),
    });
  }
  return { value: out };
}

export function normalizeNavigation(raw: unknown): NormalizeResult<NavContent> {
  if (typeof raw !== "object" || raw === null) return { error: "Invalid data." };
  const d = raw as Record<string, unknown>;

  const items: NavItem[] = [];
  const list = asArray(d.items);
  for (let i = 0; i < list.length; i++) {
    const it = list[i] as Record<string, unknown>;
    const label = asString(it?.label).trim();
    const lErr = required(label, `Menu item #${i + 1} label`);
    if (!lErr.ok) return { error: lErr.message };
    const url = asString(it?.url).trim();
    const uErr = safeUrl(url, `Menu item "${label}" link`);
    if (!uErr.ok) return { error: uErr.message };
    const isServicesMega = asBool(it?.isServicesMega);
    const children = isServicesMega
      ? { value: [] as NavChild[] }
      : normalizeNavChildren(it?.children, `"${label}"`);
    if ("error" in children) return children;
    items.push({
      label,
      url,
      openInNewTab: asBool(it?.openInNewTab),
      isVisible: it?.isVisible === undefined ? true : asBool(it?.isVisible),
      isServicesMega,
      children: children.value,
    });
  }

  const utility = normalizeNavChildren(d.utilityLinks, "Utility bar");
  if ("error" in utility) return utility;

  return { value: { items, utilityLinks: utility.value } };
}

// ---------------------------------------------------------------------------
// Executives
// ---------------------------------------------------------------------------
export function normalizeExecutives(
  raw: unknown
): NormalizeResult<ExecutivesContent> {
  if (typeof raw !== "object" || raw === null) return { error: "Invalid data." };
  const d = raw as Record<string, unknown>;
  const list = asArray(d.people);

  const people = [];
  for (let i = 0; i < list.length; i++) {
    const p = list[i] as Record<string, unknown>;
    const name = asString(p?.name).trim();
    const title = asString(p?.title).trim();
    const err = firstError(
      required(name, `Person #${i + 1} name`),
      required(title, `${name || `Person #${i + 1}`} title`)
    );
    if (err) return { error: err };

    const href = asString(p?.href).trim();
    const hrefErr = safeUrl(href, `${name}'s link`);
    if (!hrefErr.ok) return { error: hrefErr.message };

    const paragraphs = asArray(p?.paragraphs)
      .map((x) => asString(x).trim())
      .filter(Boolean);

    const photoUrl = asString(p?.photoUrl).trim();
    const photoClass = asString(p?.photoClass).trim();

    people.push({
      id: typeof p?.id === "string" && p.id ? p.id : randomUUID(),
      name,
      title,
      lead: asString(p?.lead).trim(),
      paragraphs,
      photoUrl: photoUrl || null,
      photoClass: photoClass || null,
      comingSoon: asBool(p?.comingSoon),
      ceoMessage: asBool(p?.ceoMessage),
      href: href || null,
      isVisible: p?.isVisible === undefined ? true : asBool(p?.isVisible),
    });
  }

  return { value: { people } };
}

// ---------------------------------------------------------------------------
// Service pages
// ---------------------------------------------------------------------------

/** The known slugs — the admin can edit these pages but not add/remove them. */
const SERVICE_SLUGS = new Set(seedServicePages().pages.map((p) => p.slug));
const SERVICE_GROUP: Record<string, string> = Object.fromEntries(
  seedServicePages().pages.map((p) => [p.slug, p.group])
);

export function normalizeServicePages(
  raw: unknown
): NormalizeResult<ServicePagesContent> {
  if (typeof raw !== "object" || raw === null) return { error: "Invalid data." };
  const list = asArray((raw as Record<string, unknown>).pages);

  const pages: ServicePageContent[] = [];
  for (let i = 0; i < list.length; i++) {
    const p = list[i] as Record<string, unknown>;
    const slug = asString(p?.slug).trim();
    // Ignore unknown slugs — pages are a fixed set defined by the site.
    if (!SERVICE_SLUGS.has(slug)) continue;

    const heading = asString(p?.heading).trim();
    const intro = asString(p?.intro).trim();
    const name = asString(p?.breadcrumbLabel).trim();
    const err = firstError(
      required(heading, `${name || slug} heading`),
      required(intro, `${name || slug} intro`),
      maxLength(asString(p?.seoTitle), 200, `${name || slug} SEO title`),
      maxLength(asString(p?.seoDescription), 400, `${name || slug} SEO description`),
      mediaRef(asString(p?.heroImage).trim(), `${name || slug} hero image`),
      safeUrl(asString(p?.ctaUrl).trim(), `${name || slug} button link`)
    );
    if (err) return { error: err };

    pages.push({
      slug,
      group: SERVICE_GROUP[slug],
      eyebrow: asString(p?.eyebrow).trim(),
      breadcrumbLabel: name,
      heading,
      intro,
      heroImage: asString(p?.heroImage).trim(),
      ctaLabel: asString(p?.ctaLabel).trim(),
      ctaUrl: asString(p?.ctaUrl).trim(),
      seoTitle: asString(p?.seoTitle).trim(),
      seoDescription: asString(p?.seoDescription).trim(),
    });
  }

  return { value: { pages } };
}

// ---------------------------------------------------------------------------
// Careers (open positions)
// ---------------------------------------------------------------------------
function normalizeHero(raw: unknown): { eyebrow: string; heading: string; intro: string } {
  const h = (raw ?? {}) as Record<string, unknown>;
  return {
    eyebrow: asString(h.eyebrow).trim(),
    heading: asString(h.heading).trim(),
    intro: asString(h.intro).trim(),
  };
}

export function normalizeCareers(raw: unknown): NormalizeResult<CareersContent> {
  if (typeof raw !== "object" || raw === null) return { error: "Invalid data." };
  const d = raw as Record<string, unknown>;
  const list = asArray(d.roles);

  const roles: JobPosting[] = [];
  for (let i = 0; i < list.length; i++) {
    const r = list[i] as Record<string, unknown>;
    const title = asString(r?.title).trim();
    const err = firstError(
      required(title, `Position #${i + 1} title`),
      maxLength(asString(r?.description), 1000, `${title || `Position #${i + 1}`} description`)
    );
    if (err) return { error: err };
    roles.push({
      id: typeof r?.id === "string" && r.id ? r.id : randomId(),
      title,
      department: asString(r?.department).trim(),
      location: asString(r?.location).trim(),
      type: asString(r?.type).trim(),
      description: asString(r?.description).trim(),
      isVisible: r?.isVisible === undefined ? true : asBool(r?.isVisible),
    });
  }

  return { value: { hero: normalizeHero(d.hero), roles } };
}

// ---------------------------------------------------------------------------
// Newsroom (articles)
// ---------------------------------------------------------------------------
export function normalizeNewsroom(raw: unknown): NormalizeResult<NewsroomContent> {
  if (typeof raw !== "object" || raw === null) return { error: "Invalid data." };
  const d = raw as Record<string, unknown>;
  const list = asArray(d.articles);

  const articles: NewsArticle[] = [];
  for (let i = 0; i < list.length; i++) {
    const a = list[i] as Record<string, unknown>;
    const title = asString(a?.title).trim();
    const err = firstError(
      required(title, `Article #${i + 1} title`),
      maxLength(asString(a?.excerpt), 600, `${title || `Article #${i + 1}`} summary`)
    );
    if (err) return { error: err };
    articles.push({
      id: typeof a?.id === "string" && a.id ? a.id : randomId(),
      category: asString(a?.category).trim() || "Firm News",
      title,
      excerpt: asString(a?.excerpt).trim(),
      date: asString(a?.date).trim(),
      author: asString(a?.author).trim(),
      isVisible: a?.isVisible === undefined ? true : asBool(a?.isVisible),
    });
  }

  return { value: { hero: normalizeHero(d.hero), articles } };
}

// ---------------------------------------------------------------------------
// Content pages (About, CEO Message) — fixed slugs, hero + SEO
// ---------------------------------------------------------------------------
const CONTENT_SLUGS = new Set(seedContentPages().pages.map((p) => p.slug));
const CONTENT_LABEL: Record<string, string> = Object.fromEntries(
  seedContentPages().pages.map((p) => [p.slug, p.label])
);

export function normalizeContentPages(
  raw: unknown
): NormalizeResult<ContentPagesContent> {
  if (typeof raw !== "object" || raw === null) return { error: "Invalid data." };
  const list = asArray((raw as Record<string, unknown>).pages);

  const pages: ContentPage[] = [];
  for (let i = 0; i < list.length; i++) {
    const p = list[i] as Record<string, unknown>;
    const slug = asString(p?.slug).trim();
    if (!CONTENT_SLUGS.has(slug)) continue;
    const heading = asString(p?.heading).trim();
    const err = firstError(
      required(heading, `${CONTENT_LABEL[slug]} heading`),
      maxLength(asString(p?.seoTitle), 200, `${CONTENT_LABEL[slug]} SEO title`),
      maxLength(asString(p?.seoDescription), 400, `${CONTENT_LABEL[slug]} SEO description`)
    );
    if (err) return { error: err };
    pages.push({
      slug,
      label: CONTENT_LABEL[slug],
      eyebrow: asString(p?.eyebrow).trim(),
      heading,
      intro: asString(p?.intro).trim(),
      seoTitle: asString(p?.seoTitle).trim(),
      seoDescription: asString(p?.seoDescription).trim(),
    });
  }

  return { value: { pages } };
}
