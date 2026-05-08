import { getServerSupabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const ONBOARDING_STATUSES = [
  "draft",
  "in_progress",
  "sent",
  "signed",
  "completed",
] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export const RISK_PROFILES = ["Low", "Medium", "High"] as const;
export type RiskProfile = (typeof RISK_PROFILES)[number];

export type SignatureType = "client" | "advisor";

export const ONBOARDING_EVENT_TYPES = [
  "created",
  "updated",
  "sent",
  "viewed",
  "signed",
  "generated",
  "completed",
] as const;
export type OnboardingEventType = (typeof ONBOARDING_EVENT_TYPES)[number];

export interface ClientProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  employmentStatus: string | null;
  annualIncome: number | null;
  riskProfile: RiskProfile;
  advisorName: string | null;
}

export interface ClientRecord extends ClientProfileData {
  id: string;
  createdAt: string;
}

export interface OnboardingRecord {
  id: string;
  clientId: string;
  status: OnboardingStatus;
  signingToken: string;
  kycDocumentUrl: string | null;
  naafDocumentUrl: string | null;
  signedKycUrl: string | null;
  signedNaafUrl: string | null;
  clientSignedAt: string | null;
  advisorSignedAt: string | null;
  sentAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingWithClient {
  onboarding: OnboardingRecord;
  client: ClientRecord;
}

export interface SignatureRecord {
  id: string;
  onboardingId: string;
  type: SignatureType;
  signatureUrl: string;
  signedAt: string;
}

// ---------------------------------------------------------------------------
// Row → domain mappers (the DB uses snake_case; the app uses camelCase)
// ---------------------------------------------------------------------------

interface ClientRow {
  id: string;
  email: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  employment_status: string | null;
  annual_income: string | number | null;
  risk_profile: RiskProfile | null;
  risk_tolerance: RiskProfile;
  advisor_name: string | null;
  created_at: string;
}

interface OnboardingRow {
  id: string;
  client_id: string;
  status: OnboardingStatus;
  signing_token: string;
  kyc_document_url: string | null;
  naaf_document_url: string | null;
  signed_kyc_url: string | null;
  signed_naaf_url: string | null;
  client_signed_at: string | null;
  advisor_signed_at: string | null;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface SignatureRow {
  id: string;
  onboarding_id: string;
  type: SignatureType;
  signature_url: string;
  signed_at: string;
}

const splitName = (name: string): { first: string; last: string } => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
};

function clientFromRow(row: ClientRow): ClientRecord {
  // Fall back to splitting `name` for legacy rows that predate this migration.
  const fallback = splitName(row.name ?? "");
  const annualIncome =
    row.annual_income == null
      ? null
      : typeof row.annual_income === "string"
        ? Number(row.annual_income)
        : row.annual_income;
  return {
    id: row.id,
    firstName: row.first_name ?? fallback.first,
    lastName: row.last_name ?? fallback.last,
    email: row.email,
    phone: row.phone,
    dateOfBirth: row.date_of_birth,
    address: row.address,
    city: row.city,
    country: row.country,
    employmentStatus: row.employment_status,
    annualIncome: Number.isFinite(annualIncome as number)
      ? (annualIncome as number)
      : null,
    riskProfile: row.risk_profile ?? row.risk_tolerance,
    advisorName: row.advisor_name,
    createdAt: row.created_at,
  };
}

function onboardingFromRow(row: OnboardingRow): OnboardingRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    status: row.status,
    signingToken: row.signing_token,
    kycDocumentUrl: row.kyc_document_url,
    naafDocumentUrl: row.naaf_document_url,
    signedKycUrl: row.signed_kyc_url,
    signedNaafUrl: row.signed_naaf_url,
    clientSignedAt: row.client_signed_at,
    advisorSignedAt: row.advisor_signed_at,
    sentAt: row.sent_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function signatureFromRow(row: SignatureRow): SignatureRecord {
  return {
    id: row.id,
    onboardingId: row.onboarding_id,
    type: row.type,
    signatureUrl: row.signature_url,
    signedAt: row.signed_at,
  };
}

export function clientFullName(c: Pick<ClientRecord, "firstName" | "lastName">): string {
  return `${c.firstName} ${c.lastName}`.trim() || "Unnamed client";
}

// ---------------------------------------------------------------------------
// Repo
// ---------------------------------------------------------------------------

export interface UpsertClientInput extends Omit<ClientProfileData, "annualIncome"> {
  annualIncome: number | null;
}

/**
 * Upsert a client by email. Writes both the legacy `name` column and the new
 * first/last columns so existing pages keep rendering.
 */
export async function upsertClientForOnboarding(
  input: UpsertClientInput
): Promise<ClientRecord> {
  const supabase = getServerSupabase();
  const email = input.email.trim().toLowerCase();
  const fullName = `${input.firstName} ${input.lastName}`.trim();

  const payload = {
    name: fullName || email,
    email,
    first_name: input.firstName.trim() || null,
    last_name: input.lastName.trim() || null,
    phone: input.phone?.trim() || null,
    date_of_birth: input.dateOfBirth || null,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    country: input.country?.trim() || null,
    employment_status: input.employmentStatus?.trim() || null,
    annual_income: input.annualIncome,
    risk_profile: input.riskProfile,
    risk_tolerance: input.riskProfile, // mirror into legacy column
    advisor_name: input.advisorName?.trim() || null,
    portfolio_value: 0, // legacy NOT NULL with default 0; preserve for new rows
  };

  const { data, error } = await supabase
    .from("clients")
    .upsert(payload, { onConflict: "email" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Client upsert failed: ${error?.message ?? "no row"}`);
  }

  return clientFromRow(data as ClientRow);
}

export async function getClientById(id: string): Promise<ClientRecord | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Client lookup failed: ${error.message}`);
  return data ? clientFromRow(data as ClientRow) : null;
}

export async function createOnboarding(input: {
  clientId: string;
  createdBy: string | null;
}): Promise<OnboardingRecord> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("onboardings")
    .insert({ client_id: input.clientId, created_by: input.createdBy })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`Onboarding insert failed: ${error?.message ?? "no row"}`);
  }
  return onboardingFromRow(data as OnboardingRow);
}

