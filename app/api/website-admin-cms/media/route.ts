import { NextResponse } from "next/server";
import { adminUserFromRequest } from "@/lib/admin/auth";
import { logAudit } from "@/lib/cms/audit";
import {
  listMedia,
  saveMedia,
  MEDIA_ALLOWED_TYPES,
  MEDIA_MAX_BYTES,
} from "@/lib/cms/mediaRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → all media items. POST → upload one image (multipart form, field "file"). */

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

export async function POST(req: Request) {
  const user = adminUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected an uploaded file." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }
  if (file.size > MEDIA_MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 8 MB or smaller." }, { status: 400 });
  }
  if (file.type && !MEDIA_ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPG, PNG, WEBP, GIF, or SVG images are allowed." },
      { status: 400 }
    );
  }

  try {
    const bytes = Buffer.from(new Uint8Array(await file.arrayBuffer()));
    const item = await saveMedia({
      fileName: file.name || "image",
      fileType: file.type || "image/jpeg",
      bytes,
      uploadedBy: user,
    });
    await logAudit({
      userId: user,
      action: "media_upload",
      resource: "media",
      description: `Uploaded image ${item.fileName}`,
    });
    // `url` kept for backward compatibility with the executives photo picker.
    return NextResponse.json({ item, url: item.fileUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 500 }
    );
  }
}
