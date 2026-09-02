/**
 * POST replaces the GL mapping table from a CSV.
 *
 * The upload is validated in full before anything is written: a file that would
 * introduce a conflicting mapping is rejected, and the table on disk is left
 * exactly as it was.
 */

import { errorResponse, toMappingDto } from "@/lib/financial-statements/api";
import { authorize } from "@/lib/financial-statements/roles";
import { csvToMappings } from "@/lib/financial-statements/mapping/csv";
import { saveMappingTable } from "@/lib/financial-statements/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const actor = authorize("edit_mapping");

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Attach a mapping CSV." }, { status: 400 });
    }

    const { rules, errors } = csvToMappings(await file.text());
    if (errors.length > 0) {
      return Response.json({ error: errors[0], errors }, { status: 422 });
    }

    const { validation, rules: saved } = await saveMappingTable(rules, actor);
    if (!saved) {
      return Response.json({ error: validation.errors[0], validation }, { status: 422 });
    }

    return Response.json({ mappings: saved.map(toMappingDto), validation });
  } catch (error) {
    return errorResponse(error, 500);
  }
}
