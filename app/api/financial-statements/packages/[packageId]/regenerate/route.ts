/** POST /api/financial-statements/packages/[packageId]/regenerate — regenerate against the current mapping table as a new version */

import { errorResponse, toPackageDto } from "@/lib/financial-statements/api";
import { regeneratePackage, loadPackage } from "@/lib/financial-statements/service";
import { authorize } from "@/lib/financial-statements/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_request: Request, ctx: { params: Promise<{ packageId: string }> }) {
  try {
    const actor = authorize("generate");
    const { packageId } = await ctx.params;

    const outcome = await regeneratePackage(packageId, actor);
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
