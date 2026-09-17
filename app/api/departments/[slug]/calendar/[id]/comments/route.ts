import {
  actorFrom,
  badRequest,
  jsonOk,
  notFound,
  openCalendar,
  readJson,
  serverError,
} from "@/lib/content-calendar/apiSupport";
import { getItem, recordEvent } from "@/lib/content-calendar/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST — leave a note on an item without moving it. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await ctx.params;
  const opened = await openCalendar(request, slug, { write: true });
  if (!opened.ok) return opened.response;

  const body = await readJson(request);
  if (!body) return badRequest("Invalid JSON body.");

  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  if (!note) return badRequest("Write something first.");

  try {
    const item = await getItem(opened.ctx.department.slug, id);
    if (!item) return notFound("That item no longer exists.");

    const event = await recordEvent({
      itemId: id,
      kind: "comment",
      note,
      actor: actorFrom(opened.ctx, body.actorName),
    });
    return jsonOk({ event }, 201);
  } catch (err) {
    return serverError(err);
  }
}
