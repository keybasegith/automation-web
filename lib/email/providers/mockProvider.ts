import { logAudit } from "@/lib/db/audit";
import {
  getDepartmentMessageById,
  insertDepartmentMessage,
  listDepartmentMessages,
} from "@/lib/db/departmentMessagesRepo";
import {
  rowToMessage,
  type ActorContext,
  type EmailProvider,
  type ListOptions,
  type MailboxMessage,
  type SendMessageInput,
} from "@/lib/email/provider";

/**
 * Mock provider — uses department_messages as the canonical mailbox.
 * Stands in for the firm's real email API until it is supplied. Behaviour
 * mirrors what the real provider should do: persist outbound, simulate
 * delivery, write audit log entries.
 */
class MockProvider implements EmailProvider {
  readonly name = "mock";

  async sendMessage(
    input: SendMessageInput,
    actor: ActorContext
  ): Promise<MailboxMessage> {
    const now = new Date().toISOString();
    const providerMessageId = `mock-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const row = await insertDepartmentMessage({
      department: input.department,
      direction: "outbound",
      from_address: input.from,
      to_addresses: input.to,
      cc_addresses: input.cc ?? [],
      subject: input.subject,
      body: input.body,
      provider: this.name,
      provider_message_id: providerMessageId,
      status: "sent",
      sent_at: now,
      created_by: actor.userId,
      metadata: {
        actorEmail: actor.userEmail,
        simulated: true,
      },
    });

    await logAudit({
      userId: actor.userId,
      action: "DEPT_MAILBOX_SEND",
      entityType: "department_message",
      entityId: row.id,
      metadata: {
        department: row.department,
        provider: this.name,
        recipientCount: input.to.length,
        ccCount: input.cc?.length ?? 0,
        subjectLength: input.subject.length,
        bodyLength: input.body.length,
      },
    });

    return rowToMessage(row);
  }

  async listMessages(opts: ListOptions): Promise<MailboxMessage[]> {
    const rows = await listDepartmentMessages({
      department: opts.department,
      direction: opts.direction,
      limit: opts.limit,
    });
    return rows.map(rowToMessage);
  }

  async getMessage(id: string): Promise<MailboxMessage | null> {
    const row = await getDepartmentMessageById(id);
    return row ? rowToMessage(row) : null;
  }
}

export const mockEmailProvider = new MockProvider();
