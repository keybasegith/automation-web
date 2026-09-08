/**
 * POST /api/keybase-answer/feedback
 *
 * "Was this helpful?" — yes or no, against the response id the answer was
 * delivered under. Deliberately accepts a question *hash* rather than the
 * question: feedback storage must not become a second copy of what visitors
 * asked.
 */

import { NextResponse } from "next/server";
import { recordFeedback } from "@/lib/keybase-answer/analytics";
import { getConfig } from "@/lib/keybase-answer/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "x-robots-tag": "noindex, nofollow", "cache-control": "no-store" };

function isShortString(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

export async function POST(request: Request): Promise<Response> {
  if (!getConfig().enabled) {
    return NextResponse.json({ ok: false }, { status: 404, headers: HEADERS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers: HEADERS });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ ok: false }, { status: 400, headers: HEADERS });
  }

  const input = body as Record<string, unknown>;
  if (
    !isShortString(input.responseId, 64) ||
    !isShortString(input.questionHash, 64) ||
    typeof input.helpful !== "boolean"
  ) {
    return NextResponse.json({ ok: false }, { status: 400, headers: HEADERS });
  }

  const sourceIds = Array.isArray(input.sourceIds)
    ? input.sourceIds
        .filter((id): id is string => typeof id === "string" && /^SRC_\d{3}$/.test(id))
        .slice(0, 12)
    : [];

  await recordFeedback({
    responseId: input.responseId,
    questionHash: input.questionHash,
    helpful: input.helpful,
    // Read here, not taken from the browser: the model in use is server
    // configuration, and a client must be able neither to name it nor to
    // misreport it.
    model: getConfig().model,
    sourceIds,
  });

  return NextResponse.json({ ok: true }, { headers: HEADERS });
}
