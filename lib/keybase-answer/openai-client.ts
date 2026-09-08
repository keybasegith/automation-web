/**
 * The OpenAI client, constructed once.
 *
 * SERVER ONLY. `OPENAI_API_KEY` is read here and in no other Keybase Answer
 * module; nothing in components/keybase-answer imports this file, and the API
 * route is the only boundary the browser can reach.
 *
 * Deliberately not marked with the `server-only` package: the indexing and
 * warming commands import this module from a plain Node script, where that
 * marker throws. What keeps the key server-side is that no client component
 * imports anything on this path, which the build enforces anyway — a client
 * bundle cannot pull in `openai` or `node:crypto`.
 */

import OpenAI from "openai";
import { getOpenAiApiKey } from "@/lib/keybase-answer/config";
import { KeybaseAnswerError } from "@/lib/keybase-answer/errors";

let client: OpenAI | null = null;
let clientKey: string | null = null;

export function getOpenAiClient(): OpenAI {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new KeybaseAnswerError(
      "provider_unavailable",
      "Something went wrong while preparing your answer.",
      { detail: "OPENAI_API_KEY is not configured on the server" },
    );
  }
  if (!client || clientKey !== apiKey) {
    client = new OpenAI({ apiKey, maxRetries: 2, timeout: 60_000 });
    clientKey = apiKey;
  }
  return client;
}
