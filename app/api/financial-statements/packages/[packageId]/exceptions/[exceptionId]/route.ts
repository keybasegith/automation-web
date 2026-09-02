import { errorResponse, toExceptionDto } from "@/lib/financial-statements/api";
import { resolveException } from "@/lib/financial-statements/service";
import { authorize } from "@/lib/financial-statements/roles";
import type { ExceptionStatus } from "@/lib/financial-statements/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: ExceptionStatus[] = ["open", "resolved", "accepted"];

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ packageId: string; exceptionId: string }> }
) {
  try {
    const actor = authorize("resolve_exception");
    const { packageId, exceptionId } = await ctx.params;

    const body = (await request.json()) as { status?: string; note?: string };
    const status = body.status as ExceptionStatus | undefined;
    if (!status || !STATUSES.includes(status)) {
      return Response.json({ error: `status must be one of ${STATUSES.join(", ")}.` }, { status: 400 });
    }

    const updated = await resolveException(
      packageId, decodeURIComponent(exceptionId), status, actor, body.note
    );
    if (!updated) return Response.json({ error: "No such exception." }, { status: 404 });
    return Response.json({ exception: toExceptionDto(updated) });
  } catch (error) {
    return errorResponse(error, 500);
  }
}
