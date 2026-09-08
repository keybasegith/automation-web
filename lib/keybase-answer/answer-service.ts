/**
 * The answer pipeline.
 *
 * One function, in one order, from a validated question to a rendered result:
 *
 *   normalize -> cache -> classify -> retrieve -> rank -> weigh the evidence
 *   -> (stop here unless it holds up) -> ground the prompt -> generate
 *   -> validate the shape -> validate the citations -> resolve real URLs
 *   -> cache -> record what happened
 *
 * The stop in the middle is the important part. Three paths never reach the
 * model at all — a question with nothing financial in it, a question Keybase
 * has not published on, and a request for individual recommendations with no
 * educational material behind it — because the reliable way to stop a model
 * answering from memory is not to ask it.
 *
 * Progress is reported through `onStage` as each stage is actually entered.
 * Nothing here announces work that has not begun.
 */

import { randomUUID } from "node:crypto";
import { ANSWER_DISCLAIMER, getConfig, isMockMode } from "@/lib/keybase-answer/config";
import {
  buildCacheKey,
  cacheExpiry,
  readCachedAnswer,
  writeCachedAnswer,
} from "@/lib/keybase-answer/cache";
import { classifyQuestion } from "@/lib/keybase-answer/classify-question";
import {
  applyInlineMarkers,
  validateCitations,
} from "@/lib/keybase-answer/citation-validator";
import { evaluateEvidence } from "@/lib/keybase-answer/evidence";
import {
  INSUFFICIENT_EVIDENCE_SUMMARY,
  OUT_OF_SCOPE_EXAMPLES,
  OUT_OF_SCOPE_SUMMARY,
  PERSONALIZED_ADVICE_ONLY_SUMMARY,
  PERSONALIZED_ADVICE_SUMMARY,
  STALE_EVIDENCE_SUMMARY,
  redactForLogs,
} from "@/lib/keybase-answer/guardrails";
import { generateFinancialAnswer } from "@/lib/keybase-answer/openai";
import { PROMPT_VERSION } from "@/lib/keybase-answer/prompt";
import {
  getContentIndexVersion,
  retrieveKeybaseSources,
} from "@/lib/keybase-answer/retrieval";
import { questionHash, trackEvent } from "@/lib/keybase-answer/analytics";
import { normalizeQuestion } from "@/lib/keybase-answer/normalize-question";
import { embeddingModelLabel } from "@/lib/keybase-answer/embeddings";
import { KeybaseAnswerError, toKeybaseAnswerError } from "@/lib/keybase-answer/errors";
import type {
  AnswerStage,
  KeybaseAnswerResult,
  QuestionClassification,
  RetrievedSource,
} from "@/lib/keybase-answer/types";

export interface AnswerRequest {
  /** Already validated and cleaned by the guardrails. */
  question: string;
  requestId: string;
  onStage?: (stage: AnswerStage) => void;
  now?: Date;
  /** True when the question looked like it carried personal data. */
  sensitive?: boolean;
}

function baseResult(
  request: AnswerRequest,
  classification: QuestionClassification,
): Pick<
  KeybaseAnswerResult,
  | "responseId"
  | "question"
  | "questionHash"
  | "category"
  | "disclaimer"
  | "cached"
  | "generatedAt"
> {
  return {
    responseId: randomUUID(),
    question: request.question,
    questionHash: questionHash(request.question),
    category: classification.category,
    disclaimer: ANSWER_DISCLAIMER,
    cached: false,
    generatedAt: (request.now ?? new Date()).toISOString(),
  };
}

/** Does this summary already redirect a personalized request? */
function alreadyRedirects(summary: string): boolean {
  return /individualized|general information|personal(?:ized|ised)? recommendation/i.test(
    summary,
  );
}

