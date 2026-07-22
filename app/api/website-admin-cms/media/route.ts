import { NextResponse } from "next/server";
import { adminUserFromRequest } from "@/lib/admin/auth";
import { listMedia } from "@/lib/cms/mediaRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET → all media items (with resolved URLs).
 *
 * Uploads no longer POST file bodies here — they go browser → object storage
 * via presigned URLs. See ./presign and ./complete.
 */
export async function GET(req: Request) {
  if (!adminUserFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    return NextResponse.json({ items: await listMedia() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load." },
      { status: 500 }
    );
  }
}
