/**
 * The contract with the model.
 *
 * Answers come back as JSON against the schema below (OpenAI Structured
 * Outputs, `strict: true`), never as prose to be parsed with regular
 * expressions. Two things follow from that: the shape of an answer is
 * guaranteed before any of it is rendered, and citations arrive as a list of
 * ids that can be checked against what retrieval actually supplied — which is
 * the whole basis of the citation guarantee.
 *
 * `parseGeneratedAnswer` re-validates on arrival anyway. Structured Outputs is
 * a strong guarantee, not a reason to trust a network payload unread.
 */

export interface GeneratedSection {
  heading: string;
  body: string;
  sourceIds: string[];
}

export interface GeneratedAnswer {
  status: "success" | "insufficient_evidence" | "restricted";
  summary: string;
  sections: GeneratedSection[];
  sourceIds: string[];
  relatedSourceIds: string[];
  relatedQuestions: string[];
  insufficientEvidence: boolean;
  personalizedAdviceRequest: boolean;
}

/** Name the provider records the schema under. Part of the prompt version. */
export const ANSWER_SCHEMA_NAME = "keybase_financial_answer";

/**
 * `strict: true` requires every property to be listed in `required` and
 * `additionalProperties: false` on every object — including the nested ones.
 */
export const ANSWER_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "status",
    "summary",
    "sections",
    "sourceIds",
    "relatedSourceIds",
    "relatedQuestions",
    "insufficientEvidence",
    "personalizedAdviceRequest",
  ],
  properties: {
    status: {
      type: "string",
      enum: ["success", "insufficient_evidence", "restricted"],
      description:
        "success when the supplied sources support an answer; insufficient_evidence when they do not; restricted when the question asks for individualized advice.",
    },
    summary: {
      type: "string",
      description:
        "Two to four sentences answering the question directly, in plain institutional prose. No heading, no preamble, no bullet points.",
    },
    sections: {
      type: "array",
      description:
        "Zero to five supporting sections. Use them when the answer has genuinely distinct parts; omit them for a short factual answer.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "body", "sourceIds"],
        properties: {
          heading: {
            type: "string",
            description:
              "Two or three words, sentence case, naming what this section covers.",
          },
          body: {
            type: "string",
            description:
              "One or two short paragraphs. Plain prose; no markdown syntax.",
          },
          sourceIds: {
            type: "array",
            description: "Supplied source ids supporting this section.",
            items: { type: "string" },
          },
        },
      },
    },
    sourceIds: {
      type: "array",
      description:
        "Every supplied source id the answer relies on. Only ids from the supplied list.",
      items: { type: "string" },
    },
    relatedSourceIds: {
      type: "array",
      description:
        "Supplied source ids that are relevant further reading but were not relied on.",
      items: { type: "string" },
    },
    relatedQuestions: {
      type: "array",
      description:
        "At most three follow-up questions that the supplied sources could also answer.",
      items: { type: "string" },
    },
    insufficientEvidence: {
      type: "boolean",
      description:
        "True when the supplied sources do not support a reliable answer.",
    },
    personalizedAdviceRequest: {
      type: "boolean",
      description:
        "True when the question asks what this particular reader should do with their money.",
    },
  },
} as const;

/**
 * The strings out of a list, ignoring anything else in it.
 *
 * Filtering per element rather than rejecting the whole array: a stray null
 * beside three real source ids should cost the null, not the citations.
 * Nothing is trusted by being kept here — every id is still checked against
 * what retrieval supplied before it becomes a link.
 */
function strings(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, limit);
}

export class AnswerShapeError extends Error {}

/**
 * Validate and normalize a model response. Throws {@link AnswerShapeError} when
 * the payload is not usable; the caller turns that into the generic failure
 * state rather than showing a half-formed answer.
 */
export function parseGeneratedAnswer(raw: unknown): GeneratedAnswer {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new AnswerShapeError("response was not a JSON object");
  }
  const value = raw as Record<string, unknown>;

  const status =
    value.status === "insufficient_evidence" || value.status === "restricted"
      ? value.status
      : "success";

  const summary = typeof value.summary === "string" ? value.summary.trim() : "";

  const sections: GeneratedSection[] = Array.isArray(value.sections)
    ? value.sections
        .filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null && !Array.isArray(item),
        )
        .map((item) => ({
          heading: typeof item.heading === "string" ? item.heading.trim() : "",
          body: typeof item.body === "string" ? item.body.trim() : "",
          sourceIds: strings(item.sourceIds, 8),
        }))
        // A section with no body is furniture; drop it rather than render an
        // empty numbered block.
        .filter((section) => section.body.length > 0)
        .slice(0, 5)
    : [];

  const insufficientEvidence =
    value.insufficientEvidence === true || status === "insufficient_evidence";

  if (summary.length === 0 && !insufficientEvidence) {
    throw new AnswerShapeError("response carried no summary");
  }

  return {
    status,
    summary,
    sections,
    sourceIds: strings(value.sourceIds, 12),
    relatedSourceIds: strings(value.relatedSourceIds, 12),
    relatedQuestions: strings(value.relatedQuestions, 3),
    insufficientEvidence,
    personalizedAdviceRequest: value.personalizedAdviceRequest === true,
  };
}
