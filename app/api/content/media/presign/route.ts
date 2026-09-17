import { NextResponse } from "next/server";
import { isResponse, readJson, requireUser, serverError } from "@/lib/content/http";
import { beginUpload } from "@/lib/cms/mediaRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST {fileName, fileType, fileSize} → a short-lived presigned PUT URL.
 *
 * The same object store, policy, and metadata table the website CMS media
 * library already uses (lib/cms/mediaRepo.ts) — only the authentication
 * differs, because a content author is not a website admin. File bodies go
 * straight from the browser to storage and never pass through this route.
 */
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (isResponse(auth)) return auth.response;

  const parsed = await readJson(req);
  if ("response" in parsed) return parsed.response;

  const fileName = typeof parsed.body.fileName === "string" ? parsed.body.fileName : "";
  const fileType = typeof parsed.body.fileType === "string" ? parsed.body.fileType : "";
  const fileSize = typeof parsed.body.fileSize === "number" ? parsed.body.fileSize : 0;
  if (!fileName || !fileType) {
    return NextResponse.json({ error: "Missing file details." }, { status: 400 });
  }

  try {
    const result = await beginUpload({ fileName, fileType, fileSize });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.upload);
  } catch (err) {
    return serverError(err, "Could not start the upload.");
  }
}
