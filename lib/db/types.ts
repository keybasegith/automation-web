export type EmailStatus = "drafted" | "approved" | "sent";

export type AuditAction =
  | "GENERATE_EMAIL"
  | "APPROVE_EMAIL"
  | "SEND_EMAIL"
  | "IMPORT_CLIENTS"
  | "EXTRACT_CLIENT_DATA"
  // ---------------------------------------------------------------
  // Compliance-safe AI lifecycle events. Surfaced separately from
  // GENERATE_EMAIL so compliance can audit AI-specific actions
  // (and verify no PII reached OpenAI).
  // ---------------------------------------------------------------
  | "AI_DRAFT_REQUESTED"
  | "AI_PROMPT_SANITIZED"
  | "AI_RESPONSE_RECEIVED"
  | "PLACEHOLDERS_SUBSTITUTED"
  | "PROHIBITED_PHRASE_CHECKED"
  | "DRAFT_EDITED"
  | "DRAFT_APPROVED"
  | "COMPLIANCE_REVIEWED"
  // ---------------------------------------------------------------
  // Department mailbox lifecycle. These are audit-only records of
  // calls into / responses from the upstream email platform.
  // ---------------------------------------------------------------
  | "DEPT_MAILBOX_SEND"
  | "DEPT_MAILBOX_SEND_FAILED"
  | "DEPT_MAILBOX_FETCH"
  | "DEPT_MAILBOX_VIEW";

export type AuditEntityType = "email" | "client" | "department_message";

export interface UserRow {
  id: string;
  email: string;
  role: "advisor" | "manager";
  /** Display name. Used for `[Advisor Name]` substitution at send time. */
  name: string | null;
  created_at: string;
}

export interface ClientRow {
  id: string;
  name: string;
  email: string;
  risk_tolerance: "Low" | "Medium" | "High";
  portfolio_value: number;
  created_at: string;
}

export interface GeneratedEmailRow {
  id: string;
  client_id: string;
  subject: string;
  body: string;
  status: EmailStatus;
  created_by: string;
  created_at: string;
}

export type MessageDirection = "inbound" | "outbound";
export type MessageStatus =
  | "draft"
  | "sending"
  | "sent"
  | "failed"
  | "received";

export interface DepartmentMessageRow {
  id: string;
  department: string;
  direction: MessageDirection;
  from_address: string;
  to_addresses: string[];
  cc_addresses: string[];
  subject: string;
  body: string;
  provider: string;
  provider_message_id: string | null;
  status: MessageStatus;
  sent_at: string | null;
  received_at: string | null;
  created_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  user_id: string;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: Omit<UserRow, "id" | "created_at"> & { id?: string };
        Update: Partial<UserRow>;
        Relationships: [];
      };
      clients: {
        Row: ClientRow;
        Insert: Omit<ClientRow, "id" | "created_at"> & { id?: string };
        Update: Partial<ClientRow>;
        Relationships: [];
      };
      generated_emails: {
        Row: GeneratedEmailRow;
        Insert: Omit<GeneratedEmailRow, "id" | "created_at"> & {
          id?: string;
          status?: EmailStatus;
        };
        Update: Partial<GeneratedEmailRow>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: Omit<AuditLogRow, "id" | "created_at"> & {
          id?: string;
          metadata?: Record<string, unknown>;
        };
        Update: Partial<AuditLogRow>;
        Relationships: [];
      };
      department_messages: {
        Row: DepartmentMessageRow;
        Insert: Omit<DepartmentMessageRow, "id" | "created_at"> & {
          id?: string;
          status?: MessageStatus;
          cc_addresses?: string[];
          body?: string;
          provider?: string;
          metadata?: Record<string, unknown>;
        };
        Update: Partial<DepartmentMessageRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
