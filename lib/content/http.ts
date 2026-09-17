import { NextResponse } from "next/server";
import { currentUserFromRequest } from "@/lib/content/session";
import type { Result } from "@/lib/content/service";
import type { ContentUser } from "@/lib/content/types";

/**
 * Shared plumbing for the content API routes.
 *
 * Route handlers in this module do three things and nothing else: authenticate,
 * parse, and hand off to lib/content/service.ts. Keeping that shape means there
 * is exactly one path to the store, and every permission rule sits on it.
 */

/** The signed-in user, or a 401 response to return as-is. */
export async function requireUser(
  req: Request
): Promise<{ user: ContentUser } | { response: NextResponse }> {
  const user = await currentUserFromRequest(req);
  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Please sign in again." },
        { status: 401 }
      ),
    };
  }
  return { user };
}

export function isResponse(
  value: { user: ContentUser } | { response: NextResponse }
): value is { response: NextResponse } {
  return "response" in value;
}

/** Parse a JSON body, or a 400 response. */
export async function readJson(
  req: Request
): Promise<{ body: Record<string, unknown> } | { response: NextResponse }> {
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        response: NextResponse.json({ error: "Invalid request." }, { status: 400 }),
      };
    }
    return { body: parsed as Record<string, unknown> };
  } catch {
    return {
      response: NextResponse.json({ error: "Invalid request." }, { status: 400 }),
    };
  }
}

/**
 * Translate a service Result into an HTTP response.
 *
 * `details` carries the list of things an author has to fix before submitting,
 * so the editor can show them all at once rather than one error at a time.
 */
export function respond<T>(
  result: Result<T>,
  transform?: (value: T) => unknown
): NextResponse {
  if (result.ok) {
    const body = transform ? transform(result.value) : result.value;
    return NextResponse.json(body as Record<string, unknown>);
  }
  return NextResponse.json(
    result.details
      ? { error: result.error, details: result.details }
      : { error: result.error },
    { status: result.status }
  );
}

/**
 * A 500 with a message that does not leak internals.
 *
 * A configuration problem (no DATABASE_URL) is worth saying out loud to a
 * signed-in member of staff; anything else is logged and reported generically.
 */
export function serverError(err: unknown, fallback: string): NextResponse {
  console.error("[content]", err);
  const message =
    err instanceof Error && err.name === "ContentConfigError"
      ? err.message
      : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}
