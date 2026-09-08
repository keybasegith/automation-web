/**
 * Citation validation — the security boundary between a generated answer and
 * a link a reader will click.
 *
 * The model never sees a URL, so it cannot return one. What it returns is a
 * list of opaque handles, and every one of them is checked here against the
 * sources retrieval actually supplied. An id that was not supplied is dropped;
 * it is not looked up, corrected, or guessed at. Only after that check does the
 * server attach the real title, URL, and publication date from the index.
 *
 * The invariant, stated plainly: no href rendered by this feature was ever
 * produced by a language model.
 */

import type {
  AnswerSection,
  AnswerSource,
  RelatedInsight,
  RetrievedSource,
} from "@/lib/keybase-answer/types";
import type { GeneratedAnswer } from "@/lib/keybase-answer/schemas";

export interface ValidatedCitations {
  /** Sources actually cited, renumbered 1..n in order of first appearance. */
  sources: AnswerSource[];
  /** Sections with unsupported ids stripped out. */
  sections: AnswerSection[];
  /** Further reading — retrieved, never invented. */
  relatedInsights: RelatedInsight[];
  /** Ids the model produced that retrieval never supplied. Logged, not shown. */
  hallucinatedIds: string[];
}

export function validateCitations(
  answer: GeneratedAnswer,
  retrieved: RetrievedSource[],
): ValidatedCitations {
  const byId = new Map(retrieved.map((source) => [source.id, source]));
  const hallucinated = new Set<string>();

  const keep = (ids: string[]): string[] => {
    const out: string[] = [];
    for (const id of ids) {
      if (byId.has(id)) {
        if (!out.includes(id)) out.push(id);
      } else {
        hallucinated.add(id);
      }
    }
    return out;
  };

  const sections: AnswerSection[] = answer.sections.map((section) => ({
    heading: section.heading,
    body: section.body,
    sourceIds: keep(section.sourceIds),
  }));

  // Order of first appearance, so [1] is the first source the reader meets.
  const ordered: string[] = [];
  const add = (id: string) => {
    if (byId.has(id) && !ordered.includes(id)) ordered.push(id);
  };
  for (const section of sections) for (const id of section.sourceIds) add(id);
  for (const id of keep(answer.sourceIds)) add(id);

  const sources: AnswerSource[] = ordered.map((id, i) => {
    const source = byId.get(id) as RetrievedSource;
    return {
      id,
      title: source.title,
      url: source.canonicalUrl,
      category: source.category,
      contentType: source.contentType,
      publishedAt: source.publishedAt,
      marker: i + 1,
    };
  });

  /**
   * Further reading is drawn from what retrieval found, whether or not the
   * model nominated it. Asking a model which Keybase articles exist is exactly
   * the question it would answer plausibly and wrongly.
   */
  const cited = new Set(ordered);
  const nominated = keep(answer.relatedSourceIds).filter((id) => !cited.has(id));
  const fallback = retrieved
    .map((source) => source.id)
    .filter((id) => !cited.has(id) && !nominated.includes(id));

  const relatedInsights: RelatedInsight[] = [...nominated, ...fallback]
    .slice(0, 3)
    .map((id) => {
      const source = byId.get(id) as RetrievedSource;
      return {
        title: source.title,
        url: source.canonicalUrl,
        category: source.category,
        publishedAt: source.publishedAt,
      };
    });

  return {
    sources,
    sections,
    relatedInsights,
    hallucinatedIds: [...hallucinated],
  };
}

/**
 * Rewrite the bare ids a model sometimes leaves in prose ("as SRC_002 notes")
 * into reader-facing markers, and delete any that refer to nothing. Readers
 * should never see an internal handle, and never a marker with no source.
 */
export function applyInlineMarkers(
  text: string,
  sources: AnswerSource[],
): string {
  const markers = new Map(sources.map((source) => [source.id, source.marker]));
  return text
    .replace(/\[?\b(SRC_\d{3})\b\]?/g, (_, id: string) => {
      const marker = markers.get(id);
      return marker ? `[${marker}]` : "";
    })
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
