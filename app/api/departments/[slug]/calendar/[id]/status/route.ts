import {
  actorFrom,
  badRequest,
  conflict,
  jsonOk,
  notFound,
  openCalendar,
  readJson,
  serverError,
} from "@/lib/content-calendar/apiSupport";
import { getItem, setStatus } from "@/lib/content-calendar/repo";
import { isCalendarStatus, transitionRejection } from "@/lib/content-calendar/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST — move an item along the pipeline.
 *
 * The one place status changes. The move is validated against
 * lib/content-calendar/workflow.ts, and the write is conditional on the item
 * still being where the caller thinks it is, so two people acting at once end
 * with one move and one clear "it moved under you" rather than a silent
 * overwrite.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await ctx.params;
  const opened = await openCalendar(request, slug, { write: true });
  if (!opened.ok) return opened.response;

  const body = await readJson(request);
  if (!body) return badRequest("Invalid JSON body.");

  if (!isCalendarStatus(body.to)) return badRequest("Unknown target status.");
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";

  try {
    const item = await getItem(opened.ctx.department.slug, id);
    if (!item) return notFound("That item no longer exists.");

    const rejection = transitionRejection(item.status, body.to, note);
    if (rejection) return badRequest(rejection);

    const moved = await setStatus(
      opened.ctx.department.slug,
      id,
      item.status,
      body.to,
      note,
      actorFrom(opened.ctx, body.actorName)
    );
    if (!moved) {
      return conflict(
        "Someone else moved this item a moment ago. Reload to see where it is now."
      );
    }
    return jsonOk({ item: moved });
  } catch (err) {
    return serverError(err);
  }
}
