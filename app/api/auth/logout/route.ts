import { NextResponse } from "next/server";

import {
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

/**
 * POST /api/auth/logout
 *
 * Clears the session cookie. Always succeeds — signing out must not depend on
 * the session still being valid, and a signed-out browser asking to sign out
 * again is not an error.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json(
    { ok: true },
    { headers: { "cache-control": "no-store" } }
  );
  // maxAge 0 with the same attributes it was set with, so the browser drops it.
  response.cookies.set(SESSION_COOKIE_NAME, "", sessionCookieOptions(0));
  return response;
}