export async function answerFinancialQuestion(
  request: AnswerRequest,
): Promise<KeybaseAnswerResult> {
  const config = getConfig();
  const started = Date.now();
  const hash = questionHash(request.question);
  const classification = classifyQuestion(request.question);

  if (classification.promptInjection) {
    // Recorded so an operator can see it happening. The question still goes
    // down the normal grounded path — the instruction and citation validation
    // are what contain it, and refusing outright would also refuse the
    // legitimate questions that happen to contain the same words.
    trackEvent(
      "keybase_answer_submit",
      { flagged: "instruction_override_attempt", questionHash: hash },
      request.requestId,
    );
  }

  // 1. Nothing financial in it. Answered without a model call.
  if (classification.outOfScope) {
    trackEvent(
      "keybase_answer_out_of_scope",
      { questionHash: hash, latencyMs: Date.now() - started },
      request.requestId,
    );
    return {
      ...baseResult(request, classification),
      status: "out_of_scope",
      summary: OUT_OF_SCOPE_SUMMARY,
      sections: [],
      sources: [],
      relatedInsights: [],
      relatedQuestions: OUT_OF_SCOPE_EXAMPLES,
    };
  }

  // 2. Cache. Keyed on the corpus and the prompt as well as the question, so a
  //    republished index or an edited instruction invalidates it by itself.
  const contentIndexVersion = await getContentIndexVersion();
  const cacheKey = buildCacheKey({
    question: request.question,
    contentIndexVersion,
    promptVersion: PROMPT_VERSION,
    model: config.model,
    embeddingModel: embeddingModelLabel(),
    maxSources: config.maxSources,
  });

  const cached = await readCachedAnswer(cacheKey);
  if (cached) {
    trackEvent(
      "keybase_answer_cache_hit",
      {
        questionHash: hash,
        category: classification.category,
        latencyMs: Date.now() - started,
      },
      request.requestId,
    );
    // A new response id per delivery: feedback is about this reading of the
    // answer, and two readers must not share a feedback row.
    return { ...cached, responseId: randomUUID(), cached: true };
  }

  // 3. Retrieval.
  request.onStage?.({ stage: "retrieving" });
  let sources: RetrievedSource[] = [];
  let retrievalMs = 0;
  try {
    const retrieval = await retrieveKeybaseSources({
      query: request.question,
      categories: classification.retrievalCategories,
      freshnessIntent: classification.freshnessIntent,
      now: request.now,
    });
    sources = retrieval.sources;
    retrievalMs = retrieval.latencyMs;
  } catch (err) {
    const error = toKeybaseAnswerError(err);
    trackEvent(
      "keybase_answer_error",
      { stage: "retrieval", code: error.code, questionHash: hash },
      request.requestId,
    );
    throw error;
  }

  // 4. Is it enough?
  const verdict = evaluateEvidence(sources, {
    freshnessIntent: classification.freshnessIntent,
    now: request.now,
  });
  request.onStage?.({ stage: "reviewing", sourceCount: verdict.sources.length });

  if (!verdict.sufficient) {
    const summary = classification.personalizedAdvice
      ? PERSONALIZED_ADVICE_ONLY_SUMMARY
      : verdict.reason === "no_recent_material"
        ? STALE_EVIDENCE_SUMMARY
        : INSUFFICIENT_EVIDENCE_SUMMARY;

    trackEvent(
      classification.personalizedAdvice
        ? "keybase_answer_restricted"
        : "keybase_answer_insufficient_evidence",
      {
        questionHash: hash,
        category: classification.category,
        reason: verdict.reason,
        retrievedSources: sources.length,
        retrievalMs,
        latencyMs: Date.now() - started,
      },
      request.requestId,
    );

    const result: KeybaseAnswerResult = {
      ...baseResult(request, classification),
      status: classification.personalizedAdvice ? "restricted" : "insufficient_evidence",
      summary,
      sections: [],
      sources: [],
      // Nearby reading, when there was any — even a question we would not
      // answer can point somewhere useful.
      relatedInsights: sources.slice(0, 3).map((source) => ({
        title: source.title,
        url: source.canonicalUrl,
        category: source.category,
        publishedAt: source.publishedAt,
      })),
      relatedQuestions: [],
    };
    await cacheResult(result, cacheKey, contentIndexVersion, config.model, request);
    return result;
  }

  // 5. Generation, against the approved sources alone.
  const generation = await generateFinancialAnswer({
    question: request.question,
    sources: verdict.sources,
    classification,
    today: request.now,
    onGenerationStarted: () => request.onStage?.({ stage: "generating" }),
  }).catch((err: unknown) => {
    const error = toKeybaseAnswerError(err);
    trackEvent(
      "keybase_answer_error",
      { stage: "generation", code: error.code, questionHash: hash },
      request.requestId,
    );
    throw error;
  });

  const answer = generation.answer;

  // The model can still conclude the sources do not carry it, even after the
  // evidence gate let them through. It is closer to the material than the
  // scores are, so its judgement wins.
  if (answer.insufficientEvidence) {
    trackEvent(
      "keybase_answer_insufficient_evidence",
      {
        questionHash: hash,
        category: classification.category,
        reason: "model_declined",
        latencyMs: Date.now() - started,
      },
      request.requestId,
    );
    const result: KeybaseAnswerResult = {
      ...baseResult(request, classification),
      status: "insufficient_evidence",
      summary: answer.summary || INSUFFICIENT_EVIDENCE_SUMMARY,
      sections: [],
      sources: [],
      relatedInsights: verdict.sources.slice(0, 3).map((source) => ({
        title: source.title,
        url: source.canonicalUrl,
        category: source.category,
        publishedAt: source.publishedAt,
      })),
      relatedQuestions: [],
    };
    await cacheResult(result, cacheKey, contentIndexVersion, generation.model, request);
    return result;
  }

  // 6. Citations. Nothing the model wrote becomes a link until it has been
  //    matched to a source retrieval actually supplied.
  const validated = validateCitations(answer, verdict.sources);

  const restricted =
    classification.personalizedAdvice || answer.personalizedAdviceRequest;

  let summary = applyInlineMarkers(answer.summary, validated.sources);
  if (restricted && !alreadyRedirects(summary)) {
    summary = `${PERSONALIZED_ADVICE_SUMMARY} ${summary}`;
  }

  const result: KeybaseAnswerResult = {
    ...baseResult(request, classification),
    status: restricted ? "restricted" : "success",
    summary,
    sections: validated.sections.map((section) => ({
      ...section,
      body: applyInlineMarkers(section.body, validated.sources),
    })),
    sources: validated.sources,
    relatedInsights: validated.relatedInsights,
    relatedQuestions: answer.relatedQuestions
      .filter(
        (question) =>
          normalizeQuestion(question) !== normalizeQuestion(request.question),
      )
      .slice(0, 3),
  };

  trackEvent(
    restricted ? "keybase_answer_restricted" : "keybase_answer_generated",
    {
      questionHash: hash,
      category: classification.category,
      model: generation.model,
      sourceCount: result.sources.length,
      sectionCount: result.sections.length,
      retrievalMs,
      generationMs: generation.latencyMs,
      latencyMs: Date.now() - started,
      droppedCitations: validated.hallucinatedIds.length,
      mock: isMockMode(),
    },
    request.requestId,
  );

  if (validated.hallucinatedIds.length > 0) {
    console.warn(
      `[keybase-answer] dropped ${validated.hallucinatedIds.length} unsupported citation id(s) ` +
        `for question ${redactForLogs(request.question)}`,
    );
  }

  await cacheResult(result, cacheKey, contentIndexVersion, generation.model, request);
  return result;
}

async function cacheResult(
  result: KeybaseAnswerResult,
  cacheKey: string,
  contentIndexVersion: string,
  model: string,
  request: AnswerRequest,
): Promise<void> {
  // A question carrying what looks like personal data is answered but never
  // written to a shared cache, where the question text would outlive the visit.
  if (request.sensitive) return;
  await writeCachedAnswer({
    cacheKey,
    normalizedQuestion: normalizeQuestion(result.question),
    question: result.question,
    result: { ...result, cached: false },
    sourceIds: result.sources.map((source) => source.id),
    contentIndexVersion,
    promptVersion: PROMPT_VERSION,
    model,
    createdAt: result.generatedAt,
    expiresAt: cacheExpiry(request.now),
  });
}

export { KeybaseAnswerError };
