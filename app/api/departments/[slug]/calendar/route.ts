import {
  actorFrom,
  badRequest,
  jsonOk,
  openCalendar,
  readJson,
  serverError,
} from "@/lib/content-calendar/apiSupport";
import { createItem, listItems } from "@/lib/content-calendar/repo";
import {
  isCalendarStatus,
  isContentType,
  type CalendarStatus,
} from "@/lib/content-calendar/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const text = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/** GET /api/departments/:slug/calendar?from=&to=&status= — items in a range. */
export async function GET(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const opened = await openCalendar(request, slug);
  if (!opened.ok) return opened.response;

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const statusParam = url.searchParams.get("status");

  if (from && !DATE.test(from)) return badRequest("from must be YYYY-MM-DD.");
  if (to && !DATE.test(to)) return badRequest("to must be YYYY-MM-DD.");
  if (statusParam && !isCalendarStatus(statusParam)) {
    return badRequest(`Unknown status: ${statusParam}`);
  }

  try {
    const items = await listItems({
      department: opened.ctx.department.slug,
      from: from ?? undefined,
      to: to ?? undefined,
      status: (statusParam as CalendarStatus | null) ?? undefined,
    });
    return jsonOk({ items });
  } catch (err) {
    return serverError(err);
  }
}

/** POST /api/departments/:slug/calendar — plan a new piece of content. */
export async function POST(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const opened = await openCalendar(request, slug, { write: true });
  if (!opened.ok) return opened.response;

  const body = await readJson(request);
  if (!body) return badRequest("Invalid JSON body.");

  const title = text(body.title, 200);
  if (!title) return badRequest("A title is required.");

  const scheduledOn = text(body.scheduledOn, 10);
  if (!DATE.test(scheduledOn)) return badRequest("A scheduled date (YYYY-MM-DD) is required.");

  const scheduledTimeRaw = text(body.scheduledTime, 5);
  if (scheduledTimeRaw && !TIME.test(scheduledTimeRaw)) {
    return badRequest("The time must be HH:MM, or left empty.");
  }

  const contentType = isContentType(body.contentType) ? body.contentType : "other";
  const status = isCalendarStatus(body.status) ? body.status : "idea";

  try {
    const item = await createItem({
      department: opened.ctx.department.slug,
      title,
      summary: text(body.summary, 4000),
      contentType,
      channel: text(body.channel, 80),
      scheduledOn,
      scheduledTime: scheduledTimeRaw || null,
      ownerName: text(body.ownerName, 60),
      status,
      actor: actorFrom(opened.ctx, body.actorName),
    });
    return jsonOk({ item }, 201);
  } catch (err) {
    return serverError(err);
  }
}
