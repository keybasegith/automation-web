/**
 * Persistence for wizard onboardings: the client rows, the onboarding with its
 * full NAAF / CRQ answers, and the generated documents in private storage.
 *
 * Server only — uses the Supabase service-role client. Tables come from
 * migrations 003 and 016.
 *
 * Client rows are kept in step with the NAAF on every save, so the Clients
 * page and its search always show what the application currently says.
 */

import { createHash } from "node:crypto";

import { isEntity } from "@/lib/naaf/completeness";
import type { HolderInfo, NaafState } from "@/lib/naaf/types";
import { isoDateOfBirth } from "@/lib/new-account/sync";
import {
  logOnboardingEvent,
  upsertSignature,
  type OnboardingEventType,
  type OnboardingStatus,
  type SignatureType,
} from "@/lib/onboarding";
import { parseSignatureDataUrl } from "@/lib/signature";
import { getServerSupabase } from "@/lib/supabaseClient";
import type { CrqVariant, RiskLevel } from "@/lib/risk-questionnaire/types";

import { reviveDraft, type OnboardingDraft, type SigningMethod } from "./draft";
import type { RequirementId, SupportingState, SupportingStatus } from "./supporting";
import type { StepId } from "./steps";

export const DOCUMENTS_BUCKET = "client-documents";

/** How long a remote signing link stays valid. */
export const SIGNING_LINK_DAYS = 14;

export const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

// ---------------------------------------------------------------- types

export interface ClientDocument {
  id: string;
  clientId: string;
  onboardingId: string | null;
  kind: "naaf" | "crq" | "supporting" | "other";
  /** For supporting documents: the requirement it satisfies. */
  documentType: string | null;
  crqVariant: CrqVariant | null;
  title: string;
  storagePath: string;
  byteSize: number;
  signed: boolean;
  createdAt: string;
}

