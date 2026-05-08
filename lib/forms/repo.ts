import { getServerSupabase } from "@/lib/supabaseClient";
import type {
  BpProcessing,
  BpStatus,
  ComplianceDecision,
  ComplianceReview,
  ConsistencyCheckResult,
  ConsistencyFlag,
  ConsistencyOverallStatus,
  CrqDraft,
  CrqField,
  CrqFields,
  ExtractedNAAFData,
  FieldSource,
  KycDraft,
  KycField,
  KycFields,
  NaafField,
  NaafFields,
  SubmissionStatus,
  SubmissionSummary,
} from "@/lib/forms/types";

const BUCKET = "form-processing";

// -----------------------------------------------------------------------------
// Submissions
// -----------------------------------------------------------------------------

interface SubmissionRow {
  id: string;
  client_name: string;
  advisor_id: string | null;
  status: SubmissionStatus;
  mismatch_count: number;
  created_at: string;
  updated_at: string;
}

export type SubmissionRecord = SubmissionRow;

export async function createSubmission(input: {
  clientName: string;
  advisorId: string;
}): Promise<SubmissionRecord> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("submissions")
    .insert({
      client_name: input.clientName,
      advisor_id: input.advisorId,
      status: "naaf_uploaded",
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`Submission insert failed: ${error?.message ?? "no row"}`);
  }
  return data as SubmissionRecord;
}

export async function getSubmissionById(
  id: string
): Promise<SubmissionRecord | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Submission lookup failed: ${error.message}`);
  return (data as SubmissionRecord | null) ?? null;
}

export async function updateSubmissionStatus(
  id: string,
  status: SubmissionStatus,
  patch: { mismatchCount?: number } = {}
): Promise<SubmissionRecord> {
  const supabase = getServerSupabase();
  const update: Record<string, unknown> = { status };
  if (patch.mismatchCount !== undefined) update.mismatch_count = patch.mismatchCount;
  const { data, error } = await supabase
    .from("submissions")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(
      `Submission update failed: ${error?.message ?? "not found"}`
    );
  }
  return data as SubmissionRecord;
}

interface AdvisorJoin {
  email: string;
}

interface SubmissionRowWithJoins extends SubmissionRow {
  advisor: AdvisorJoin | null;
  compliance_reviews: { decision: ComplianceDecision; reviewed_at: string }[] | null;
  bp_processing: { status: BpStatus } | null;
}

export async function listSubmissionsForDashboard(): Promise<SubmissionSummary[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("submissions")
    .select(
      `*,
       advisor:users!submissions_advisor_id_fkey(email),
       compliance_reviews(decision, reviewed_at),
       bp_processing(status)`
    )
    .order("updated_at", { ascending: false });
  if (error) {
    throw new Error(`Submissions list failed: ${error.message}`);
  }

  return ((data ?? []) as unknown as SubmissionRowWithJoins[]).map((row) => {
    const reviews = row.compliance_reviews ?? [];
    const latestReview = [...reviews].sort((a, b) =>
      a.reviewed_at < b.reviewed_at ? 1 : -1
    )[0];
    return {
      id: row.id,
      clientName: row.client_name,
      advisorId: row.advisor_id,
      advisorName: row.advisor?.email ?? null,
      status: row.status,
      mismatchCount: row.mismatch_count,
      lastUpdated: row.updated_at,
      createdAt: row.created_at,
      complianceStatus: latestReview?.decision ?? null,
      bpStatus: row.bp_processing?.status ?? null,
    } satisfies SubmissionSummary;
  });
}

// -----------------------------------------------------------------------------
// Uploaded documents + storage
// -----------------------------------------------------------------------------

export async function uploadNaafFile(args: {
  submissionId: string;
  fileName: string;
  fileType: string;
  fileBuffer: ArrayBuffer | Buffer;
  uploadedBy: string;
}): Promise<{ fileUrl: string; documentId: string }> {
  const supabase = getServerSupabase();
  const buffer = Buffer.isBuffer(args.fileBuffer)
    ? args.fileBuffer
    : Buffer.from(new Uint8Array(args.fileBuffer as ArrayBuffer));

  const safeName = args.fileName.replace(/[^A-Za-z0-9._-]+/g, "_");
  const path = `${args.submissionId}/naaf-${Date.now()}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: args.fileType || "application/octet-stream",
      upsert: false,
    });
  if (upErr) {
    throw new Error(`NAAF upload failed: ${upErr.message}`);
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Could not resolve public URL for the uploaded NAAF.");
  }

  const { data: docRow, error: insErr } = await supabase
    .from("uploaded_documents")
    .insert({
      submission_id: args.submissionId,
      file_name: args.fileName,
      file_type: args.fileType,
      file_url: data.publicUrl,
      uploaded_by: args.uploadedBy,
      document_type: "NAAF",
    })
    .select("id")
    .single();
  if (insErr || !docRow) {
    throw new Error(
      `Uploaded document record insert failed: ${insErr?.message ?? "no row"}`
    );
  }

  return { fileUrl: data.publicUrl, documentId: docRow.id as string };
}

