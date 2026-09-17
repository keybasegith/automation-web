import { NextResponse } from "next/server";

import { getApiUser } from "@/lib/auth/guard";

/**
 * GET /api/auth/session
 *
 * Who is signed in, for client code that needs to react to sign-out without a
 * reload. Returns display fields only, and never the token.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  return NextResponse.json(
    user
      ? {
          authenticated: true,
          user: { email: user.email, name: user.name, role: user.role },
        }
      : { authenticated: false },
    { headers: { "cache-control": "no-store" } }
  );
}
