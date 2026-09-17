import { relatedServicesFor } from "@/lib/insights/service-links";
import { resolveMediaRef } from "@/lib/cms/media/url";
import type { InsightArticle } from "@/lib/insights/types";
import { CONTENT_TYPES } from "@/lib/content/types";
import type {
  ArticlePayload,
  ContentArticle,
  ContentRevision,
  ContentType,
  ContentUser,
} from "@/lib/content/types";

/**
 * The seam between the CMS and the public website.
 *
 * One function, and it is the whole integration: a stored revision becomes an
 * `InsightArticle`, which is the object the existing Keybase newsroom template
 * has always rendered. There is no second article template, no parallel
 * renderer, and no CMS-specific styling anywhere on the public site — the CMS
 * supplies data, and the template that already exists decides how it looks.
 *
 * Everything below is a mapping. Nothing here makes a presentation decision.
 */

/** A hero image key becomes a URL only here, at render time. */
function heroImage(payload: ArticlePayload): InsightArticle["heroImage"] {
  if (!payload.heroImage) return undefined;
  const src = resolveMediaRef(payload.heroImage.key);
  if (!src) return undefined;
  return {
    src,
    alt: payload.heroImage.alt,
    width: payload.heroImage.width,
    height: payload.heroImage.height,
  };
}

/**
 * The byline.
 *
 * An author with a people-registry record gets `authorId`, and every part of
 * the byline then resolves from that one record — the same as for a corporate
 * article. An advisor without one gets the snapshot stored on the revision.
 * Corporate content types carry no personal byline at all, which is what makes
 * a Keybase Market Perspective read as the firm's view rather than one
 * person's.
 */
function byline(
  payload: ArticlePayload,
  contentType: ContentType,
  owner: ContentUser | null
): Pick<InsightArticle, "authorId" | "authorByline"> {
  if (!CONTENT_TYPES[contentType].advisorAuthored) return {};

  if (owner?.personId) return { authorId: owner.personId };

  const snapshot = payload.authorByline;
  if (!snapshot) return {};

  return {
    authorByline: {
      // The revision id is not a person id; using the author's own account id
      // keeps the byline stable without implying a profile that isn't there.
      id: owner?.id ?? snapshot.name,
      name: snapshot.name,
      role: snapshot.role
        ? `${snapshot.role}, ${snapshot.organization}`
        : snapshot.organization,
      profilePath: snapshot.profilePath,
    },
  };
}

/**
 * Turn a stored revision into the article object the newsroom template renders.
 *
 * `publishedAt` is passed in rather than read off the article, so a preview of
 * an unpublished draft can show the date it WOULD carry instead of an empty
 * byline, and a published article always shows the date it actually went live.
 */
export function toInsightArticle(
  article: Pick<ContentArticle, "slug" | "contentType" | "publishedAt">,
  revision: Pick<ContentRevision, "payload" | "createdAt" | "updatedAt">,
  owner: ContentUser | null,
  options: { previewDate?: string } = {}
): InsightArticle {
  const { payload } = revision;
  const config = CONTENT_TYPES[article.contentType];
  const publishedAt =
    article.publishedAt ?? options.previewDate ?? revision.createdAt;

  return {
    slug: article.slug,
    kind: config.kind,
    category: payload.category || config.category,
    eyebrow: payload.eyebrow || config.eyebrow,
    title: payload.title,
    excerpt: payload.excerpt,
    deck: payload.deck || undefined,

    // The template wants a date, not a timestamp: "2026-08-26".
    publishedAt: publishedAt.slice(0, 10),
    modifiedAt:
      article.publishedAt && revision.updatedAt > article.publishedAt
        ? revision.updatedAt.slice(0, 10)
        : undefined,

    ...byline(payload, article.contentType, owner),

    heroImage: heroImage(payload),
    keyTakeaways: payload.keyTakeaways.length ? payload.keyTakeaways : undefined,
    body: payload.body,
    relatedServices: relatedServicesFor([payload.title,payload.category,...payload.tags].join(" ")),
    sources: payload.sources.length ? payload.sources : undefined,
    additionalDisclosure: payload.additionalDisclosure || undefined,

    seoTitle: payload.seoTitle || undefined,
    seoDescription: payload.seoDescription || undefined,
  };
}
