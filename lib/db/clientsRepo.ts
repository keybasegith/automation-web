import { getServerSupabase } from "@/lib/supabaseClient";
import type { ClientRow, EmailStatus, GeneratedEmailRow } from "@/lib/db/types";

export interface ClientEmailStats {
  total: number;
  drafted: number;
  approved: number;
  sent: number;
  lastEmailAt: string | null;
}

export interface ClientWithStats extends ClientRow {
  stats: ClientEmailStats;
}

const emptyStats = (): ClientEmailStats => ({
  total: 0,
  drafted: 0,
  approved: 0,
  sent: 0,
  lastEmailAt: null,
});

export interface UpsertClientInput {
  name: string;
  email: string;
  riskTolerance: "Low" | "Medium" | "High";
  portfolioValue: number;
}

/**
 * Find a client by email or insert a new row. Used by the manual generator
 * where the advisor types ad-hoc client info; the email is the natural key.
 */
export async function upsertClientByEmail(
  input: UpsertClientInput
): Promise<ClientRow> {
  const supabase = getServerSupabase();
  const normalizedEmail = input.email.trim().toLowerCase();

  const { data: existing, error: findErr } = await supabase
    .from("clients")
    .select("*")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (findErr) {
    throw new Error(`Client lookup failed: ${findErr.message}`);
  }

  if (existing) {
    return existing;
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("clients")
    .insert({
      name: input.name,
      email: normalizedEmail,
      risk_tolerance: input.riskTolerance,
      portfolio_value: input.portfolioValue,
    })
    .select()
    .single();

  if (insertErr || !inserted) {
    throw new Error(
      `Client insert failed: ${insertErr?.message ?? "no row returned"}`
    );
  }

  return inserted;
}

export async function getClientById(id: string): Promise<ClientRow | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Client lookup failed: ${error.message}`);
  }
  return data;
}

/**
 * Returns every client with per-status email counts and last-contacted timestamp.
 * Aggregation is done in JS — small data volume, no need for a SQL view.
 */
export async function listClientsWithStats(): Promise<ClientWithStats[]> {
  const supabase = getServerSupabase();

  const [clientsRes, emailsRes] = await Promise.all([
    supabase.from("clients").select("*").order("name", { ascending: true }),
    supabase
      .from("generated_emails")
      .select("client_id, status, created_at")
      .limit(5000),
  ]);

  if (clientsRes.error) {
    throw new Error(`Client list failed: ${clientsRes.error.message}`);
  }
  if (emailsRes.error) {
    throw new Error(`Email aggregate failed: ${emailsRes.error.message}`);
  }

  type EmailAgg = Pick<GeneratedEmailRow, "client_id" | "status" | "created_at">;
  const byClient = new Map<string, ClientEmailStats>();
  for (const row of (emailsRes.data ?? []) as unknown as EmailAgg[]) {
    const stats = byClient.get(row.client_id) ?? emptyStats();
    stats.total += 1;
    if (row.status === "drafted") stats.drafted += 1;
    else if (row.status === "approved") stats.approved += 1;
    else if (row.status === "sent") stats.sent += 1;
    if (!stats.lastEmailAt || row.created_at > stats.lastEmailAt) {
      stats.lastEmailAt = row.created_at;
    }
    byClient.set(row.client_id, stats);
  }

  const clients = (clientsRes.data ?? []) as unknown as ClientRow[];
  return clients.map((client) => ({
    ...client,
    stats: byClient.get(client.id) ?? emptyStats(),
  }));
}

/**
 * Fetches a client and their full email history (newest first).
 */
export async function getClientWithEmails(id: string): Promise<{
  client: ClientRow;
  emails: GeneratedEmailRow[];
} | null> {
  const supabase = getServerSupabase();
  const [clientRes, emailsRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("generated_emails")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (clientRes.error) {
    throw new Error(`Client lookup failed: ${clientRes.error.message}`);
  }
  if (!clientRes.data) {
    return null;
  }
  if (emailsRes.error) {
    throw new Error(`Email history failed: ${emailsRes.error.message}`);
  }

  return {
    client: clientRes.data as unknown as ClientRow,
    emails: (emailsRes.data ?? []) as unknown as GeneratedEmailRow[],
  };
}

// Re-export so the page module can narrow on EmailStatus without a separate import.
export type { EmailStatus };
