/**
 * What Keybase Answer is allowed to know.
 *
 * This module is the approval boundary. Nothing reaches the index — and
 * therefore nothing can reach the model — unless it is assembled here, and
 * everything assembled here is content already published on the public
 * website. Client records, advisor files, compliance material, the internal
 * tools under /dashboard and /website-admin-cms, and anything still in draft
 * are excluded structurally rather than by filtering later: the loader reads
 * only published-content APIs, and every path is checked against
 * {@link isIndexablePath} before it is written.
 *
 * Three kinds of source feed it:
 *
 *   1. Published insight articles, from the article registry — the same
 *      published-revision-only view the public newsroom renders, so a draft or
 *      a piece under compliance review is invisible here too.
 *   2. Website CMS records for the service and company pages (published copy).
 *   3. The rendered pages themselves, when an index base URL is configured.
 *      Most of Keybase's financial education is written as React components,
 *      so the page a visitor reads is the only faithful copy of that prose.
 */

import { getPublishedArticles } from "@/lib/insights/articles";
import type { ArticleBlock, InsightArticle } from "@/lib/insights/types";
import { readPublished } from "@/lib/cms/store";
import { seedContentPages, seedServicePages } from "@/lib/cms/seeds";
import type { DocumentSection } from "@/lib/keybase-answer/chunking";
import { extractSections, sectionsToText } from "@/lib/keybase-answer/html-extract";
import type {
  KeybaseKnowledgeDocument,
  KnowledgeSourceKind,
} from "@/lib/keybase-answer/types";

/**
 * Paths that must never be indexed, whatever else happens. Internal tools,
 * authenticated areas, and anything that could hold client information.
 *
 * A denylist alone would be a weak guarantee, which is why the loader also has
 * no code path that reads those areas — this is the belt to that pair of braces.
 */
const EXCLUDED_PREFIXES = [
  "/api",
  "/website-admin-cms",
  "/admin",
  "/dashboard",
  "/content",
  "/login",
  "/onboarding",
  "/people",
  "/profile-",
  "/businesscard-",
  "/net-settlement",
  "/bp-dailysettlement",
  "/discrepancy-detector",
  "/financial-statement-generator",
  "/finance-intelligence",
  "/secure-email-generator",
  "/smart-document-intake",
  "/document-intake",
  "/trivia-game",
  "/world-cup-challenge",
  "/mexico-trip",
  "/sign",
  "/testapi",
  "/tradeshow-booth-connect-qr",
  "/wealth-offering",
  "/bike-fest",
  "/compound-calculator",
];

export function isIndexablePath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.includes("?") || path.includes("#")) return false;
  const lower = path.toLowerCase();
  return !EXCLUDED_PREFIXES.some(
    (prefix) => lower === prefix || lower.startsWith(`${prefix}/`) || lower.startsWith(prefix),
  );
}

/**
 * Public pages worth answering from that are neither articles nor CMS service
 * records — the firm's own description of who it is and what it does. Crawled
 * only; they have no structured record behind them.
 */
const EXTRA_PUBLIC_ROUTES: Array<{
  path: string;
  title: string;
  category: string;
}> = [
  { path: "/about", title: "About Keybase Financial Group", category: "About Keybase" },
  { path: "/ceo-message", title: "A Message from our CEO", category: "About Keybase" },
  { path: "/our-advisors", title: "Our Advisors", category: "About Keybase" },
  { path: "/careers", title: "Careers at Keybase", category: "About Keybase" },
];

/**
 * Deliberately absent from the list above: /key-executives, which is a
 * directory of names and photographs with no prose to retrieve, and
 * /compound-interest, which renders its calculator entirely on the client and
 * therefore serves no readable copy at all. Listing them would report a skip on
 * every index run for pages that will never contribute a passage. If either
 * grows an article's worth of writing, add it back.
 */

/** Why a discovered document did not make it into the index. */
export interface SkippedDocument {
  reference: string;
  reason: string;
}

export interface LoadedDocument {
  document: KeybaseKnowledgeDocument;
  sections: DocumentSection[];
}

/**
 * Drop a section whose text the rest of the document already carries.
 *
 * A service page contributes its CMS summary *and* its rendered copy, and the
 * summary is usually the page's own opening paragraph — so without this, the
 * strongest passage on the page is stored twice, is embedded twice, and can
 * take two of the three passage slots a source is allowed.
 */