export async function getNaafDocument(
  submissionId: string
): Promise<{ fileUrl: string; fileName: string; fileType: string | null } | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("uploaded_documents")
    .select("file_url, file_name, file_type")
    .eq("submission_id", submissionId)
    .eq("document_type", "NAAF")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`Uploaded doc lookup failed: ${error.message}`);
  }
  if (!data) return null;
  return {
    fileUrl: data.file_url as string,
    fileName: data.file_name as string,
    fileType: (data.file_type as string | null) ?? null,
  };
}

// -----------------------------------------------------------------------------
// Extracted NAAF data
// -----------------------------------------------------------------------------

interface ExtractedRow {
  submission_id: string;
  raw_text: string;
  fields: NaafFields;
  field_confidence_map: Partial<Record<NaafField, number>>;
  field_source_map: Partial<Record<NaafField, FieldSource>>;
  extraction_confidence: number;
  extraction_warnings: string[];
  updated_at: string;
}

export async function upsertExtractedData(input: {
  submissionId: string;
  data: ExtractedNAAFData;
}): Promise<void> {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("extracted_naaf_data")
    .upsert(
      {
        submission_id: input.submissionId,
        raw_text: input.data.rawText,
        fields: input.data.fields,
        field_confidence_map: input.data.fieldConfidenceMap,
        field_source_map: input.data.fieldSourceMap,
        extraction_confidence: input.data.extractionConfidence,
        extraction_warnings: input.data.extractionWarnings,
      },
      { onConflict: "submission_id" }
    );
  if (error) {
    throw new Error(`Extracted data save failed: ${error.message}`);
  }
}

export async function getExtractedData(
  submissionId: string
): Promise<ExtractedNAAFData | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("extracted_naaf_data")
    .select("*")
    .eq("submission_id", submissionId)
    .maybeSingle();
  if (error) {
    throw new Error(`Extracted data read failed: ${error.message}`);
  }
  if (!data) return null;
  const row = data as unknown as ExtractedRow;
  return {
    fields: row.fields,
    rawText: row.raw_text,
    extractionConfidence: Number(row.extraction_confidence),
    extractionWarnings: row.extraction_warnings ?? [],
    fieldConfidenceMap: row.field_confidence_map ?? {},
    fieldSourceMap: row.field_source_map ?? {},
  };
}

// -----------------------------------------------------------------------------
// KYC drafts
// -----------------------------------------------------------------------------

interface KycRow {
  submission_id: string;
  fields: KycFields;
  field_source_map: Partial<Record<KycField, FieldSource>>;
  missing_fields: KycField[];
  ready: boolean;
  updated_at: string;
}

export async function upsertKycDraft(input: {
  submissionId: string;
  draft: KycDraft;
}): Promise<void> {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("kyc_drafts")
    .upsert(
      {
        submission_id: input.submissionId,
        fields: input.draft.fields,
        field_source_map: input.draft.fieldSourceMap,
        missing_fields: input.draft.missingFields,
        ready: input.draft.ready,
      },
      { onConflict: "submission_id" }
    );
  if (error) {
    throw new Error(`KYC draft save failed: ${error.message}`);
  }
}

export async function getKycDraft(
  submissionId: string
): Promise<KycDraft | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("kyc_drafts")
    .select("*")
    .eq("submission_id", submissionId)
    .maybeSingle();
  if (error) {
    throw new Error(`KYC draft read failed: ${error.message}`);
  }
  if (!data) return null;
  const row = data as unknown as KycRow;
  return {
    fields: row.fields,
    fieldSourceMap: row.field_source_map ?? {},
    missingFields: row.missing_fields ?? [],
    ready: Boolean(row.ready),
  };
}

