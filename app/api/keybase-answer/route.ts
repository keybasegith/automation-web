/**
 * POST /api/keybase-answer
 *
 * The only path from a browser to the answer pipeline, and the only place
 * OPENAI_API_KEY is ever within reach. The key is read server-side in
 * lib/keybase-answer/openai-client.ts and never leaves this process; the
 * browser sends a question and receives an answer with resolved Keybase URLs,
 * and nothing else.
 *
 * The response is a newline-delimited JSON stream. Each line is one
 * AnswerStreamEvent: `stage` frames as the pipeline actually enters retrieval,
 * review, and generation, then exactly one terminal `result` or `error` frame.
 * Progress is reported, not performed — no stage is announced before the work
 * behind it has started.
 *
 * Errors are deliberately opaque. A visitor is told that something went wrong;
 * the provider's message, the status, the request id, and the configuration
 * that caused it stay in the server log.
 */

import { NextResponse } from "next/server";
import {
  newRequestId,
  questionHash,
  trackEvent,
} from "@/lib/keybase-answer/analytics";
import { answerFinancialQuestion } from "@/lib/keybase-answer/answer-service";
import { getConfig } from "@/lib/keybase-answer/config";
import { KeybaseAnswerError, toKeybaseAnswerError } from "@/lib/keybase-answer/errors";
import { readQuestionFromBody } from "@/lib/keybase-answer/guardrails";
import { consumeRateLimit, identifyCaller } from "@/lib/keybase-answer/rate-limit";
import { RATE_LIMIT_COPY } from "@/lib/keybase-answer/copy";
import type { AnswerStreamEvent } from "@/lib/keybase-answer/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Larger than any question the guardrails will accept, and small enough to be cheap to reject. */
const MAX_BODY_BYTES = 8 * 1024;

const NO_INDEX_HEADERS = {
  "x-robots-tag": "noindex, nofollow",
  "cache-control": "no-store",
};

function errorResponse(error: KeybaseAnswerError): NextResponse {
  return NextResponse.json(
    { error: { code: error.code, message: error.publicMessage } },
    { status: error.status, headers: NO_INDEX_HEADERS },
  );
}

async function readBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new KeybaseAnswerError(
      "invalid_request",
      "That request could not be read. Please try asking again.",
      { detail: `unsupported content-type: ${contentType || "(none)"}` },
    );
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new KeybaseAnswerError(
      "invalid_request",
      "That request was too large. Please shorten your question.",
      { detail: `content-length ${declared}` },
    );
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new KeybaseAnswerError(
      "invalid_request",
      "That request was too large. Please shorten your question.",
      { detail: `body ${text.length} bytes` },
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (err) {
    throw new KeybaseAnswerError(
      "invalid_request",
      "That request could not be read. Please try asking again.",
      { cause: err, detail: "body was not valid JSON" },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  const requestId = newRequestId();
  const config = getConfig();

  if (!config.enabled) {
    return errorResponse(
      new KeybaseAnswerError("feature_disabled", "Keybase Answer is unavailable."),
    );
  }

  let question: string;
  let sensitive: boolean;
  let source: string;
  try {
    const body = await readBody(request);
    const validated = readQuestionFromBody(body);
    question = validated.question;
    sensitive = validated.sensitive;
    const raw = (body as { source?: unknown }).source;
    source = typeof raw === "string" && raw.length < 40 ? raw : "custom";
  } catch (err) {
    const error = toKeybaseAnswerError(err);
    trackEvent("keybase_answer_error", { stage: "validation", code: error.code }, requestId);
    return errorResponse(error);
  }

  const limit = await consumeRateLimit(identifyCaller(request.headers));
  if (!limit.allowed) {
    trackEvent("keybase_answer_rate_limit", { limit: limit.limit }, requestId);
    return NextResponse.json(
      {
        error: {
          code: "rate_limited",
          message: `${RATE_LIMIT_COPY.heading} ${RATE_LIMIT_COPY.body}`,
        },
      },
      {
        status: 429,
        headers: {
          ...NO_INDEX_HEADERS,
          "retry-after": String(
            Math.max(1, Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000)),
          ),
        },
      },
    );
  }

  trackEvent(
    source === "suggested" ? "keybase_answer_suggested_question" : "keybase_answer_submit",
    { questionHash: questionHash(question), remaining: limit.remaining },
    requestId,
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AnswerStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        const result = await answerFinancialQuestion({
          question,
          requestId,
          sensitive,
          onStage: (stage) => send({ type: "stage", stage }),
        });
        send({ type: "result", result });
      } catch (err) {
        const error = toKeybaseAnswerError(err);
        console.error(
          `[keybase-answer] request ${requestId} failed (${error.code}):`,
          error.message,
          error.cause ?? "",
        );
        send({ type: "error", code: error.code, message: error.publicMessage });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...NO_INDEX_HEADERS,
      "content-type": "application/x-ndjson; charset=utf-8",
      // Proxies that buffer would defeat the point of streaming the stages.
      "x-accel-buffering": "no",
    },
  });
}

/** Method guard: anything but POST is a mistake, and says so without detail. */
export async function GET(): Promise<Response> {
  return NextResponse.json(
    { error: { code: "invalid_request", message: "Use POST to ask a question." } },
    { status: 405, headers: { ...NO_INDEX_HEADERS, allow: "POST" } },
  );
}
