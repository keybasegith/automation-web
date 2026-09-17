import { NextResponse } from "next/server";
import { isResponse, readJson, requireUser, serverError } from "@/lib/content/http";
import { completeUpload } from "@/lib/cms/mediaRepo";
import { appendAudit } from "@/lib/content/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST {key, fileName, altText?} after a presigned PUT succeeds. Verifies the
 * object server-side (existence, size, type) and records its metadata.
 *
 * The upload is attributed to the content account that made it, and recorded in
 * the content audit trail as well as the media table — a reviewer asking where
 * a hero image came from should not have to look in two systems.
 */
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (isResponse(auth)) return auth.response;

  const parsed = await readJson(req);
  if ("response" in parsed) return parsed.response;

  const key = typeof parsed.body.key === "string" ? parsed.body.key : "";
  const fileName = typeof parsed.body.fileName === "string" ? parsed.body.fileName : "";
  const altText =
    typeof parsed.body.altText === "string" ? parsed.body.altText.slice(0, 300) : "";
  const articleId =
    typeof parsed.body.articleId === "string" ? parsed.body.articleId : null;

  if (!key || !fileName) {
    return NextResponse.json({ error: "Missing upload details." }, { status: 400 });
  }

  try {
    const result = await completeUpload({
      key,
      fileName,
      altText,
      uploadedBy: auth.user.email,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    await appendAudit({
      articleId,
      actorId: auth.user.id,
      actorLabel: auth.user.name,
      action: "settings_changed",
      metadata: { uploaded: result.item.fileName, key: result.item.fileKey },
    });
    return NextResponse.json({ item: result.item });
  } catch (err) {
    return serverError(err, "Upload failed.");
  }
}
