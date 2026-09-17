/**
 * The browser's only way to reach Internal AI.
 *
 * Keeps the fetch, the error handling, and the response shape out of the
 * components, so the UI holds no knowledge of transport and none of the model.
 */

import type { ChatErrorResponse, ChatResponse } from "@/lib/internal-ai/types";

export const CHAT_ENDPOINT = "/api/internal-ai/chat";

const GENERIC_FAILURE = "Something went wrong. Please try again.";

export class ChatRequestError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "ChatRequestError";
    this.code = code;
  }
}

/**
 * Files travel with the message in one multipart request. There is no separate
 * upload step, because Phase 1 stores nothing: there would be nowhere for a
 * file to wait between two requests.
 */
function buildBody(input: {
  message: string;
  conversationId?: string;
  files?: readonly File[];
}): { body: BodyInit; headers?: HeadersInit } {
  const files = input.files ?? [];
  if (files.length === 0) {
    return {
      body: JSON.stringify({
        message: input.message,
        conversationId: input.conversationId,
      }),
      headers: { "content-type": "application/json" },
    };
  }

  const form = new FormData();
  form.set("message", input.message);
  if (input.conversationId) form.set("conversationId", input.conversationId);
  for (const file of files) form.append("attachments", file, file.name);
  // No content-type header: the browser must set the multipart boundary.
  return { body: form };
}

export async function sendChatMessage(
  input: { message: string; conversationId?: string; files?: readonly File[] },
  options: { signal?: AbortSignal } = {}
): Promise<ChatResponse> {
  const { body, headers } = buildBody(input);

  let response: Response;
  try {
    response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers,
      body,
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ChatRequestError(
      "Could not reach the assistant. Check your connection and try again.",
      "network_error"
    );
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = (payload as ChatErrorResponse | null)?.error;
    throw new ChatRequestError(error?.message ?? GENERIC_FAILURE, error?.code ?? "unknown");
  }

  const result = payload as ChatResponse | null;
  if (!result || typeof result.message !== "string" || typeof result.conversationId !== "string") {
    throw new ChatRequestError(GENERIC_FAILURE, "invalid_response");
  }
  return result;
}
