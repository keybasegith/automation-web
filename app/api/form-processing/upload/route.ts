import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit/createAuditLog";
import { extractTextFromDocument } from "@/lib/ocr/extractTextFromDocument";
import {
  createSubmission,
  updateSubmissionStatus,
  uploadNaafFile,
  upsertExtractedData,
} from "@/lib/forms/repo";
import { getActingUser } from "@/lib/forms/roles";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "text/plain",
  "text/markdown",
];

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "Expected multipart/form-data." },
      { status: 400 }
    );
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File exceeds 10MB." }, { status: 400 });
  }
  const fileType = file.type.toLowerCase();
  if (
    !ALLOWED_TYPES.some((t) => fileType.startsWith(t)) &&
    !file.name.toLowerCase().endsWith(".txt")
  ) {
    return Response.json(
      { error: "Allowed types: PDF, PNG, JPG, JPEG, plain text." },
      { status: 400 }
    );
  }

  const advisor = getActingUser();
  const h = await headers();
  const ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent") ?? null;

  // Stage 1: create the submission with a placeholder client name. The name
  // will be updated as soon as extraction yields one.
  const submission = await createSubmission({
    clientName: file.name.replace(/\.[^.]+$/, ""),
    advisorId: advisor.id,
  });

  await createAuditLog({
    submissionId: submission.id,
    userId: advisor.id,
    userRole: advisor.role,
    action: "naaf_uploaded",
    afterValue: { fileName: file.name, fileType: file.type, size: file.size },
    ipAddress,
    userAgent,
  });

  // Stage 2: upload the bytes to storage.
  const fileBuffer = await file.arrayBuffer();
  await uploadNaafFile({
    submissionId: submission.id,
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    fileBuffer,
    uploadedBy: advisor.id,
  });

  // Stage 3: run the OCR seam. This is deliberately mock-friendly — see
  // lib/ocr/extractTextFromDocument.ts for the cybersecurity TODO.
  await createAuditLog({
    submissionId: submission.id,
    userId: advisor.id,
    userRole: advisor.role,
    action: "ocr_extraction_started",
    ipAddress,
    userAgent,
  });

  const ocr = await extractTextFromDocument({
    fileBuffer,
    fileName: file.name,
    fileType: file.type,
  });

  await upsertExtractedData({
    submissionId: submission.id,
    data: {
      fields: ocr.extractedFields,
      rawText: ocr.rawText,
      extractionConfidence: ocr.extractionConfidence,
      extractionWarnings: ocr.warnings,
      fieldConfidenceMap: ocr.fieldConfidenceMap,
      fieldSourceMap: ocr.fieldSourceMap,
      uploadedFileName: file.name,
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
      provider: ocr.provider,
      confidence: ocr.extractionConfidence,
      warnings: ocr.warnings,
    },
    ipAddress,
    userAgent,
  });

  return Response.json({
    submissionId: submission.id,
    extractionConfidence: ocr.extractionConfidence,
    warnings: ocr.warnings,
    provider: ocr.provider,
  });
}
