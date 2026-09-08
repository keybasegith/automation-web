/**
 * POST /api/keybase-answer/events
 *
 * Client-side product events — a homepage impression, a CTA click, a source
 * click. Sent with `sendBeacon` where the browser has it, so a click that
 * navigates away is still counted.
 *
 * Only names from the known event list are accepted, and only scalar
 * properties: an endpoint that stored whatever it was handed would be the
 * easiest way for a question or a piece of personal data to end up in the
 * analytics table.
 */

import {
  isKeybaseAnswerEvent,
  recordEvent,
  type EventProperties,
} from "@/lib/keybase-answer/analytics";
import { getConfig } from "@/lib/keybase-answer/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "x-robots-tag": "noindex, nofollow", "cache-control": "no-store" };

/** Keys allowed on a client event. Anything else is dropped without comment. */
const ALLOWED_KEYS = new Set([
  "category",
  "questionHash",
  "responseId",
  "sourceId",
  "sourceUrl",
  "position",
  "surface",
  "status",
  "cached",
]);

function sanitize(raw: unknown): EventProperties {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const out: EventProperties = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    if (typeof value === "number" || typeof value === "boolean") out[key] = value;
    else if (typeof value === "string" && value.length <= 200) out[key] = value;
  }
  return out;
}

export async function POST(request: Request): Promise<Response> {
  if (!getConfig().enabled) {
    return new Response(null, { status: 204, headers: HEADERS });
  }
  try {
    const body = (await request.json()) as { name?: unknown; properties?: unknown };
    if (isKeybaseAnswerEvent(body?.name)) {
      await recordEvent(body.name, sanitize(body.properties));
    }
  } catch {
    // A dropped analytics beacon is not worth a status code the client would
    // have to handle. Swallow and answer 204 either way.
  }
  return new Response(null, { status: 204, headers: HEADERS });
}
