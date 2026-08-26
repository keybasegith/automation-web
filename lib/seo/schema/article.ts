import { compact, entityReference, type SchemaNode } from "./types";
import { entityId } from "../siteUrl";
import { buildPerson, type PersonInput } from "./person";

export interface ArticleInput {
  headline: string;
  description?: string;
  /** ISO 8601. Never synthesised from a display string or a build timestamp. */
  datePublished?: string;
  dateModified?: string;
  author?: PersonInput | { name: string };
  /** For editorial review bylines, where the site records one. */
  reviewedBy?: PersonInput | { name: string };
  /** Absolute image URL. */
  image?: string;
  /** Absolute canonical URL of the article itself. */
  url?: string;
  publisher?: { name: string; idFragment?: string };
  /** "Article" for corporate news, "BlogPosting" for editorial posts. */
  type?: "Article" | "BlogPosting";
}

/**
 * An `Article` / `BlogPosting` node for the newsroom rebuild.
 *
 * Returns `null` unless the two properties that make an article an article are
 * both present: a headline and a real publication date. The current newsroom is
 * a card listing whose dates are free-form display strings ("2026.06.22") with
 * no article pages behind them, so nothing on the site can call this yet — by
 * design. When articles gain their own routes and ISO dates, they can.
 */
export function buildArticle(input: ArticleInput): SchemaNode | null {
  if (!input.headline?.trim() || !input.datePublished?.trim()) return null;

  return compact({
    "@type": input.type ?? "Article",
    headline: input.headline,
    description: input.description,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: input.author ? personOrName(input.author) : undefined,
    reviewedBy: input.reviewedBy ? personOrName(input.reviewedBy) : undefined,
    image: input.image,
    url: input.url,
    mainEntityOfPage: input.url,
    publisher: input.publisher
      ? entityReference(
          "Organization",
          input.publisher.name,
          input.publisher.idFragment ? entityId(input.publisher.idFragment) : undefined,
        )
      : undefined,
  });
}

function personOrName(value: PersonInput | { name: string }): SchemaNode {
  return buildPerson(value as PersonInput);
}
