import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminUserFromRequest } from "@/lib/admin/auth";
import { isCmsResource } from "@/lib/cms/registry";
import { applyAction, getDocForAdmin, type CmsAction } from "@/lib/cms/service";
import type { CmsResource } from "@/lib/cms/types";

/**
 * Publishing changes live content, so any statically-cached public pages that
 * render it must be refreshed. Global areas (settings/footer/navigation) live in
 * components shared across every page, so we revalidate the whole layout tree;
 * executives only affect the leadership page.
 */
function revalidateForResource(resource: CmsResource): void {
  if (resource === "executives") {
    revalidatePath("/key-executives");
  } else {
    revalidatePath("/", "layout");
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS: CmsAction[] = [
  "save_draft",
  "publish",
  "discard_draft",
  "restore_version",
];

/**
 * Generic CMS endpoint shared by every editable resource.
 *   GET  → the document (draft + published + version metadata) for editing.
 *   POST → apply one action: save_draft | publish | discard_draft | restore_version.
 * Every request is authenticated and attributed to the signed-in admin.
 */

export async function GET(
  req: Request,
  ctx: { params: Promise<{ resource: string }> }
) {
  const user = adminUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { resource } = await ctx.params;
  if (!isCmsResource(resource)) {
    return NextResponse.json({ error: "Unknown section." }, { status: 404 });
  }
  try {
    return NextResponse.json({ doc: await getDocForAdmin(resource) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ resource: string }> }
) {
  const user = adminUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { resource } = await ctx.params;
  if (!isCmsResource(resource)) {
    return NextResponse.json({ error: "Unknown section." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const action = body.action as CmsAction;
  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const result = await applyAction(
    resource,
    action,
    {
      content: body.content,
      changeSummary:
        typeof body.changeSummary === "string" ? body.changeSummary : undefined,
      versionId:
        typeof body.versionId === "string" ? body.versionId : undefined,
    },
    user
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if (action === "publish") {
    revalidateForResource(resource);
  }
  return NextResponse.json({ doc: result.doc });
}
