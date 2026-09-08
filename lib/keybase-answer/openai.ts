/**
 * Answer generation.
 *
 * The domain interface is `generateFinancialAnswer` — a question, the approved
 * sources, and the classification in; a validated structured answer out. No
 * React component, route, or retrieval module imports the OpenAI SDK; they
 * import this.
 *
 * Notes on two deliberate choices:
 *
 *   Responses API, streamed. The stream is consumed for *progress*, not for
 *   display: the UI never renders a token as it arrives, because a research
 *   answer typed out character by character reads like a chat window, which is
 *   exactly what this feature is not. What the stream buys is a truthful
 *   "preparing your answer" stage that begins when generation actually begins.
 *
 *   No tools, and specifically no web search. The sources in the prompt are the
 *   entire world the model may draw on; enabling retrieval of any other kind
 *   would mean Keybase Answer no longer represents Keybase's published thinking.
 */

import { getConfig, isMockMode } from "@/lib/keybase-answer/config";
import { KeybaseAnswerError } from "@/lib/keybase-answer/errors";
import { generateMockAnswer } from "@/lib/keybase-answer/mock";
import { getOpenAiClient } from "@/lib/keybase-answer/openai-client";
import { buildGroundedPrompt } from "@/lib/keybase-answer/prompt";
import {
  ANSWER_JSON_SCHEMA,
  ANSWER_SCHEMA_NAME,
  AnswerShapeError,
  parseGeneratedAnswer,
  type GeneratedAnswer,
} from "@/lib/keybase-answer/schemas";
import type {
  QuestionClassification,
  RetrievedSource,
} from "@/lib/keybase-answer/types";

export interface GenerateArgs {
  question: string;
  sources: RetrievedSource[];
  classification: QuestionClassification;
  /** Called once, when the provider starts producing the answer. */
  onGenerationStarted?: () => void;
  today?: Date;
}

export interface GenerationResult {
  answer: GeneratedAnswer;
  model: string;
  latencyMs: number;
}

export async function generateFinancialAnswer(
  args: GenerateArgs,
): Promise<GenerationResult> {
  const started = Date.now();
  const { model } = getConfig();

  if (isMockMode()) {
    args.onGenerationStarted?.();
    return {
      answer: generateMockAnswer(args),
      model: `mock:${model}`,
      latencyMs: Date.now() - started,
    };
  }

  const { system, user } = buildGroundedPrompt({
    question: args.question,
    sources: args.sources,
    classification: args.classification,
    today: args.today,
  });

  const client = getOpenAiClient();
  let text = "";
  let announced = false;

  try {
    const stream = await client.responses.create({
      model,
      instructions: system,
      input: user,
      // Structured Outputs. The shape of the answer is guaranteed by the
      // provider, and re-checked on arrival by parseGeneratedAnswer.
      text: {
        format: {
          type: "json_schema",
          name: ANSWER_SCHEMA_NAME,
          schema: ANSWER_JSON_SCHEMA as unknown as Record<string, unknown>,
          strict: true,
        },
      },
      // No tools of any kind: the supplied sources are the whole knowledge base.
      tools: [],
      store: false,
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        if (!announced) {
          announced = true;
          args.onGenerationStarted?.();
        }
        text += event.delta;
      } else if (event.type === "response.completed") {
        const final = event.response.output_text;
        if (typeof final === "string" && final.length > 0) text = final;
      } else if (event.type === "response.failed" || event.type === "error") {
        throw new Error(
          `provider reported ${event.type} while generating the answer`,
        );
      }
    }
  } catch (err) {
    throw new KeybaseAnswerError(
      "provider_failed",
      "Something went wrong while preparing your answer.",
      { cause: err, detail: "the generation request failed" },
    );
  }

  if (!announced) args.onGenerationStarted?.();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new KeybaseAnswerError(
      "provider_failed",
      "Something went wrong while preparing your answer.",
      { cause: err, detail: "the response was not valid JSON" },
    );
  }

  try {
    return {
      answer: parseGeneratedAnswer(parsed),
      model,
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    throw new KeybaseAnswerError(
      "provider_failed",
      "Something went wrong while preparing your answer.",
      {
        cause: err,
        detail:
          err instanceof AnswerShapeError
            ? `the response did not match the answer schema: ${err.message}`
            : "the response could not be validated",
      },
    );
  }
}
