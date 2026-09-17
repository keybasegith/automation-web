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
  InvalidLinkError,
  fetchLinkPreview,
  normalizeLinkUrl,
} from "@/lib/content-calendar/linkPreview";
import { getItem, insertLink } from "@/lib/content-calendar/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST {url} — attach a reference link.
 *
 * The Open Graph card is fetched once, here, and stored with the link. Doing
 * it server-side is what makes a preview possible at all (the browser cannot
 * read another origin's HTML), and storing the result means the card renders
 * instantly afterwards and does not change when the page does.
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

  let url: URL;
  try {
    url = normalizeLinkUrl(body.url);
  } catch (err) {
    if (err instanceof InvalidLinkError) return badRequest(err.message);
    throw err;
  }

  try {
    const item = await getItem(opened.ctx.department.slug, id);
    if (!item) return notFound("That item no longer exists.");

    let preview;
    try {
      preview = await fetchLinkPreview(url);
    } catch (err) {
      if (err instanceof InvalidLinkError) return badRequest(err.message);
      throw err;
    }

    const link = await insertLink({
      itemId: id,
      url: preview.url,
      title: preview.title,
      description: preview.description,
      imageUrl: preview.imageUrl,
      siteName: preview.siteName,
      actor: actorFrom(opened.ctx, body.actorName),
    });
    return jsonOk({ link }, 201);
  } catch (err) {
    return serverError(err);
  }
}
