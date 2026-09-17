/**
 * POST /api/internal-ai/chat
 *
 * The only path from a browser to the Internal AI provider layer.
 *
 * Privacy rules this route exists to keep:
 *   - No external AI service is contacted. There is no provider in this
 *     feature that can reach one, and no API key of any kind is read here.
 *   - Message content is never logged, never sent to analytics, and never
 *     included in an error response. Server logs carry a code and a request
 *     id only.
 *   - Responses are marked no-store so no proxy or browser cache retains a
 *     conversation.
 *   - Uploaded files are read into memory, handed to the provider, and
 *     dropped when the request ends. Nothing is written to disk or to object
 *     storage, and no filename appears in a log line.
 *
 * Accepts application/json (message only) or multipart/form-data (message and
 * files). Both produce the same response shape.
 */

import {
  InternalAiError,
  toInternalAiError,
} from "@/lib/internal-ai/errors";
import { getInternalAiConfig } from "@/lib/internal-ai/config";
import { parseChatForm, parseChatRequest } from "@/lib/internal-ai/schemas";
import { requireInternalAiUser } from "@/lib/internal-ai/session";
import { respondToChatMessage } from "@/lib/internal-ai/service";
import type {
  ChatErrorResponse,
  ChatResponse,
  ChatSubmission,
} from "@/lib/internal-ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cap for a JSON body only. A multipart body is bounded by the per-file and
 * total-upload limits in the config instead, which the form parser enforces
 * file by file.
 */
const MAX_BODY_BYTES = 64 * 1024;

const PRIVATE_HEADERS = {
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow",
};

function errorResponse(error: InternalAiError): Response {
  const body: ChatErrorResponse = {
    error: { code: error.code, message: error.publicMessage },
  };
  return Response.json(body, { status: error.status, headers: PRIVATE_HEADERS });
}

async function readBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new InternalAiError("invalid_request", "That request could not be read.", {
      detail: `unsupported content-type: ${contentType || "(none)"}`,
    });
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new InternalAiError("invalid_request", "That message was too long.", {
      detail: `content-length ${declared}`,
    });
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new InternalAiError("invalid_request", "That message was too long.", {
      detail: `body ${text.length} bytes`,
    });
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (err) {
    throw new InternalAiError("invalid_request", "That request could not be read.", {
      cause: err,
      detail: "body was not valid JSON",
    });
  }
}

async function readForm(request: Request): Promise<FormData> {
  try {
    return await request.formData();
  } catch (err) {
    // A body that exceeds the platform's request limit surfaces here.
    throw new InternalAiError(
      "invalid_request",
      "Those files could not be uploaded. Try attaching fewer, or smaller, files.",
      { cause: err, detail: "multipart body could not be read" }
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();

  try {
    const config = getInternalAiConfig();
    if (!config.enabled) {
      throw new InternalAiError("disabled", "Internal AI is not available.", {
        detail: "INTERNAL_AI_ENABLED is false",
      });
    }

    const user = await requireInternalAiUser(request);

    const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
    let submission: ChatSubmission;
    if (contentType.includes("multipart/form-data")) {
      submission = await parseChatForm(await readForm(request), config);
    } else {
      const parsed = parseChatRequest(await readBody(request), config.maxMessageLength);
      submission = { ...parsed, attachments: [] };
    }

    const result: ChatResponse = await respondToChatMessage(submission, user);

    return Response.json(result, { headers: PRIVATE_HEADERS });
  } catch (err) {
    const error = toInternalAiError(err);
    // Code and request id only — never the prompt, and never the user's text.
    console.error(
      `[internal-ai] ${error.code} (request ${requestId})`,
      error.detail ?? ""
    );
    return errorResponse(error);
  }
}
