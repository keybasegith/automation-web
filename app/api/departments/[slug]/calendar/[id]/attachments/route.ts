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
  beginAttachmentUpload,
  completeAttachmentUpload,
} from "@/lib/content-calendar/attachments";
import { getItem } from "@/lib/content-calendar/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Uploads are two calls, because the file body never passes through here:
 *   POST → a presigned PUT URL the browser uploads to directly
 *   PUT  → verify what landed in storage and record it against the item
 */

/** POST {fileName, fileType, fileSize} → presigned upload. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await ctx.params;
  const opened = await openCalendar(request, slug, { write: true });
  if (!opened.ok) return opened.response;

  const body = await readJson(request);
  if (!body) return badRequest("Invalid JSON body.");

  const fileName = typeof body.fileName === "string" ? body.fileName : "";
  const fileType = typeof body.fileType === "string" ? body.fileType : "";
  const fileSize = typeof body.fileSize === "number" ? body.fileSize : 0;
  if (!fileName || !fileType) return badRequest("Missing file details.");

  try {
    const item = await getItem(opened.ctx.department.slug, id);
    if (!item) return notFound("That item no longer exists.");

    const result = await beginAttachmentUpload({ itemId: id, fileName, fileType, fileSize });
    if (!result.ok) return badRequest(result.error);
    return jsonOk(result.upload);
  } catch (err) {
    return serverError(err);
  }
}

/** PUT {key, fileName} after the presigned upload succeeds. */
export async function PUT(
  request: Request,
  ctx: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await ctx.params;
  const opened = await openCalendar(request, slug, { write: true });
  if (!opened.ok) return opened.response;

  const body = await readJson(request);
  if (!body) return badRequest("Invalid JSON body.");

  const key = typeof body.key === "string" ? body.key : "";
  const fileName = typeof body.fileName === "string" ? body.fileName : "";
  if (!key || !fileName) return badRequest("Missing upload details.");

  try {
    const item = await getItem(opened.ctx.department.slug, id);
    if (!item) return notFound("That item no longer exists.");

    const result = await completeAttachmentUpload({
      itemId: id,
      key,
      fileName,
      actor: actorFrom(opened.ctx, body.actorName),
    });
    if (!result.ok) return badRequest(result.error);
    return jsonOk({ attachment: result.attachment }, 201);
  } catch (err) {
    return serverError(err);
  }
}
