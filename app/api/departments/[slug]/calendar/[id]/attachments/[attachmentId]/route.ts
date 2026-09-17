import {
  actorFrom,
  jsonOk,
  notFound,
  openCalendar,
  readJson,
  serverError,
} from "@/lib/content-calendar/apiSupport";
import {
  attachmentDownloadUrl,
  removeAttachment,
} from "@/lib/content-calendar/attachments";
import { getItem } from "@/lib/content-calendar/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — redirects to a short-lived signed URL for the file.
 *
 * The bucket is not public, so this route is the gate: it proves the caller
 * has a dashboard session and that the file belongs to an item in this
 * department before signing anything.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ slug: string; id: string; attachmentId: string }> }
) {
  const { slug, id, attachmentId } = await ctx.params;
  const opened = await openCalendar(request, slug);
  if (!opened.ok) return opened.response;

  try {
    const item = await getItem(opened.ctx.department.slug, id);
    if (!item) return notFound("That item no longer exists.");

    const signed = await attachmentDownloadUrl(id, attachmentId);
    if (!signed) return notFound("That file is no longer attached.");

    // `json=1` for callers that want the URL itself (e.g. to open a preview).
    if (new URL(request.url).searchParams.get("json") === "1") {
      return jsonOk(signed);
    }
    return Response.redirect(signed.url, 302);
  } catch (err) {
    return serverError(err);
  }
}

/** DELETE — detach the file and remove it from storage. */
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ slug: string; id: string; attachmentId: string }> }
) {
  const { slug, id, attachmentId } = await ctx.params;
  const opened = await openCalendar(request, slug, { write: true });
  if (!opened.ok) return opened.response;

  const body = (await readJson(request)) ?? {};

  try {
    const item = await getItem(opened.ctx.department.slug, id);
    if (!item) return notFound("That item no longer exists.");

    const removed = await removeAttachment(
      id,
      attachmentId,
      actorFrom(opened.ctx, body.actorName)
    );
    if (!removed) return notFound("That file is no longer attached.");
    return jsonOk({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