// -----------------------------------------------------------------------------
// CRQ drafts
// -----------------------------------------------------------------------------

interface CrqRow {
  submission_id: string;
  fields: CrqFields;
  field_source_map: Partial<Record<CrqField, FieldSource>>;
  missing_fields: CrqField[];
  needs_client_confirmation_fields: CrqField[];
  ready: boolean;
  updated_at: string;
}

export async function upsertCrqDraft(input: {
  submissionId: string;
  draft: CrqDraft;
}): Promise<void> {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("crq_drafts")
    .upsert(
      {
        submission_id: input.submissionId,
        fields: input.draft.fields,
        field_source_map: input.draft.fieldSourceMap,
        missing_fields: input.draft.missingFields,
        needs_client_confirmation_fields: input.draft.needsClientConfirmationFields,
        ready: input.draft.ready,
      },
      { onConflict: "submission_id" }
    );
  if (error) {
    throw new Error(`CRQ draft save failed: ${error.message}`);
  }
}

export async function getCrqDraft(
  submissionId: string
): Promise<CrqDraft | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("crq_drafts")
    .select("*")
    .eq("submission_id", submissionId)
    .maybeSingle();
  if (error) {
    throw new Error(`CRQ draft read failed: ${error.message}`);
  }
  if (!data) return null;
  const row = data as unknown as CrqRow;
  return {
    fields: row.fields,
    fieldSourceMap: row.field_source_map ?? {},
    missingFields: row.missing_fields ?? [],
    needsClientConfirmationFields: row.needs_client_confirmation_fields ?? [],
    ready: Boolean(row.ready),
  };
}

// -----------------------------------------------------------------------------
// Consistency results
// -----------------------------------------------------------------------------

interface ConsistencyRow {
  id: string;
  submission_id: string;
  overall_status: ConsistencyOverallStatus;
  flags: ConsistencyFlag[];
  created_at: string;
}

export async function insertConsistencyResult(input: {
  submissionId: string;
  result: ConsistencyCheckResult;
}): Promise<ConsistencyCheckResult> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("consistency_check_results")
    .insert({
      submission_id: input.submissionId,
      overall_status: input.result.overallStatus,
      flags: input.result.flags,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(
      `Consistency result insert failed: ${error?.message ?? "no row"}`
    );
  }
  const row = data as unknown as ConsistencyRow;
  return {
    id: row.id,
    submissionId: row.submission_id,
    overallStatus: row.overall_status,
    flags: row.flags ?? [],
    createdAt: row.created_at,
  };
}

export async function getLatestConsistencyResult(
  submissionId: string
): Promise<ConsistencyCheckResult | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("consistency_check_results")
    .select("*")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`Consistency result read failed: ${error.message}`);
  }
  if (!data) return null;
  const row = data as unknown as ConsistencyRow;
  return {
    id: row.id,
    submissionId: row.submission_id,
    overallStatus: row.overall_status,
    flags: row.flags ?? [],
    createdAt: row.created_at,
  };
}

// -----------------------------------------------------------------------------
// Compliance reviews
// -----------------------------------------------------------------------------

interface ComplianceReviewRow {
  id: string;
  submission_id: string;
  reviewer_id: string | null;
  decision: ComplianceDecision;
  notes: string | null;
  reviewed_at: string;
  pin_verified: boolean;
}

export async function insertComplianceReview(input: {
  submissionId: string;
  reviewerId: string;
  decision: ComplianceDecision;
  notes: string | null;
  pinVerified: boolean;
}): Promise<ComplianceReview> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("compliance_reviews")
    .insert({
      submission_id: input.submissionId,
      reviewer_id: input.reviewerId,
      decision: input.decision,
      notes: input.notes,
      pin_verified: input.pinVerified,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(
      `Compliance review insert failed: ${error?.message ?? "no row"}`
    );
  }
  const row = data as unknown as ComplianceReviewRow;
  return {
    id: row.id,
    submissionId: row.submission_id,
    reviewerId: row.reviewer_id,
    decision: row.decision,
    notes: row.notes,
    reviewedAt: row.reviewed_at,
    pinVerified: row.pin_verified,
  };
}

