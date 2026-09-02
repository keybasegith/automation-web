import { errorResponse } from "@/lib/financial-statements/api";
import { store } from "@/lib/financial-statements/repo";
import { authorize } from "@/lib/financial-statements/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    authorize("view");
    return Response.json({ packages: await store.listPackages() });
  } catch (error) {
    return errorResponse(error, 500);
  }
}
