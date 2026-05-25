import { getServerSupabase } from "@/lib/supabaseClient";
import type {
  DepartmentMessageRow,
  MessageDirection,
  MessageStatus,
} from "@/lib/db/types";

export interface InsertMessageInput {
  department: string;
  direction: MessageDirection;
  from_address: string;
  to_addresses: string[];
  cc_addresses?: string[];
  subject: string;
  body?: string;
  provider?: string;
  provider_message_id?: string | null;
  status?: MessageStatus;
  sent_at?: string | null;
  received_at?: string | null;
  created_by?: string | null;
  metadata?: Record<string, unknown>;
}

export async function insertDepartmentMessage(
  input: InsertMessageInput
): Promise<DepartmentMessageRow> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("department_messages")
    .insert({
      department: input.department,
      direction: input.direction,
      from_address: input.from_address,
      to_addresses: input.to_addresses,
      cc_addresses: input.cc_addresses ?? [],
      subject: input.subject,
      body: input.body ?? "",
      provider: input.provider ?? "mock",
      provider_message_id: input.provider_message_id ?? null,
      status: input.status ?? (input.direction === "inbound" ? "received" : "sent"),
      sent_at: input.sent_at ?? null,
      received_at: input.received_at ?? null,
      created_by: input.created_by ?? null,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to insert department message: ${error?.message ?? "no row returned"}`
    );
  }
  return data as DepartmentMessageRow;
}

export interface ListMessagesFilters {
  department: string;
  direction?: MessageDirection;
  limit?: number;
}

export async function listDepartmentMessages(
  filters: ListMessagesFilters
): Promise<DepartmentMessageRow[]> {
  const supabase = getServerSupabase();
  let query = supabase
    .from("department_messages")
    .select("*")
    .eq("department", filters.department)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.direction) {
    query = query.eq("direction", filters.direction);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Department message list failed: ${error.message}`);
  }
  return (data ?? []) as DepartmentMessageRow[];
}

export async function getDepartmentMessageById(
  id: string
): Promise<DepartmentMessageRow | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("department_messages")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Department message lookup failed: ${error.message}`);
  }
  return data as DepartmentMessageRow | null;
}
