import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit/createAuditLog";
import {
  createSubmission,
  updateSubmissionStatus,
  upsertExtractedData,
} from "@/lib/forms/repo";
import { getActingUser } from "@/lib/forms/roles";
import {
  SAMPLE_KEYS,
  getSampleNaaf,
  type SampleKey,
} from "@/lib/forms/sampleNaafData";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const body = raw as { sampleKey?: unknown };
  const sampleKey = body.sampleKey as SampleKey;
  if (!(SAMPLE_KEYS as readonly string[]).includes(sampleKey as string)) {
    return Response.json(
      { error: `sampleKey must be one of: ${SAMPLE_KEYS.join(", ")}` },
      { status: 400 }
    );
  }

  const advisor = getActingUser();
  const sample = getSampleNaaf(sampleKey);
  const clientName =
    sample.fields.fullName ||
    `${sample.fields.firstName} ${sample.fields.lastName}`.trim() ||
    "Sample client";

  const submission = await createSubmission({
    clientName,
    advisorId: advisor.id,
  });

  const h = await headers();
  const ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent") ?? null;

  await createAuditLog({
    submissionId: submission.id,
    userId: advisor.id,
    userRole: advisor.role,
    action: "naaf_uploaded",
    afterValue: { source: "sample", sampleKey },
    ipAddress,
    userAgent,
  });

  await upsertExtractedData({
    submissionId: submission.id,
    data: {
      ...sample,
      uploadedFileName: `sample-${sampleKey}.txt`,
      uploadDate: new Date().toISOString(),
    },
  });

  await updateSubmissionStatus(submission.id, "extraction_completed");

  await createAuditLog({
    submissionId: submission.id,
    userId: advisor.id,
    userRole: advisor.role,
    action: "ocr_extraction_completed",
    afterValue: {
      provider: "sample",
      confidence: sample.extractionConfidence,
      warnings: sample.extractionWarnings,
    },
    ipAddress,
    userAgent,
  });

  return Response.json({
    submissionId: submission.id,
    extractionConfidence: sample.extractionConfidence,
    warnings: sample.extractionWarnings,
  });
}
