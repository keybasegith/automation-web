import { NextResponse } from "next/server";
import { draftMode } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Turn off draft preview so the browser sees published content again. */
export async function GET(req: Request) {
  const draft = await draftMode();
  draft.disable();
  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "/website-admin-cms";
  const safe = path.startsWith("/") && !path.startsWith("//") ? path : "/website-admin-cms";
  return NextResponse.redirect(new URL(safe, url.origin));
}
