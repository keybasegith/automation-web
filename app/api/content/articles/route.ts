import { NextResponse } from "next/server";
import { isResponse, readJson, requireUser, respond, serverError } from "@/lib/content/http";
import { createArticle, listForActor } from "@/lib/content/service";
import { getUsersByIds } from "@/lib/content/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  → the article list for the signed-in user, filtered by their role.
 * POST → create a new article and its first draft revision.
 *
 * The list's SCOPE is decided server-side from the actor's role, not from a
 * query parameter: an advisor's request is filtered to their own articles
 * inside lib/content/service.ts, so no crafted query can widen it.
 */

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (isResponse(auth)) return auth.response;

  const url = new URL(req.url);
  const list = (name: string) =>
    url.searchParams.getAll(name).flatMap((v) => v.split(",")).filter(Boolean);

  const scopeParam = url.searchParams.get("scope");
  const scope =
    scopeParam === "mine" || scopeParam === "review" || scopeParam === "all"
      ? scopeParam
      : undefined;

  try {
    const result = await listForActor(auth.user, {
      search: url.searchParams.get("search") ?? undefined,
      statuses: list("status"),
      contentTypes: list("type"),
      updatedAfter: url.searchParams.get("updatedAfter") ?? undefined,
      scope,
    });
    if (!result.ok) return respond(result);

    // Author names for the table, resolved in one query rather than per row.
    const owners = await getUsersByIds(result.value.items.map((i) => i.ownerId));
    return NextResponse.json({
      items: result.value.items.map((item) => ({
        ...item,
        ownerName: owners.get(item.ownerId)?.name ?? "Unknown",
      })),
      counts: result.value.counts,
      viewer: { id: auth.user.id, role: auth.user.role, name: auth.user.name },
    });
  } catch (err) {
    return serverError(err, "Could not load your articles.");
  }
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (isResponse(auth)) return auth.response;

  const parsed = await readJson(req);
  if ("response" in parsed) return parsed.response;

  try {
    return respond(
      await createArticle(auth.user, {
        contentType: parsed.body.contentType,
        title: parsed.body.title,
      })
    );
  } catch (err) {
    return serverError(err, "Could not create the article.");
  }
}
