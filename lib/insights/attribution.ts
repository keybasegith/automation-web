import { getByline } from "@/lib/people/people";
import type { PersonByline, PersonId } from "@/lib/people/types";
import { getPublishedArticles } from "./articles";
import type { InsightArticle } from "./types";

/**
 * The join between articles and people.
 *
 * Articles store an id; everything a byline shows — name, title, whether there
 * is a profile to link to — is resolved from the one person record here. That
 * is what stops an article page and a profile page from disagreeing about
 * someone's title, and it is why the relationship only has to be recorded once,
 * on the article.
 *
 * The direction reverses for free: a profile's "Articles written" list is a
 * filter over the same field, not a second list to keep in step.
 */

export function articleAuthor(article: InsightArticle): PersonByline | undefined {
  return getByline(article.authorId);
}

export function articleReviewer(article: InsightArticle): PersonByline | undefined {
  return getByline(article.reviewerId);
}

/** The pieces in `articles` this person wrote. */
export function articlesByAuthor(
  articles: InsightArticle[],
  personId: PersonId,
): InsightArticle[] {
  return articles.filter((article) => article.authorId === personId);
}

/**
 * The pieces in `articles` this person reviewed. An article a person both wrote
 * and reviewed is excluded — a self-review is not a review, and listing it
 * under both headings would overstate what happened.
 */
export function articlesReviewedBy(
  articles: InsightArticle[],
  personId: PersonId,
): InsightArticle[] {
  return articles.filter(
    (article) => article.reviewerId === personId && article.authorId !== personId,
  );
}

/** Published pieces this person wrote, newest first. */
export function getArticlesByAuthor(personId: PersonId): InsightArticle[] {
  return articlesByAuthor(getPublishedArticles(), personId);
}

/** Published pieces this person reviewed, newest first. */
export function getArticlesReviewedBy(personId: PersonId): InsightArticle[] {
  return articlesReviewedBy(getPublishedArticles(), personId);
}
