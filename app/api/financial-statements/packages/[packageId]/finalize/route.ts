/** POST /api/financial-statements/packages/[packageId]/finalize — lock the package once every finalization check passes */

import { errorResponse, toPackageDto } from "@/lib/financial-statements/api";
import { finalizePackage, loadPackage } from "@/lib/financial-statements/service";
import { authorize } from "@/lib/financial-statements/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_request: Request, ctx: { params: Promise<{ packageId: string }> }) {
  try {
    const actor = authorize("finalize");
    const { packageId } = await ctx.params;

    const outcome = await finalizePackage(packageId, actor);
    if (!outcome) return Response.json({ error: "No such statement package." }, { status: 404 });

    const view = await loadPackage(packageId);
    if (!view) return Response.json({ error: "No such statement package." }, { status: 404 });
    return Response.json({
      package: toPackageDto(view.statementPackage, view.version.version, view.version.createdAt, view.result),
    });
  } catch (error) {
    return errorResponse(error, 409);
  }
}
