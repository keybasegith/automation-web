import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit/createAuditLog";
import {
  getExtractedData,
  upsertExtractedData,
} from "@/lib/forms/repo";
import { getActingUser } from "@/lib/forms/roles";
import { emptyNaafFields } from "@/lib/forms/sampleNaafData";
import type {
  ExtractedNAAFData,
  FieldSource,
  NaafField,
  NaafFields,
} from "@/lib/forms/types";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ submissionId: string }> }
) {
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }
  const { submissionId } = await ctx.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const body = raw as { fields?: unknown };
  if (!body.fields || typeof body.fields !== "object") {
    return Response.json(
      { error: "fields must be an object." },
      { status: 400 }
    );
  }

  const existing = await getExtractedData(submissionId);
  if (!existing) {
    return Response.json(
      { error: "Submission not found or has no extracted data." },
      { status: 404 }
    );
  }

  const incoming = body.fields as Partial<NaafFields>;
  const merged: NaafFields = { ...emptyNaafFields(), ...existing.fields };
  const sourceMap: Partial<Record<NaafField, FieldSource>> = {
    ...existing.fieldSourceMap,
  };
  const editedFields: Partial<Record<NaafField, { before: string; after: string }>> = {};

  for (const key of Object.keys(merged) as NaafField[]) {
    if (key in incoming) {
      const next = String(incoming[key] ?? "").trim();
      const prev = merged[key];
      if (next !== prev) {
        merged[key] = next;
        sourceMap[key] = next === "" ? "missing" : "manually_edited";
        editedFields[key] = { before: prev, after: next };
      }
    }
  }

  const updated: ExtractedNAAFData = {
    ...existing,
    fields: merged,
    fieldSourceMap: sourceMap,
  };
  await upsertExtractedData({ submissionId, data: updated });

  if (Object.keys(editedFields).length > 0) {
    const acting = getActingUser();
    const h = await headers();
    await createAuditLog({
      submissionId,
      userId: acting.id,
      userRole: acting.role,
      action: "extracted_field_edited",
      beforeValue: Object.fromEntries(
        Object.entries(editedFields).map(([k, v]) => [k, v.before])
      ),
      afterValue: Object.fromEntries(
        Object.entries(editedFields).map(([k, v]) => [k, v.after])
      ),
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent") ?? null,
    });
  }

  return Response.json({ submissionId, edited: Object.keys(editedFields) });
}
