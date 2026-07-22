import { NextResponse } from "next/server";
import { draftMode } from "next/headers";
import { adminUserFromRequest } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authenticated draft-preview entry point. Enables Next Draft Mode (so the
 * public pages render their unpublished DRAFT content) and redirects to the
 * requested page. Only signed-in admins can enable it, and the draft cookie is
 * httpOnly — the public can never trigger it.
 */
export async function GET(req: Request) {
  if (!adminUserFromRequest(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "/";
  // Only allow same-site absolute paths (block protocol-relative + external).
  if (!path.startsWith("/") || path.startsWith("//")) {
    return new NextResponse("Invalid path", { status: 400 });
  }

  const draft = await draftMode();
  draft.enable();

  return NextResponse.redirect(new URL(path, url.origin));
}