export async function getOnboardingById(
  id: string
): Promise<OnboardingWithClient | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("onboardings")
    .select("*, clients!inner(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Onboarding lookup failed: ${error.message}`);
  if (!data) return null;
  type Joined = OnboardingRow & { clients: ClientRow };
  const row = data as unknown as Joined;
  const { clients, ...onb } = row;
  return {
    onboarding: onboardingFromRow(onb as OnboardingRow),
    client: clientFromRow(clients),
  };
}

export async function getOnboardingByToken(
  token: string
): Promise<OnboardingWithClient | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("onboardings")
    .select("*, clients!inner(*)")
    .eq("signing_token", token)
    .maybeSingle();
  if (error) throw new Error(`Onboarding lookup failed: ${error.message}`);
  if (!data) return null;
  type Joined = OnboardingRow & { clients: ClientRow };
  const row = data as unknown as Joined;
  const { clients, ...onb } = row;
  return {
    onboarding: onboardingFromRow(onb as OnboardingRow),
    client: clientFromRow(clients),
  };
}

export interface UpdateOnboardingPatch {
  status?: OnboardingStatus;
  kycDocumentUrl?: string | null;
  naafDocumentUrl?: string | null;
  signedKycUrl?: string | null;
  signedNaafUrl?: string | null;
  clientSignedAt?: string | null;
  advisorSignedAt?: string | null;
  sentAt?: string | null;
}

export async function updateOnboarding(
  id: string,
  patch: UpdateOnboardingPatch
): Promise<OnboardingRecord> {
  const supabase = getServerSupabase();
  const dbPatch: Record<string, unknown> = {};
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.kycDocumentUrl !== undefined)
    dbPatch.kyc_document_url = patch.kycDocumentUrl;
  if (patch.naafDocumentUrl !== undefined)
    dbPatch.naaf_document_url = patch.naafDocumentUrl;
  if (patch.signedKycUrl !== undefined) dbPatch.signed_kyc_url = patch.signedKycUrl;
  if (patch.signedNaafUrl !== undefined)
    dbPatch.signed_naaf_url = patch.signedNaafUrl;
  if (patch.clientSignedAt !== undefined)
    dbPatch.client_signed_at = patch.clientSignedAt;
  if (patch.advisorSignedAt !== undefined)
    dbPatch.advisor_signed_at = patch.advisorSignedAt;
  if (patch.sentAt !== undefined) dbPatch.sent_at = patch.sentAt;

  const { data, error } = await supabase
    .from("onboardings")
    .update(dbPatch)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`Onboarding update failed: ${error?.message ?? "no row"}`);
  }
  return onboardingFromRow(data as OnboardingRow);
}

export interface OnboardingListItem {
  onboarding: OnboardingRecord;
  client: ClientRecord;
}

export async function listOnboardingsByStatuses(
  statuses: readonly OnboardingStatus[]
): Promise<OnboardingListItem[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("onboardings")
    .select("*, clients!inner(*)")
    .in("status", statuses as unknown as string[])
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Onboarding list failed: ${error.message}`);
  type Joined = OnboardingRow & { clients: ClientRow };
  return ((data ?? []) as unknown as Joined[]).map((row) => {
    const { clients, ...onb } = row;
    return {
      onboarding: onboardingFromRow(onb as OnboardingRow),
      client: clientFromRow(clients),
    };
  });
}

export async function upsertSignature(input: {
  onboardingId: string;
  type: SignatureType;
  signatureUrl: string;
}): Promise<SignatureRecord> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("signatures")
    .upsert(
      {
        onboarding_id: input.onboardingId,
        type: input.type,
        signature_url: input.signatureUrl,
        signed_at: new Date().toISOString(),
      },
      { onConflict: "onboarding_id,type" }
    )
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`Signature upsert failed: ${error?.message ?? "no row"}`);
  }
  return signatureFromRow(data as SignatureRow);
}

export async function getSignatures(
  onboardingId: string
): Promise<SignatureRecord[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("signatures")
    .select("*")
    .eq("onboarding_id", onboardingId);
  if (error) throw new Error(`Signature read failed: ${error.message}`);
  return ((data ?? []) as unknown as SignatureRow[]).map(signatureFromRow);
}

export async function logOnboardingEvent(input: {
  onboardingId: string;
  eventType: OnboardingEventType;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getServerSupabase();
  const { error } = await supabase.from("onboarding_events").insert({
    onboarding_id: input.onboardingId,
    event_type: input.eventType,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) {
    // Surface but don't break the flow; audit failures matter less than the action.
    console.error("onboarding_events insert failed:", error.message);
  }
}
