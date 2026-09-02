/** GET downloads the GL mapping table as CSV. */

import { errorResponse } from "@/lib/financial-statements/api";
import { store } from "@/lib/financial-statements/repo";
import { authorize } from "@/lib/financial-statements/roles";
import { mappingsToCsv } from "@/lib/financial-statements/mapping/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    authorize("view");
    const csv = mappingsToCsv(await store.listMappings());
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="keybase-gl-mappings.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error, 500);
  }
}
