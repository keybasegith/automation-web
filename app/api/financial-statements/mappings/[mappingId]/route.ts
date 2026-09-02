/** PATCH enables or disables one mapping. Mappings are disabled, never deleted. */

import { errorResponse, toMappingDto } from "@/lib/financial-statements/api";
import { store } from "@/lib/financial-statements/repo";
import { authorize } from "@/lib/financial-statements/roles";
import { validateMappings } from "@/lib/financial-statements/mapping/validateMappings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, ctx: { params: Promise<{ mappingId: string }> }) {
  try {
    const actor = authorize("edit_mapping");
    const { mappingId } = await ctx.params;
    const body = (await request.json()) as { status?: string };
    if (body.status !== "active" && body.status !== "inactive") {
      return Response.json({ error: "status must be active or inactive." }, { status: 400 });
    }

    const rules = await store.listMappings();
    const target = rules.find((r) => r.id === mappingId);
    if (!target) return Response.json({ error: "No such mapping." }, { status: 404 });

    // Re-enabling can reintroduce a conflict, so the table is re-checked.
    if (body.status === "active") {
      const validation = validateMappings(
        rules.map((r) => (r.id === mappingId ? { ...r, status: "active" as const } : r))
      );
      if (!validation.isValid) {
        return Response.json({ error: validation.errors[0], validation }, { status: 422 });
      }
    }

    const updated = await store.setMappingStatus(mappingId, body.status);
    if (!updated) return Response.json({ error: "No such mapping." }, { status: 404 });

    await store.appendAudit({
      packageId: null, type: "mapping_changed", actor: actor.name, at: new Date().toISOString(),
      summary: `${body.status === "active" ? "Enabled" : "Disabled"} mapping ${mappingId}.`,
    });

    return Response.json({ mapping: toMappingDto(updated) });
  } catch (error) {
    return errorResponse(error, 500);
  }
}
