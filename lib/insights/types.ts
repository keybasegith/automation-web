/**
 * The Keybase insights content model.
 *
 * Article bodies are structured blocks rather than MDX or HTML strings. The
 * repository has no markdown pipeline, and blocks buy three things a string
 * would not: the renderer is a plain server component with no parser
 * dependency, headings can be given stable anchor ids automatically (so the
 * table of contents needs no separate list to maintain), and the shape of an
 * article is type-checked at build rather than discovered at runtime.
 */

import type { PersonId } from "@/lib/people/types";

/**
 * What kind of piece this is. The template adapts: a company announcement gets
 * no reviewer line, no key takeaways, and no educational disclaimer, while an
 * explainer about RRSPs gets all three.
 */
export type ArticleKind =
  | "educational" // long-form financial education
  | "market" // market or economic commentary
  | "company-news" // Keybase announcements
  | "external"; // third-party coverage, linked out — never reproduced

export interface ArticleSource {
  /** The publishing body, e.g. "Canada Revenue Agency". */
  label: string;
  /** The document title being cited. */
  title: string;
  /**
   * Optional. Omit rather than guess: a dated release with no permanent link
   * we have verified is still cited correctly as text, where a fabricated URL
   * would send the reader to a 404 and misrepresent the source.
   */
  url?: string;
}

export interface ArticleImage {
  src: string;
  /** Describes the image. Not a place for keywords. */
  alt: string;
  width: number;
  height: number;
}

export interface RelatedService {
  /** Must be a real route on this site. */
  href: string;
  label: string;
  note?: string;
}

/** One unit of article body. Renders to semantic HTML, one block per element. */
export type ArticleBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "table"; caption?: string; columns: string[]; rows: string[][] }
  | { type: "callout"; title?: string; text: string }
  | { type: "quote"; text: string; attribution?: string };

export interface InsightArticle {
  /** Lowercase, hyphenated, descriptive, and stable once published. */
  slug: string;
  kind: ArticleKind;
  /** Must be one of the categories in `CATEGORIES`. */
  category: string;
  title: string;
  /**
   * One or two sentences. Used on listing cards, and as the article deck when
   * no `deck` of its own is written.
   */
  excerpt: string;
  /**
   * The standfirst printed under the headline, when the piece wants different
   * words there from the ones that sell it on a card.
   */
  deck?: string;
  /** Overrides the category line above the headline, e.g. a series name. */
  eyebrow?: string;

  /** ISO 8601 date, e.g. "2026-06-22". Never a display string. */
  publishedAt: string;
  modifiedAt?: string;
  /** When a qualified reviewer last checked the piece. */
  reviewedAt?: string;

  /**
   * Who wrote it, as a reference into the people registry — never a loose name
   * string. The name, title, and profile link all resolve from the one person
   * record, so an article can never spell someone's title differently from
   * their own profile.
   */
  authorId?: PersonId;
  /** Only ever set when a named person genuinely reviewed the article. */
  reviewerId?: PersonId;

  heroImage?: ArticleImage;
  /**
   * Dedicated share image. Carried on the model so Open Graph metadata can use
   * it in a later task — nothing reads it yet.
   */
  socialImage?: string;

  /** Three to five factual points. Omit where a piece does not warrant them. */
  keyTakeaways?: string[];

  body: ArticleBlock[];
  sources?: ArticleSource[];
  relatedServices?: RelatedService[];
  /** Curated, not computed. Slugs of other articles. */
  relatedSlugs?: string[];

  /**
   * How the piece is billed where it is promoted rather than listed — the
   * homepage feature. Falls back to the headline and excerpt when absent.
   */
  card?: { title: string; description: string };

  /** Overrides the page <title>. Falls back to "<title> — Keybase…". */
  seoTitle?: string;
  /** Overrides the meta description. Falls back to the excerpt. */
  seoDescription?: string;

  /** External coverage only: where the piece actually lives. */
  externalUrl?: string;
  externalPublisher?: string;

  /**
   * Defaults to true for educational and market pieces, false for company news
   * and external coverage. Set explicitly to override.
   */
  showDisclaimer?: boolean;
}

/**
 * A newsroom item that exists as a headline but has no article behind it yet.
 *
 * Every item currently in the CMS is one of these: a title, a one-sentence
 * excerpt, a date, and a desk byline, with no body. They stay listed exactly as
 * they are today rather than being padded out into article pages, which is the
 * whole point of recording them in this shape.
 */
export interface ArticleStub {
  title: string;
  category: string;
  /** Why it cannot be published as an article yet. */
  missing: string[];
}
