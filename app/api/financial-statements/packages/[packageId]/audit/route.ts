import { errorResponse } from "@/lib/financial-statements/api";
import { store } from "@/lib/financial-statements/repo";
import { authorize } from "@/lib/financial-statements/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: { params: Promise<{ packageId: string }> }) {
  try {
    authorize("view");
    const { packageId } = await ctx.params;
    return Response.json({ events: await store.listAudit(packageId) });
  } catch (error) {
    return errorResponse(error, 500);
  }
}