export interface WizardOnboarding {
  id: string;
  status: OnboardingStatus;
  draft: OnboardingDraft;
  currentStep: StepId | null;
  visitedSteps: StepId[];
  clientId: string;
  jointClientId: string | null;
  signingMethod: SigningMethod | null;
  signingToken: string;
  signingTokenExpiresAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OnboardingRow {
  id: string;
  status: OnboardingStatus;
  source: "legacy" | "wizard";
  naaf_data: unknown;
  crq_data: unknown;
  supporting_data: unknown;
  crq_variant: CrqVariant | null;
  current_step: string | null;
  visited_steps: string[] | null;
  client_id: string;
  joint_client_id: string | null;
  signing_method: SigningMethod | null;
  signing_token: string;
  signing_token_expires_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DocumentRow {
  id: string;
  client_id: string;
  onboarding_id: string | null;
  kind: ClientDocument["kind"];
  document_type: string | null;
  crq_variant: CrqVariant | null;
  title: string;
  storage_path: string;
  byte_size: number;
  signed: boolean;
  created_at: string;
}

const documentFromRow = (r: DocumentRow): ClientDocument => ({
  id: r.id,
  clientId: r.client_id,
  onboardingId: r.onboarding_id,
  kind: r.kind,
  documentType: r.document_type ?? null,
  crqVariant: r.crq_variant,
  title: r.title,
  storagePath: r.storage_path,
  byteSize: r.byte_size,
  signed: r.signed,
  createdAt: r.created_at,
});

function onboardingFromRow(row: OnboardingRow): WizardOnboarding | null {
  if (row.source !== "wizard") return null;
  const draft = reviveDraft({
    naaf: row.naaf_data,
    crq: row.crq_data,
    variant: row.crq_variant,
    supporting: row.supporting_data,
  });
  if (!draft) return null;
  return {
    id: row.id,
    status: row.status,
    draft,
    currentStep: (row.current_step as StepId | null) ?? null,
    visitedSteps: (row.visited_steps ?? []) as StepId[],
    clientId: row.client_id,
    jointClientId: row.joint_client_id,
    signingMethod: row.signing_method,
    signingToken: row.signing_token,
    signingTokenExpiresAt: row.signing_token_expires_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------- clients

const blankToNull = (v: string): string | null => (v.trim() ? v.trim() : null);

/** The columns a client row takes from one NAAF holder block. */
function clientColumns(holder: HolderInfo, naaf: NaafState, isClientA: boolean) {
  const entity = isClientA && isEntity(holder.holderType);
  const name = entity
    ? holder.surname.trim()
    : [holder.firstName.trim(), holder.surname.trim()].filter(Boolean).join(" ");
  const phone = blankToNull(holder.cellPhone) ?? blankToNull(holder.homePhone) ?? blankToNull(holder.businessPhone);
  return {
    name: name || "(unnamed client)",
    first_name: entity ? null : blankToNull(holder.firstName),
    last_name: blankToNull(holder.surname),
    email: blankToNull(holder.email)?.toLowerCase() ?? null,
    phone,
    date_of_birth: entity ? null : isoDateOfBirth(holder.dob),
    address: blankToNull([holder.apt && `${holder.apt}-`, holder.address].filter(Boolean).join("")),
    city: blankToNull(holder.city),
    country: "Canada",
    employment_status: entity ? null : blankToNull(holder.occupation),
    // Only Client A carries the Client ID printed in the NAAF header.
    keybase_client_id: isClientA ? blankToNull(naaf.clientId) : null,
    is_entity: entity,
    advisor_name: blankToNull(naaf.advisor.name),
  };
}

/**
 * Finds the client this holder already is, if any: by Keybase Client ID, then
 * by email. Re-onboarding an existing client (KYC update, new plan) should add
 * to their record, not create a second one.
 */
async function findExistingClient(columns: ReturnType<typeof clientColumns>): Promise<string | null> {
  const supabase = getServerSupabase();
  if (columns.keybase_client_id) {
    const { data, error } = await supabase
      .from("clients")
      .select("id")
      .eq("keybase_client_id", columns.keybase_client_id)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Client lookup failed: ${error.message}`);
    if (data) return (data as { id: string }).id;
  }
  if (columns.email) {
    const { data, error } = await supabase.from("clients").select("id").eq("email", columns.email).maybeSingle();
    if (error) throw new Error(`Client lookup failed: ${error.message}`);
    if (data) return (data as { id: string }).id;
  }
  return null;
}

async function upsertClient(existingId: string | null, columns: ReturnType<typeof clientColumns>): Promise<string> {
  const supabase = getServerSupabase();
  const id = existingId ?? (await findExistingClient(columns));
  if (id) {
    const { error } = await supabase.from("clients").update(columns).eq("id", id);
    if (error) throw new Error(`Client update failed: ${error.message}`);
    return id;
  }
  const { data, error } = await supabase.from("clients").insert(columns).select("id").single();
  if (error) throw new Error(`Client create failed: ${error.message}`);
  return (data as { id: string }).id;
}

/** The legacy three-level risk_tolerance column, from the CRQ ranking. */
export function legacyRiskTolerance(ranking: RiskLevel | null): "Low" | "Medium" | "High" | null {
  if (ranking === null) return null;
  if (ranking === "Low" || ranking === "Low Medium") return "Low";
  if (ranking === "Medium") return "Medium";
  return "High";
}

export async function setClientRiskTolerance(clientIds: string[], ranking: RiskLevel | null) {
  const tolerance = legacyRiskTolerance(ranking);
  if (!tolerance || clientIds.length === 0) return;
  const { error } = await getServerSupabase()
    .from("clients")
    .update({ risk_tolerance: tolerance, risk_profile: tolerance })
    .in("id", clientIds);
  if (error) throw new Error(`Client risk update failed: ${error.message}`);
}

// ---------------------------------------------------------------- onboardings

const WIZARD_COLUMNS =
  "id,status,source,naaf_data,crq_data,supporting_data,crq_variant,current_step,visited_steps,client_id,joint_client_id,signing_method,signing_token,signing_token_expires_at,completed_at,created_at,updated_at";

export async function createWizardOnboarding(draft: OnboardingDraft, createdBy: string | null): Promise<WizardOnboarding> {
  const clientId = await upsertClient(null, clientColumns(draft.naaf.clientA, draft.naaf, true));
  const jointClientId = draft.naaf.hasJointHolder
    ? await upsertClient(null, clientColumns(draft.naaf.clientB, draft.naaf, false))
    : null;

  const { data, error } = await getServerSupabase()
    .from("onboardings")
    .insert({
      source: "wizard",
      status: "in_progress",
      client_id: clientId,
      joint_client_id: jointClientId,
      naaf_data: draft.naaf,
      crq_data: draft.crq,
      supporting_data: draft.supporting,
      crq_variant: draft.variant,
      created_by: createdBy,
    })
    .select(WIZARD_COLUMNS)
    .single();
  if (error) throw new Error(`Onboarding create failed: ${error.message}`);
  const onboarding = onboardingFromRow(data as OnboardingRow)!;
  await logOnboardingEvent({ onboardingId: onboarding.id, eventType: "created", metadata: { source: "wizard" } });
  return onboarding;
}

export async function getWizardOnboarding(id: string): Promise<WizardOnboarding | null> {
  const { data, error } = await getServerSupabase().from("onboardings").select(WIZARD_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Onboarding lookup failed: ${error.message}`);
  return data ? onboardingFromRow(data as OnboardingRow) : null;
}

export async function getWizardOnboardingByToken(token: string): Promise<WizardOnboarding | null> {
  const { data, error } = await getServerSupabase()
    .from("onboardings")
    .select(WIZARD_COLUMNS)
    .eq("signing_token", token)
    .maybeSingle();
  if (error) throw new Error(`Onboarding lookup failed: ${error.message}`);
  return data ? onboardingFromRow(data as OnboardingRow) : null;
}

/** Statuses in which the answers can still change. */
export const EDITABLE_STATUSES: readonly OnboardingStatus[] = ["draft", "in_progress"];

/**
 * Saves the answers and wizard position, and refreshes the client rows from
 * the NAAF. Refuses once the documents have gone out for signature: what the
 * client signs must be exactly what was generated.
 */
export async function saveWizardOnboarding(
  existing: WizardOnboarding,
  draft: OnboardingDraft,
  position: { currentStep?: StepId | null; visitedSteps?: StepId[] } = {},
): Promise<WizardOnboarding> {
  if (!EDITABLE_STATUSES.includes(existing.status)) {
    throw new OnboardingLockedError(existing.status);
  }
  const clientId = await upsertClient(existing.clientId, clientColumns(draft.naaf.clientA, draft.naaf, true));
  const jointClientId = draft.naaf.hasJointHolder
    ? await upsertClient(existing.jointClientId, clientColumns(draft.naaf.clientB, draft.naaf, false))
    : null;

  const { data, error } = await getServerSupabase()
    .from("onboardings")
    .update({
      client_id: clientId,
      joint_client_id: jointClientId,
      naaf_data: draft.naaf,
      crq_data: draft.crq,
      supporting_data: draft.supporting,
      crq_variant: draft.variant,
      ...(position.currentStep !== undefined && { current_step: position.currentStep }),
      ...(position.visitedSteps && { visited_steps: position.visitedSteps }),
    })
    .eq("id", existing.id)
    .select(WIZARD_COLUMNS)
    .single();
  if (error) throw new Error(`Onboarding save failed: ${error.message}`);
  return onboardingFromRow(data as OnboardingRow)!;
}

export class OnboardingLockedError extends Error {
  constructor(status: OnboardingStatus) {
    super(`This onboarding is ${status.replace("_", " ")} and can no longer be edited.`);
    this.name = "OnboardingLockedError";
  }
}

export async function updateWizardStatus(
  id: string,
  patch: {
    status: OnboardingStatus;
    signingMethod?: SigningMethod;
    draft?: OnboardingDraft;
    signingTokenExpiresAt?: string | null;
    clientSignedAt?: string;
    advisorSignedAt?: string;
    sentAt?: string;
    completedAt?: string;
  },
  event?: { type: OnboardingEventType; metadata?: Record<string, unknown>; ipAddress?: string | null; userAgent?: string | null },
): Promise<void> {
  const { error } = await getServerSupabase()
    .from("onboardings")
    .update({
      status: patch.status,
      ...(patch.signingMethod && { signing_method: patch.signingMethod }),
      ...(patch.draft && { naaf_data: patch.draft.naaf, crq_data: patch.draft.crq, supporting_data: patch.draft.supporting }),
      ...(patch.signingTokenExpiresAt !== undefined && { signing_token_expires_at: patch.signingTokenExpiresAt }),
      ...(patch.clientSignedAt && { client_signed_at: patch.clientSignedAt }),
      ...(patch.advisorSignedAt && { advisor_signed_at: patch.advisorSignedAt }),
      ...(patch.sentAt && { sent_at: patch.sentAt }),
      ...(patch.completedAt && { completed_at: patch.completedAt }),
    })
    .eq("id", id);
  if (error) throw new Error(`Onboarding update failed: ${error.message}`);
  if (event) {
    await logOnboardingEvent({
      onboardingId: id,
      eventType: event.type,
      metadata: event.metadata,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent ?? null,
    });
  }
}

// ---------------------------------------------------------------- documents

/**
 * Keeps the signature image itself in the private bucket and records who
 * signed and when. The flattened PDFs carry the signature too; this is the
 * audit copy.
 */
export async function recordSignature(onboardingId: string, type: SignatureType, dataUrl: string): Promise<void> {
  const parsed = parseSignatureDataUrl(dataUrl);
  if (!parsed) throw new Error("Invalid signature image.");
  const storagePath = `signatures/${onboardingId}/${type}-${Date.now()}.${parsed.ext === "jpeg" ? "jpg" : "png"}`;
  const upload = await getServerSupabase()
    .storage.from(DOCUMENTS_BUCKET)
    .upload(storagePath, Buffer.from(parsed.base64, "base64"), { contentType: `image/${parsed.ext}`, upsert: false });
  if (upload.error) throw new Error(`Signature upload failed: ${upload.error.message}`);
  await upsertSignature({ onboardingId, type, signatureUrl: `${DOCUMENTS_BUCKET}/${storagePath}` });
}

/** Uploads a PDF to the private bucket and files it against the client. */
export async function storeClientDocument(input: {
  clientId: string;
  onboardingId: string;
  kind: ClientDocument["kind"];
  documentType?: string | null;
  crqVariant?: CrqVariant | null;
  title: string;
  bytes: Uint8Array;
  signed: boolean;
  /** Defaults to PDF; supporting documents may be images. */
  contentType?: string;
  extension?: string;
}): Promise<ClientDocument> {
  const supabase = getServerSupabase();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const label = input.kind === "supporting" ? input.documentType ?? "supporting" : `${input.kind}-${input.signed ? "signed" : "for-signature"}`;
  const storagePath = `${input.clientId}/${input.onboardingId}/${label}-${stamp}.${input.extension ?? "pdf"}`;

  const upload = await supabase.storage.from(DOCUMENTS_BUCKET).upload(storagePath, input.bytes, {
    contentType: input.contentType ?? "application/pdf",
    upsert: false,
  });
  if (upload.error) throw new Error(`Document upload failed: ${upload.error.message}`);

  const { data, error } = await supabase
    .from("client_documents")
    .insert({
      client_id: input.clientId,
      onboarding_id: input.onboardingId,
      kind: input.kind,
      document_type: input.documentType ?? null,
      crq_variant: input.crqVariant ?? null,
      title: input.title,
      storage_path: storagePath,
      byte_size: input.bytes.byteLength,
      sha256: createHash("sha256").update(input.bytes).digest("hex"),
      signed: input.signed,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Document record failed: ${error.message}`);
  return documentFromRow(data as DocumentRow);
}

export async function listClientDocuments(clientId: string): Promise<ClientDocument[]> {
  const { data, error } = await getServerSupabase()
    .from("client_documents")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Document list failed: ${error.message}`);
  return (data as DocumentRow[]).map(documentFromRow);
}

export async function listOnboardingDocuments(onboardingId: string): Promise<ClientDocument[]> {
  const { data, error } = await getServerSupabase()
    .from("client_documents")
    .select("*")
    .eq("onboarding_id", onboardingId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Document list failed: ${error.message}`);
  return (data as DocumentRow[]).map(documentFromRow);
}

export async function getClientDocument(id: string): Promise<ClientDocument | null> {
  const { data, error } = await getServerSupabase().from("client_documents").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Document lookup failed: ${error.message}`);
  return data ? documentFromRow(data as DocumentRow) : null;
}

/** A short-lived link to one private document. */
export async function signedDocumentUrl(storagePath: string, seconds = 300, downloadName?: string): Promise<string> {
  const { data, error } = await getServerSupabase()
    .storage.from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, seconds, downloadName ? { download: downloadName } : undefined);
  if (error || !data) throw new Error(`Could not create a document link: ${error?.message ?? "unknown error"}`);
  return data.signedUrl;
}

// ---------------------------------------------------------------- search

export interface ClientSearchResult {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  keybaseClientId: string | null;
  isEntity: boolean;
  createdAt: string;
}

/** Escapes LIKE wildcards so a search for "50%" means the characters, not a pattern. */
const likeLiteral = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function searchClients(query: string, limit = 50): Promise<ClientSearchResult[]> {
  const q = query.trim().toLowerCase();
  let request = getServerSupabase()
    .from("clients")
    .select("id,name,email,phone,keybase_client_id,is_entity,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (q) request = request.ilike("search_text", `%${likeLiteral(q)}%`);
  const { data, error } = await request;
  if (error) throw new Error(`Client search failed: ${error.message}`);
  return (
    data as {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      keybase_client_id: string | null;
      is_entity: boolean | null;
      created_at: string;
    }[]
  ).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    keybaseClientId: r.keybase_client_id,
    isEntity: Boolean(r.is_entity),
    createdAt: r.created_at,
  }));
}

/** Wizard onboardings where this client is Client A or the joint holder. */
export async function listClientOnboardings(clientId: string): Promise<WizardOnboarding[]> {
  // Interpolated into a PostgREST filter string below, so it must be a bare UUID.
  if (!isUuid(clientId)) return [];
  const { data, error } = await getServerSupabase()
    .from("onboardings")
    .select(WIZARD_COLUMNS)
    .eq("source", "wizard")
    .or(`client_id.eq.${clientId},joint_client_id.eq.${clientId}`)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Onboarding list failed: ${error.message}`);
  return (data as OnboardingRow[]).map(onboardingFromRow).filter((o): o is WizardOnboarding => o !== null);
}

// ---------------------------------------------------------------- supporting documents

/**
 * Drops any "uploaded" entry whose document is not actually filed against this
 * onboarding, so a supporting-document tick always points at a real file.
 * "On file" entries are the advisor's own confirmation and are kept as given.
 */
export async function verifySupporting(onboardingId: string, supporting: SupportingState): Promise<SupportingState> {
  const claimed = Object.values(supporting).flatMap((e) => (e?.status === "uploaded" ? [e.documentId] : []));
  if (claimed.length === 0) return supporting;
  const { data, error } = await getServerSupabase()
    .from("client_documents")
    .select("id")
    .eq("onboarding_id", onboardingId)
    .in("id", claimed.filter(isUuid));
  if (error) throw new Error(`Document check failed: ${error.message}`);
  const real = new Set((data as { id: string }[]).map((d) => d.id));
  const out: SupportingState = {};
  for (const [key, entry] of Object.entries(supporting) as [RequirementId, SupportingStatus][]) {
    if (entry.status === "on_file" || real.has(entry.documentId)) out[key] = entry;
  }
  return out;
}

/** Records one requirement as satisfied, straight onto the stored onboarding. */
export async function setSupportingStatus(existing: WizardOnboarding, requirement: RequirementId, status: SupportingStatus) {
  const supporting = { ...existing.draft.supporting, [requirement]: status };
  const { error } = await getServerSupabase().from("onboardings").update({ supporting_data: supporting }).eq("id", existing.id);
  if (error) throw new Error(`Onboarding update failed: ${error.message}`);
  return supporting;
}
