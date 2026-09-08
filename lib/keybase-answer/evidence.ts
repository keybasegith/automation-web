/**
 * Is there enough here to answer?
 *
 * This is the gate that keeps Keybase Answer from behaving like an unrestricted
 * assistant. If the retrieved Keybase material does not support an answer, the
 * model is never called at all — there is no prompt wording that reliably stops
 * a model filling a gap from memory, so the safe move is not to give it the
 * opportunity.
 *
 * The rule is deliberately not "at least two sources". One authoritative
 * Keybase article that squarely answers the question is better evidence than
 * two that glance off it, so a single source above `strongRelevance` is
 * sufficient on its own; below that, breadth has to make up for depth.
 */

import { getConfig } from "@/lib/keybase-answer/config";
import type { EvidenceVerdict, RetrievedSource } from "@/lib/keybase-answer/types";

export interface EvidenceOptions {
  /** The question asks for the latest position, so old material will not do. */
  freshnessIntent: boolean;
  now?: Date;
}

export function evaluateEvidence(
  sources: RetrievedSource[],
  options: EvidenceOptions,
): EvidenceVerdict {
  const config = getConfig();
  const now = options.now ?? new Date();

  const relevant = sources.filter((source) => source.score >= config.minRelevance);
  if (relevant.length === 0) {
    return { sufficient: false, reason: "no_sources", sources: [] };
  }

  const best = relevant[0];
  const strong = best.score >= config.strongRelevance;

  if (!strong && relevant.length < config.minRelevantSources) {
    return {
      sufficient: false,
      reason:
        sources.length > 0 && relevant.length > 0
          ? "too_few_sources"
          : "below_similarity_threshold",
      sources: relevant,
    };
  }

  /**
   * "What is the latest Bank of Canada rate?" can only be answered from
   * material recent enough to still be current. Undated evergreen pages do not
   * satisfy that — a service page explaining what a policy rate is says nothing
   * about today's.
   */
  if (options.freshnessIntent) {
    const cutoff = now.getTime() - config.freshnessWindowDays * 86_400_000;
    const hasCurrent = relevant.some((source) => {
      if (!source.publishedAt) return false;
      const time = Date.parse(source.publishedAt);
      return !Number.isNaN(time) && time >= cutoff;
    });
    if (!hasCurrent) {
      return { sufficient: false, reason: "no_recent_material", sources: relevant };
    }
  }

  return { sufficient: true, reason: "ok", sources: relevant };
}
