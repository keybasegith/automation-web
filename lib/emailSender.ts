import type { Client } from "@/lib/clients";
import type { GenerateEmailResponse } from "@/lib/email/types";

export interface SendResult {
  clientId: string;
  success: boolean;
  sentAt: string;
  error?: string;
}

const MIN_DELAY_MS = 400;
const MAX_DELAY_MS = 900;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendEmail(
  client: Client,
  email: GenerateEmailResponse
): Promise<SendResult> {
  const delay =
    MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  await wait(delay);

  // Simulated transport — replace with a real provider (SendGrid, SES, etc.)
  // when integrating production sending.
  console.log(
    `[emailSender] To: ${client.email} | Subject: ${email.subject} | (simulated)`
  );

  return {
    clientId: client.id,
    success: true,
    sentAt: new Date().toISOString(),
  };
}