function dedupeSections(sections: DocumentSection[]): DocumentSection[] {
  const seen = new Set<string>();
  const key = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();
  const out: DocumentSection[] = [];

  for (const section of sections) {
    const paragraphs = section.paragraphs.filter((paragraph) => {
      const id = key(paragraph);
      if (id.length === 0 || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    if (paragraphs.length > 0) out.push({ ...section, paragraphs });
  }
  return out;
}

export interface LoadResult {
  documents: LoadedDocument[];
  /** Everything considered, indexed or not. */
  discovered: number;
  skipped: SkippedDocument[];
  warnings: string[];
}

export interface LoadOptions {
  /**
   * Origin of a running Keybase site to read rendered pages from, e.g.
   * "http://localhost:3000". Omitted, the loader indexes structured content
   * only and the service pages contribute their CMS summary alone.
   */
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  /** Milliseconds per page fetch. */
  timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Article blocks -> sections
// ---------------------------------------------------------------------------

/** Read a table row-wise, so a retrieved passage keeps its column labels. */
function tableToParagraphs(
  columns: string[],
  rows: string[][],
  caption?: string,
): string[] {
  const out = caption ? [caption] : [];
  for (const row of rows) {
    const pairs = row
      .map((cell, i) => (columns[i] ? `${columns[i]}: ${cell}` : cell))
      .filter(Boolean);
    if (pairs.length > 0) out.push(pairs.join("; "));
  }
  return out;
}

export function blocksToSections(blocks: ArticleBlock[]): DocumentSection[] {
  const sections: DocumentSection[] = [];
  let current: DocumentSection = { paragraphs: [] };

  const push = () => {
    if (current.paragraphs.length > 0 || current.heading) sections.push(current);
  };

  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        push();
        current = { heading: block.text, paragraphs: [] };
        break;
      case "paragraph":
        current.paragraphs.push(block.text);
        break;
      case "list":
        current.paragraphs.push(block.items.map((i) => `- ${i}`).join("\n"));
        break;
      case "table":
        current.paragraphs.push(
          ...tableToParagraphs(block.columns, block.rows, block.caption),
        );
        break;
      case "callout":
        current.paragraphs.push(
          block.title ? `${block.title}: ${block.text}` : block.text,
        );
        break;
      case "quote":
        current.paragraphs.push(
          block.attribution ? `"${block.text}" — ${block.attribution}` : `"${block.text}"`,
        );
        break;
    }
  }
  push();
  return sections.filter((s) => s.paragraphs.length > 0);
}

function articleToDocument(article: InsightArticle): LoadedDocument | null {
  const sections = blocksToSections(article.body);
  if (sections.length === 0) return null;

  // Key takeaways are the article's own summary of itself and retrieve well.
  const lede: DocumentSection = {
    heading: article.title,
    paragraphs: [
      article.deck ?? article.excerpt,
      ...(article.keyTakeaways ?? []),
    ].filter((p): p is string => Boolean(p && p.trim())),
  };

  const all = lede.paragraphs.length > 0 ? [lede, ...sections] : sections;
  return {
    document: {
      id: `insight:${article.slug}`,
      title: article.title,
      slug: article.slug,
      canonicalUrl: `/newsroom/${article.slug}`,
      category: article.category,
      contentType: "insight",
      publishedAt: article.publishedAt,
      updatedAt: article.modifiedAt ?? article.publishedAt,
      body: sectionsToText(all),
      excerpt: article.excerpt,
      isPublic: true,
      isApproved: true,
    },
    sections: all,
  };
}

// ---------------------------------------------------------------------------
// Rendered pages
// ---------------------------------------------------------------------------

async function fetchSections(
  baseUrl: string,
  path: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<DocumentSection[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(new URL(path, baseUrl).toString(), {
      signal: controller.signal,
      headers: { accept: "text/html" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return extractSections(await res.text());
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// The loader
// ---------------------------------------------------------------------------

export async function loadApprovedDocuments(
  options: LoadOptions = {},
): Promise<LoadResult> {
  const { baseUrl, fetchImpl = fetch, timeoutMs = 20_000 } = options;
  const documents: LoadedDocument[] = [];
  const skipped: SkippedDocument[] = [];
  const warnings: string[] = [];
  let discovered = 0;

  const crawl = async (path: string): Promise<DocumentSection[]> => {
    if (!baseUrl) return [];
    try {
      return await fetchSections(baseUrl, path, fetchImpl, timeoutMs);
    } catch (err) {
      warnings.push(
        `could not read ${path}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }
  };

  const accept = (loaded: LoadedDocument) => {
    if (!isIndexablePath(loaded.document.canonicalUrl)) {
      skipped.push({
        reference: loaded.document.canonicalUrl,
        reason: "path is excluded from the public knowledge index",
      });
      return;
    }
    if (!loaded.document.isPublic || !loaded.document.isApproved) {
      skipped.push({
        reference: loaded.document.canonicalUrl,
        reason: "not published and approved",
      });
      return;
    }
    documents.push(loaded);
  };

  // 1. Published insight articles.
  let articles: InsightArticle[] = [];
  try {
    articles = await getPublishedArticles();
  } catch (err) {
    warnings.push(
      `could not read published articles: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  for (const article of articles) {
    discovered += 1;
    const loaded = articleToDocument(article);
    if (!loaded) {
      skipped.push({ reference: article.slug, reason: "article has no body" });
      continue;
    }
    accept(loaded);
  }

  // 2. Service pages: the CMS record, deepened with the rendered page.
  let servicePages: Awaited<ReturnType<typeof readPublished<ReturnType<typeof seedServicePages>>>> | null =
    null;
  try {
    servicePages = await readPublished("service-pages", seedServicePages);
  } catch (err) {
    warnings.push(
      `could not read published service pages: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  for (const page of servicePages?.pages ?? []) {
    discovered += 1;
    const path = `/services/${page.slug}`;
    const crawled = await crawl(path);
    const sections = dedupeSections([
      { heading: page.heading, paragraphs: [page.intro].filter(Boolean) },
      ...crawled,
    ]);

    if (sections.length === 0) {
      skipped.push({ reference: path, reason: "no readable copy on the page" });
      continue;
    }
    accept({
      document: {
        id: `service:${page.slug}`,
        title: page.breadcrumbLabel || page.heading,
        slug: page.slug,
        canonicalUrl: path,
        category: page.group,
        contentType: "service",
        body: sectionsToText(sections),
        excerpt: page.intro,
        isPublic: true,
        isApproved: true,
      },
      sections,
    });
  }

  // 3. Company pages with a CMS record.
  let contentPages: Awaited<ReturnType<typeof readPublished<ReturnType<typeof seedContentPages>>>> | null =
    null;
  try {
    contentPages = await readPublished("content-pages", seedContentPages);
  } catch (err) {
    warnings.push(
      `could not read published company pages: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const companySlugs = new Set<string>();
  for (const page of contentPages?.pages ?? []) {
    discovered += 1;
    companySlugs.add(`/${page.slug}`);
    const path = `/${page.slug}`;
    const crawled = await crawl(path);
    const sections = dedupeSections([
      { heading: page.heading, paragraphs: [page.intro].filter(Boolean) },
      ...crawled,
    ]);
    if (sections.length === 0) {
      skipped.push({ reference: path, reason: "no readable copy on the page" });
      continue;
    }
    accept({
      document: {
        id: `company:${page.slug}`,
        title: page.label || page.heading,
        slug: page.slug,
        canonicalUrl: path,
        category: "About Keybase",
        contentType: "company",
        body: sectionsToText(sections),
        excerpt: page.intro,
        isPublic: true,
        isApproved: true,
      },
      sections,
    });
  }

  // 4. Remaining public pages — crawl only.
  for (const route of EXTRA_PUBLIC_ROUTES) {
    if (companySlugs.has(route.path)) continue;
    discovered += 1;
    if (!baseUrl) {
      skipped.push({
        reference: route.path,
        reason: "no index base URL configured, so the page could not be read",
      });
      continue;
    }
    const sections = dedupeSections(await crawl(route.path));
    if (sections.length === 0) {
      skipped.push({ reference: route.path, reason: "no readable copy on the page" });
      continue;
    }
    accept({
      document: {
        id: `page:${route.path.slice(1)}`,
        title: route.title,
        slug: route.path.slice(1),
        canonicalUrl: route.path,
        category: route.category,
        contentType: "company",
        body: sectionsToText(sections),
        isPublic: true,
        isApproved: true,
      },
      sections,
    });
  }

  return { documents, discovered, skipped, warnings };
}

/** Kinds in descending authority. Used by the ranker. */
export const SOURCE_AUTHORITY: Record<KnowledgeSourceKind, number> = {
  insight: 1,
  service: 0.85,
  company: 0.7,
  newsroom: 0.5,
};
