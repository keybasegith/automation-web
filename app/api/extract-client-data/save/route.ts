import { logAudit } from "@/lib/db/audit";
import {
  isServerSupabaseConfigured,
  SupabaseConfigError,
} from "@/lib/supabaseClient";
import { getCurrentUser } from "@/lib/currentUser";
import {
  EXTRACTION_FIELDS,
  SOURCE_TYPES,
  type ExtractedClientData,
  type SourceType,
} from "@/lib/extraction/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inSet = <T extends string>(value: unknown, set: readonly T[]): value is T =>
  typeof value === "string" && (set as readonly string[]).includes(value);

interface SaveRequestBody {
  data?: unknown;
  source?: unknown;
  clientId?: unknown;
}

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function validateExtraction(raw: unknown): ExtractedClientData | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const result: Record<string, string | null> = {};
  for (const field of EXTRACTION_FIELDS) {
    const v = record[field];
    if (v === null || v === undefined) {
      result[field] = null;
    } else if (typeof v === "string") {
      result[field] = v.trim().length === 0 ? null : v.trim();
    } else {
      return null; // Unexpected type
    }
  }
  return result as unknown as ExtractedClientData;
}

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  let body: SaveRequestBody;
  try {
    body = (await request.json()) as SaveRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!inSet(body.source, SOURCE_TYPES)) {
    return Response.json(
      { error: `source must be one of: ${SOURCE_TYPES.join(", ")}.` },
      { status: 400 }
    );
  }

  const data = validateExtraction(body.data);
  if (!data) {
    return Response.json(
      { error: "Invalid `data` shape. Expected ExtractedClientData." },
      { status: 400 }
    );
  }

  const clientId = isUuid(body.clientId) ? body.clientId : null;

  const fieldsExtracted = EXTRACTION_FIELDS.filter(
    (f) => data[f] !== null && data[f] !== ""
  ).length;

  try {
    const user = getCurrentUser();
    await logAudit({
      userId: user.id,
      action: "EXTRACT_CLIENT_DATA",
      entityType: "client",
      entityId: clientId ?? user.id, // entity_id is non-null in schema; use the user as a stand-in when no client linked
      metadata: {
        source: body.source,
        fieldsExtracted,
        extractedData: data,
        ...(clientId ? { clientId } : {}),
      },
    });

    return Response.json({ ok: true, fieldsExtracted });
  } catch (err) {
    if (err instanceof SupabaseConfigError) {
      return Response.json({ error: err.message }, { status: 500 });
    }
    return Response.json(
      {
        error: "Failed to save extraction.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