export async function listComplianceReviews(
  submissionId: string
): Promise<ComplianceReview[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("compliance_reviews")
    .select("*")
    .eq("submission_id", submissionId)
    .order("reviewed_at", { ascending: false });
  if (error) {
    throw new Error(`Compliance review read failed: ${error.message}`);
  }
  return ((data ?? []) as unknown as ComplianceReviewRow[]).map((row) => ({
    id: row.id,
    submissionId: row.submission_id,
    reviewerId: row.reviewer_id,
    decision: row.decision,
    notes: row.notes,
    reviewedAt: row.reviewed_at,
    pinVerified: row.pin_verified,
  }));
}

// -----------------------------------------------------------------------------
// BP processing
// -----------------------------------------------------------------------------

interface BpProcessingRow {
  submission_id: string;
  status: BpStatus;
  pushed_to_windfund_at: string | null;
  bp_user_id: string | null;
  notes: string | null;
  updated_at: string;
}

export async function upsertBpProcessing(input: {
  submissionId: string;
  status?: BpStatus;
  bpUserId?: string;
  notes?: string;
  pushedToWindFundAt?: string;
}): Promise<BpProcessing> {
  const supabase = getServerSupabase();
  const payload: Record<string, unknown> = { submission_id: input.submissionId };
  if (input.status !== undefined) payload.status = input.status;
  if (input.bpUserId !== undefined) payload.bp_user_id = input.bpUserId;
  if (input.notes !== undefined) payload.notes = input.notes;
  if (input.pushedToWindFundAt !== undefined)
    payload.pushed_to_windfund_at = input.pushedToWindFundAt;

  const { data, error } = await supabase
    .from("bp_processing")
    .upsert(payload, { onConflict: "submission_id" })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(
      `BP processing upsert failed: ${error?.message ?? "no row"}`
    );
  }
  const row = data as unknown as BpProcessingRow;
  return {
    submissionId: row.submission_id,
    status: row.status,
    pushedToWindFundAt: row.pushed_to_windfund_at,
    bpUserId: row.bp_user_id,
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

export async function getBpProcessing(
  submissionId: string
): Promise<BpProcessing | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("bp_processing")
    .select("*")
    .eq("submission_id", submissionId)
    .maybeSingle();
  if (error) {
    throw new Error(`BP processing read failed: ${error.message}`);
  }
  if (!data) return null;
  const row = data as unknown as BpProcessingRow;
  return {
    submissionId: row.submission_id,
    status: row.status,
    pushedToWindFundAt: row.pushed_to_windfund_at,
    bpUserId: row.bp_user_id,
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

export async function listApprovedBpPackages(): Promise<
  Array<SubmissionSummary & { bpUpdatedAt: string | null; bpNotes: string | null }>
> {
  const supabase = getServerSupabase();
  // Join: bp_processing has rows iff a submission has been sent_to_bp
  // (or further). The dashboard only ever shows compliance-approved rows, so
  // we filter by submission status.
  const { data, error } = await supabase
    .from("submissions")
    .select(
      `*,
       advisor:users!submissions_advisor_id_fkey(email),
       compliance_reviews(decision, reviewed_at),
       bp_processing(status, updated_at, notes)`
    )
    .in("status", ["sent_to_bp", "pushed_to_windfund", "approved_by_compliance"])
    .order("updated_at", { ascending: false });
  if (error) {
    throw new Error(`BP queue read failed: ${error.message}`);
  }
  type BpJoin = {
    status: BpStatus;
    updated_at: string;
    notes: string | null;
  };
  type Row = SubmissionRowWithJoins & {
    bp_processing: BpJoin | BpJoin[] | null;
  };
  return ((data ?? []) as unknown as Row[]).map((row) => {
    const reviews = row.compliance_reviews ?? [];
    const latestReview = [...reviews].sort((a, b) =>
      a.reviewed_at < b.reviewed_at ? 1 : -1
    )[0];
    const bp = Array.isArray(row.bp_processing)
      ? row.bp_processing[0]
      : row.bp_processing;
    return {
      id: row.id,
      clientName: row.client_name,
      advisorId: row.advisor_id,
      advisorName: row.advisor?.email ?? null,
      status: row.status,
      mismatchCount: row.mismatch_count,
      lastUpdated: row.updated_at,
      createdAt: row.created_at,
      complianceStatus: latestReview?.decision ?? null,
      bpStatus: bp?.status ?? null,
      bpUpdatedAt: bp?.updated_at ?? null,
      bpNotes: bp?.notes ?? null,
    };
  });
}
