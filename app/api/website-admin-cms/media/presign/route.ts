import { NextResponse } from "next/server";
import { adminUserFromRequest } from "@/lib/admin/auth";
import { beginUpload } from "@/lib/cms/mediaRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST {fileName, fileType, fileSize} → a short-lived presigned PUT URL.
 * The browser uploads the file body directly to object storage with it, then
 * calls ../complete to verify and record the upload.
 */
export async function POST(req: Request) {
  const user = adminUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { fileName?: unknown; fileType?: unknown; fileSize?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const fileName = typeof body.fileName === "string" ? body.fileName : "";
  const fileType = typeof body.fileType === "string" ? body.fileType : "";
  const fileSize = typeof body.fileSize === "number" ? body.fileSize : 0;
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not start the upload." },
      { status: 500 }
    );
  }
}
