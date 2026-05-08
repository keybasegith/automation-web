import { getServerSupabase } from "@/lib/supabaseClient";
import type { EmailStatus, GeneratedEmailRow } from "@/lib/db/types";

export interface SaveEmailInput {
  clientId: string;
  subject: string;
  body: string;
  createdBy: string;
}

export async function saveGeneratedEmail(
  input: SaveEmailInput
): Promise<GeneratedEmailRow> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("generated_emails")
    .insert({
      client_id: input.clientId,
      subject: input.subject,
      body: input.body,
      status: "drafted",
      created_by: input.createdBy,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to save generated email: ${error?.message ?? "no row returned"}`
    );
  }
  return data;
}

export async function updateEmailStatus(
  id: string,
  status: EmailStatus
): Promise<GeneratedEmailRow> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("generated_emails")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to update email status: ${error?.message ?? "row not found"}`
    );
  }
  return data;
}

export async function getEmailById(
  id: string
): Promise<GeneratedEmailRow | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("generated_emails")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Email lookup failed: ${error.message}`);
  }
  return data;
}
