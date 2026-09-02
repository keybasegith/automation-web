import { errorResponse, toPackageDto } from "@/lib/financial-statements/api";
import { loadPackage } from "@/lib/financial-statements/service";
import { store } from "@/lib/financial-statements/repo";
import { authorize } from "@/lib/financial-statements/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: { params: Promise<{ packageId: string }> }) {
  try {
    authorize("view");
    const { packageId } = await ctx.params;
    const view = await loadPackage(packageId);
    if (!view) return Response.json({ error: "No such statement package." }, { status: 404 });
    return Response.json({
      package: toPackageDto(view.statementPackage, view.version.version, view.version.createdAt, view.result),
    });
  } catch (error) {
    return errorResponse(error, 500);
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ packageId: string }> }) {
  try {
    const actor = authorize("generate");
    const { packageId } = await ctx.params;
    const found = await store.getPackage(packageId);
    if (!found) return Response.json({ error: "No such statement package." }, { status: 404 });
    if (found.status === "finalized") {
      return Response.json({ error: "Reopen the package before deleting it." }, { status: 409 });
    }
    await store.deletePackage(packageId);
    await store.appendAudit({
      packageId: null, type: "package_reopened", actor: actor.name,
      at: new Date().toISOString(), summary: `Deleted package for ${found.periodLabel}.`,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, 500);
  }
}
