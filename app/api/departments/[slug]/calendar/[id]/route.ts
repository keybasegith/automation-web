import {
  actorFrom,
  badRequest,
  jsonOk,
  notFound,
  openCalendar,
  readJson,
  serverError,
} from "@/lib/content-calendar/apiSupport";
import {
  deleteItem,
  getItemDetail,
  updateItem,
  type UpdateItemInput,
} from "@/lib/content-calendar/repo";
import { isContentType } from "@/lib/content-calendar/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const text = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/** GET — the item with its attachments, links, and history. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await ctx.params;
  const opened = await openCalendar(request, slug);
  if (!opened.ok) return opened.response;

  try {
    const item = await getItemDetail(opened.ctx.department.slug, id);
    if (!item) return notFound("That item no longer exists.");
    return jsonOk({ item });
  } catch (err) {
    return serverError(err);
  }
}

/**
 * PATCH — edit the details. Status is deliberately NOT editable here: it moves
 * only through ./status, which validates the transition and records who did it.
 */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await ctx.params;
  const opened = await openCalendar(request, slug, { write: true });
  if (!opened.ok) return opened.response;

  const body = await readJson(request);
  if (!body) return badRequest("Invalid JSON body.");

  const patch: UpdateItemInput = {};

  if (body.title !== undefined) {
    const title = text(body.title, 200);
    if (!title) return badRequest("A title is required.");
    patch.title = title;
  }
  if (body.summary !== undefined) patch.summary = text(body.summary, 4000);
  if (body.channel !== undefined) patch.channel = text(body.channel, 80);
  if (body.ownerName !== undefined) patch.ownerName = text(body.ownerName, 60);
  if (body.contentType !== undefined) {
    if (!isContentType(body.contentType)) return badRequest("Unknown content type.");
    patch.contentType = body.contentType;
  }
  if (body.scheduledOn !== undefined) {
    const scheduledOn = text(body.scheduledOn, 10);
    if (!DATE.test(scheduledOn)) return badRequest("The date must be YYYY-MM-DD.");
    patch.scheduledOn = scheduledOn;
  }
  if (body.scheduledTime !== undefined) {
    const time = text(body.scheduledTime, 5);
    if (time && !TIME.test(time)) return badRequest("The time must be HH:MM, or left empty.");
    patch.scheduledTime = time || null;
  }

  if (Object.keys(patch).length === 0) return badRequest("Nothing to update.");

  try {
    const item = await updateItem(
      opened.ctx.department.slug,
      id,
      patch,
      actorFrom(opened.ctx, body.actorName)
    );
    if (!item) return notFound("That item no longer exists.");
    return jsonOk({ item });
  } catch (err) {
    return serverError(err);
  }
}

/** DELETE — removes the item; attachments and history cascade with it. */
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await ctx.params;
  const opened = await openCalendar(request, slug, { write: true });
  if (!opened.ok) return opened.response;

  try {
    const removed = await deleteItem(opened.ctx.department.slug, id);
    if (!removed) return notFound("That item no longer exists.");
    return jsonOk({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
