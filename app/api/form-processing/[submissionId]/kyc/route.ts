import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit/createAuditLog";
import { generateKycFromNaaf, isKycReady } from "@/lib/forms/generateKycFromNaaf";
import {
  getExtractedData,
  getKycDraft,
  updateSubmissionStatus,
  upsertKycDraft,
} from "@/lib/forms/repo";
import { getActingUser } from "@/lib/forms/roles";
import type {
  FieldSource,
  KycDraft,
  KycField,
  KycFields,
} from "@/lib/forms/types";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUIRED: readonly KycField[] = [
  "clientFullName",
  "dateOfBirth",
  "accountType",
  "advisorName",
  "investmentObjective",
  "riskTolerance",
  "timeHorizon",
  "investmentKnowledge",
];

/**
 * POST = (re)generate KYC from confirmed NAAF data.
 */
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

  const draft = generateKycFromNaaf(naaf);
  await upsertKycDraft({ submissionId, draft });
  await updateSubmissionStatus(submissionId, "kyc_draft_created");

  const acting = getActingUser();
  const h = await headers();
  await createAuditLog({
    submissionId,
    userId: acting.id,
    userRole: acting.role,
    action: "kyc_draft_generated",
    afterValue: { missingFields: draft.missingFields },
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent") ?? null,
  });

  return Response.json(draft);
}

/**
 * PATCH = save advisor edits to the KYC draft.
 * Body: { fields: Partial<KycFields>, ready?: boolean }
 */
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
  const body = raw as { fields?: Partial<KycFields>; ready?: boolean };

  const existing = await getKycDraft(submissionId);
  if (!existing) {
    return Response.json(
      { error: "KYC draft not found — generate first." },
      { status: 404 }
    );
  }

  const merged: KycFields = { ...existing.fields };
  const sourceMap: Partial<Record<KycField, FieldSource>> = {
    ...existing.fieldSourceMap,
  };
  const edited: Partial<Record<KycField, { before: string; after: string }>> = {};
  if (body.fields) {
    for (const k of Object.keys(merged) as KycField[]) {
      if (k in body.fields) {
        const next = String(body.fields[k] ?? "").trim();
        if (next !== merged[k]) {
          edited[k] = { before: merged[k], after: next };
          merged[k] = next;
          sourceMap[k] = next === "" ? "missing" : "manually_edited";
        }
      }
    }
  }

  const missingFields: KycField[] = REQUIRED.filter(
    (f) => !merged[f] || merged[f].trim() === ""
  );
  const ready = body.ready ?? existing.ready;

  const next: KycDraft = {
    fields: merged,
    fieldSourceMap: sourceMap,
    missingFields,
    ready: ready && isKycReady({ ...existing, fields: merged }),
  };
  await upsertKycDraft({ submissionId, draft: next });

  if (Object.keys(edited).length > 0) {
    const acting = getActingUser();
    const h = await headers();
    await createAuditLog({
      submissionId,
      userId: acting.id,
      userRole: acting.role,
      action: "kyc_field_edited",
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
