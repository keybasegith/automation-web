import {
  actorFrom,
  jsonOk,
  notFound,
  openCalendar,
  readJson,
  serverError,
} from "@/lib/content-calendar/apiSupport";
import { deleteLinkRow, getItem, recordEvent } from "@/lib/content-calendar/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** DELETE — remove a reference link from an item. */
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ slug: string; id: string; linkId: string }> }
) {
  const { slug, id, linkId } = await ctx.params;
  const opened = await openCalendar(request, slug, { write: true });
  if (!opened.ok) return opened.response;

  const body = (await readJson(request)) ?? {};

  try {
    const item = await getItem(opened.ctx.department.slug, id);
    if (!item) return notFound("That item no longer exists.");

    const removed = await deleteLinkRow(id, linkId);
    if (!removed) return notFound("That link is already gone.");

    await recordEvent({
      itemId: id,
      kind: "link_removed",
      note: removed.title || removed.url,
      actor: actorFrom(opened.ctx, body.actorName),
    });
    return jsonOk({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
