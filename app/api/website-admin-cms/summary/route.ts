import { NextResponse } from "next/server";
import { adminUserFromRequest } from "@/lib/admin/auth";
import { ALL_RESOURCES, getResourceConfig } from "@/lib/cms/registry";
import { getDocForAdmin } from "@/lib/cms/service";
import { listAudit } from "@/lib/cms/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Aggregate view used by the Overview dashboard and the Version History screen:
 * per-resource publish state + version history, plus recent activity. All data
 * is real (read from the store) — no analytics or mock numbers.
 */
export async function GET(req: Request) {
  if (!adminUserFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const resources = await Promise.all(
      ALL_RESOURCES.map(async (resource) => {
        const doc = await getDocForAdmin(resource);
        return {
          resource,
          label: getResourceConfig(resource).label,
          hasUnpublishedChanges: doc.hasUnpublishedChanges,
          publishedAt: doc.publishedAt,
          publishedBy: doc.publishedBy,
          draftUpdatedAt: doc.draftUpdatedAt,
          draftUpdatedBy: doc.draftUpdatedBy,
          versions: doc.versions,
        };
      })
    );

    const activity = await listAudit(30);
    return NextResponse.json({ resources, activity });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load." },
      { status: 500 }
    );
  }
}
