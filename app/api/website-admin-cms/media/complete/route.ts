import { NextResponse } from "next/server";
import { adminUserFromRequest } from "@/lib/admin/auth";
import { logAudit } from "@/lib/cms/audit";
import { completeUpload } from "@/lib/cms/mediaRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST {key, fileName, altText?} after a presigned PUT succeeds. Verifies the
 * object server-side (existence, size, type) and records its metadata.
 */
export async function POST(req: Request) {
  const user = adminUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { key?: unknown; fileName?: unknown; altText?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const key = typeof body.key === "string" ? body.key : "";
  const fileName = typeof body.fileName === "string" ? body.fileName : "";
  const altText =
    typeof body.altText === "string" ? body.altText.slice(0, 300) : "";
  if (!key || !fileName) {
    return NextResponse.json({ error: "Missing upload details." }, { status: 400 });
  }

  try {
    const result = await completeUpload({ key, fileName, altText, uploadedBy: user });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    await logAudit({
      userId: user,
      action: "media_upload",
      resource: "media",
      description: `Uploaded ${result.item.fileName}`,
    });
    // `url` kept for backward compatibility with the executives photo picker.
    return NextResponse.json({ item: result.item, url: result.item.fileUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 500 }
    );
  }
}
