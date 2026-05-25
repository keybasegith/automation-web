/**
 * EmailProvider — abstraction over the upstream email platform.
 *
 * Until the firm shares the real API, the MockEmailProvider is used: it
 * reads/writes from the `department_messages` table and effectively *is*
 * the mailbox. When the real provider is wired in, swap the factory below
 * and treat `department_messages` as an audit-only record (we keep
 * subject/from/to/timestamps; body may be empty for the audit row).
 *
 * All providers are responsible for writing audit_logs entries themselves
 * so the audit trail stays consistent across implementations.
 */

import type {
  DepartmentMessageRow,
  MessageDirection,
  MessageStatus,
} from "@/lib/db/types";

export interface MailboxMessage {
  id: string;
  department: string;
  direction: MessageDirection;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  status: MessageStatus;
  provider: string;
  providerMessageId: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  createdBy: string | null;
  metadata: Record<string, unknown>;
}

export interface SendMessageInput {
  department: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
}

export interface ListOptions {
  department: string;
  limit?: number;
  direction?: MessageDirection;
}

export interface ActorContext {
  userId: string;
  userEmail: string;
}

export interface EmailProvider {
  /** Identifier used in audit metadata and the `provider` column. */
  readonly name: string;

  /** Sends a message via the upstream platform. Records audit. */
  sendMessage(
    input: SendMessageInput,
    actor: ActorContext
  ): Promise<MailboxMessage>;

  /** Lists messages for a department (defaults to inbound). */
  listMessages(opts: ListOptions): Promise<MailboxMessage[]>;

  /** Fetches a single message by our internal ID. */
  getMessage(id: string): Promise<MailboxMessage | null>;
}

export function rowToMessage(row: DepartmentMessageRow): MailboxMessage {
  return {
    id: row.id,
    department: row.department,
    direction: row.direction,
    from: row.from_address,
    to: row.to_addresses,
    cc: row.cc_addresses,
    subject: row.subject,
    body: row.body,
    status: row.status,
    provider: row.provider,
    providerMessageId: row.provider_message_id,
    sentAt: row.sent_at,
    receivedAt: row.received_at,
    createdAt: row.created_at,
    createdBy: row.created_by,
    metadata: row.metadata,
  };
}
