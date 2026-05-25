import type { EmailProvider } from "@/lib/email/provider";
import { mockEmailProvider } from "@/lib/email/providers/mockProvider";

/**
 * Resolves the active email provider.
 *
 * Today this returns the mock provider, which stores messages in
 * department_messages. When the firm's real email API is provided, add a new
 * implementation under `lib/email/providers/<name>.ts` and switch on
 * `process.env.EMAIL_PROVIDER` here.
 */
export function getEmailProvider(): EmailProvider {
  const configured = (process.env.EMAIL_PROVIDER ?? "mock").toLowerCase();
  switch (configured) {
    case "mock":
      return mockEmailProvider;
    default:
      // Unknown provider name — fall back to mock and let the caller see it
      // in logs. We deliberately do not throw: the UI should keep working.
      console.warn(
        `[email] Unknown EMAIL_PROVIDER=${configured}. Falling back to mock.`
      );
      return mockEmailProvider;
  }
}
