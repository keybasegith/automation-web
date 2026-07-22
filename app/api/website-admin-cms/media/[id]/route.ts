import { NextResponse } from "next/server";
import { adminUserFromRequest } from "@/lib/admin/auth";
import { logAudit } from "@/lib/cms/audit";
import { deleteMedia, getMedia, updateMediaAlt } from "@/lib/cms/mediaRepo";
import { findMediaUsage } from "@/lib/cms/mediaUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH → edit alt text. DELETE → remove an image and its file. */

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = adminUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await ctx.params;

  let body: { altText?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const altText = typeof body.altText === "string" ? body.altText.slice(0, 300) : "";

  try {
    const updated = await updateMediaAlt(id, altText);
    if (!updated) {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }
    await logAudit({
      userId: user,
      action: "media_update",
      resource: "media",
      description: `Updated alt text for ${updated.fileName}`,
    });
    return NextResponse.json({ item: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = adminUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await ctx.params;

  const force = new URL(req.url).searchParams.get("force") === "true";

  try {
    const item = await getMedia(id);
    if (!item) {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }
    // Block deletion of an in-use file unless the admin explicitly confirms.
    if (!force) {
      const usage = await findMediaUsage(item);
      if (usage.length > 0) {
        return NextResponse.json(
          {
            error: "This image is currently in use.",
            usage,
          },
          { status: 409 }
        );
      }
    }
    await deleteMedia(id);
    await logAudit({
      userId: user,
      action: "media_delete",
      resource: "media",
      description: `Deleted image ${item?.fileName ?? id}`,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed." },
      { status: 500 }
    );
  }
}
