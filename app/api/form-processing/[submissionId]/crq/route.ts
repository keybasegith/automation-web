import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit/createAuditLog";
import { generateCrqFromNaaf, isCrqReady } from "@/lib/forms/generateCrqFromNaaf";
import {
  getCrqDraft,
  getExtractedData,
  updateSubmissionStatus,
  upsertCrqDraft,
} from "@/lib/forms/repo";
import { getActingUser } from "@/lib/forms/roles";
import type {
  CrqDraft,
  CrqField,
  CrqFields,
  FieldSource,
} from "@/lib/forms/types";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUIRED: readonly CrqField[] = [
  "clientFullName",
  "accountType",
  "advisorName",
  "comfortWithLoss",
  "primaryInvestmentGoal",
  "fundsNeededWithin",
  "capacityForLoss",
];

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ submissionId: string }> }
) {
  if (!isServerSupabaseConfigured()) {
    return Response.json({ error: "Database is not configured." }, { status: 500 });
  }
  const { submissionId } = await ctx.params;

  const naaf = await getExtractedData(submissionId);
  if (!naaf) {
    return Response.json({ error: "No NAAF data — extract first." }, { status: 400 });
  }

  const draft = generateCrqFromNaaf(naaf);
  await upsertCrqDraft({ submissionId, draft });
  await updateSubmissionStatus(submissionId, "crq_draft_created");

  const acting = getActingUser();
  const h = await headers();
  await createAuditLog({
    submissionId,
    userId: acting.id,
    userRole: acting.role,
    action: "crq_draft_generated",
    afterValue: {
      missingFields: draft.missingFields,
      needsClientConfirmation: draft.needsClientConfirmationFields,
    },
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent") ?? null,
  });

  return Response.json(draft);
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ submissionId: string }> }
) {
  if (!isServerSupabaseConfigured()) {
    return Response.json({ error: "Database is not configured." }, { status: 500 });
  }
  const { submissionId } = await ctx.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const body = raw as { fields?: Partial<CrqFields>; ready?: boolean };

  const existing = await getCrqDraft(submissionId);
  if (!existing) {
    return Response.json(
      { error: "CRQ draft not found — generate first." },
      { status: 404 }
    );
  }

  const merged: CrqFields = { ...existing.fields };
  const sourceMap: Partial<Record<CrqField, FieldSource>> = {
    ...existing.fieldSourceMap,
  };
  const edited: Partial<Record<CrqField, { before: string; after: string }>> = {};
  if (body.fields) {
    for (const k of Object.keys(merged) as CrqField[]) {
      if (k in body.fields) {
        const next = String(body.fields[k] ?? "").trim();
        if (next !== merged[k]) {
          edited[k] = { before: merged[k], after: next };
          merged[k] = next;
          // Once the advisor edits a field it counts as manually entered —
          // even if it had been pre-suggested.
          sourceMap[k] = next === "" ? "missing" : "manually_entered";
        }
      }
    }
  }

  const missingFields: CrqField[] = REQUIRED.filter(
    (f) => !merged[f] || merged[f].trim() === ""
  );
  const ready = body.ready ?? existing.ready;

  const next: CrqDraft = {
    fields: merged,
    fieldSourceMap: sourceMap,
    missingFields,
    needsClientConfirmationFields: existing.needsClientConfirmationFields.filter(
      (f) => sourceMap[f] === "suggested_needs_review"
    ),
    ready: ready && isCrqReady({ ...existing, fields: merged }),
  };
  await upsertCrqDraft({ submissionId, draft: next });

  if (Object.keys(edited).length > 0) {
    const acting = getActingUser();
    const h = await headers();
    await createAuditLog({
      submissionId,
      userId: acting.id,
      userRole: acting.role,
      action: "crq_field_edited",
      beforeValue: Object.fromEntries(
        Object.entries(edited).map(([k, v]) => [k, v.before])
      ),
      afterValue: Object.fromEntries(
        Object.entries(edited).map(([k, v]) => [k, v.after])
      ),
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent") ?? null,
    });
  }

  return Response.json(next);
}
