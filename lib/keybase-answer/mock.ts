/**
 * The development provider.
 *
 * Kept in its own module, imported only behind `isMockMode()`, which is false
 * whenever NODE_ENV is "production" regardless of what the environment says.
 * A deployment missing OPENAI_API_KEY therefore fails; it never quietly serves
 * an answer that was assembled by the code below.
 *
 * What it produces is honestly derived from the retrieved sources — it quotes
 * their passages back and cites them correctly — so the whole pipeline, the
 * citation validator included, is exercised offline. It is not, and does not
 * pretend to be, a synthesis.
 */

import type { GeneratedAnswer } from "@/lib/keybase-answer/schemas";
import type {
  QuestionClassification,
  RetrievedSource,
} from "@/lib/keybase-answer/types";

/** First one or two sentences of a passage, trimmed to a readable length. */
function opening(text: string, maxChars: number): string {
  const body = text.includes("\n\n") ? text.slice(text.indexOf("\n\n") + 2) : text;
  const sentences = body.match(/[^.!?]+[.!?]+/g) ?? [body];
  let out = "";
  for (const sentence of sentences) {
    if (out.length + sentence.length > maxChars) break;
    out += sentence;
  }
  return (out || body.slice(0, maxChars)).trim();
}

function headingFor(source: RetrievedSource, index: number): string {
  const first = source.passages[0] ?? "";
  const line = first.split("\n")[0]?.trim();
  if (line && line.length > 2 && line.length < 60) return line;
  return `Point ${index + 1}`;
}

export function generateMockAnswer(args: {
  question: string;
  sources: RetrievedSource[];
  classification: QuestionClassification;
}): GeneratedAnswer {
  const { sources, classification } = args;

  if (sources.length === 0) {
    return {
      status: "insufficient_evidence",
      summary:
        "Keybase's published material does not cover this question closely enough to answer it reliably.",
      sections: [],
      sourceIds: [],
      relatedSourceIds: [],
      relatedQuestions: [],
      insufficientEvidence: true,
      personalizedAdviceRequest: classification.personalizedAdvice,
    };
  }

  const used = sources.slice(0, 4);
  const summary = [
    classification.personalizedAdvice
      ? "Keybase Answer explains financial concepts rather than making individualized recommendations, so here is the general background Keybase publishes on this topic."
      : "",
    opening(used[0].passages[0] ?? "", 340),
  ]
    .filter(Boolean)
    .join(" ");

  return {
    status: classification.personalizedAdvice ? "restricted" : "success",
    summary,
    sections: used.slice(0, 3).map((source, i) => ({
      heading: headingFor(source, i),
      body: opening(source.passages[0] ?? "", 420),
      sourceIds: [source.id],
    })),
    sourceIds: used.map((source) => source.id),
    relatedSourceIds: sources.slice(4).map((source) => source.id),
    relatedQuestions: [],
    insufficientEvidence: false,
    personalizedAdviceRequest: classification.personalizedAdvice,
  };
}
