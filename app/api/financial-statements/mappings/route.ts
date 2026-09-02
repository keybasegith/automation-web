/** GET lists the GL mapping table; POST creates or updates one mapping. */

import { errorResponse, toMappingDto } from "@/lib/financial-statements/api";
import { store } from "@/lib/financial-statements/repo";
import { authorize } from "@/lib/financial-statements/roles";
import { validateMappings } from "@/lib/financial-statements/mapping/validateMappings";
import type { MappingRule } from "@/lib/financial-statements/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    authorize("view");
    const rules = await store.listMappings();
    return Response.json({
      mappings: rules.map(toMappingDto),
      mappingVersion: await store.mappingVersion(),
    });
  } catch (error) {
    return errorResponse(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const actor = authorize("edit_mapping");
    const rule = (await request.json()) as MappingRule;
    if (!rule?.id) return Response.json({ error: "A mapping needs an id." }, { status: 400 });

    const existing = await store.listMappings();
    const next = existing.some((r) => r.id === rule.id)
      ? existing.map((r) => (r.id === rule.id ? rule : r))
      : [...existing, rule];

    // The whole table is validated, not just the edit: a new rule is only safe
    // in the context of the rules around it.
    const validation = validateMappings(next);
    if (!validation.isValid) {
      return Response.json({ error: validation.errors[0], validation }, { status: 422 });
    }

    await store.upsertMapping(rule);
    await store.appendAudit({
      packageId: null, type: "mapping_changed", actor: actor.name, at: new Date().toISOString(),
      summary: `Saved mapping ${rule.id} → ${rule.excluded ? "excluded" : rule.statementLine}.`,
    });

    return Response.json({ mapping: toMappingDto(rule), validation });
  } catch (error) {
    return errorResponse(error, 500);
  }
}
