import { Resend } from "resend";

export type BusinessCardLead = {
  recipientEmail: string;
  recipientName: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  preferredContact: "email" | "phone" | "either";
  message?: string;
};

export type SendLeadResult =
  | { ok: true; delivered: "resend" | "console" }
  | { ok: false; error: string };

const FROM_ADDRESS =
  process.env.RESEND_FROM ?? "Keybase Card <onboarding@resend.dev>";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildBody(lead: BusinessCardLead): { text: string; html: string } {
  const rows: Array<[string, string]> = [
    ["Name", lead.name],
    ["Email", lead.email],
    ["Phone", lead.phone || "—"],
    ["Company", lead.company || "—"],
    ["Preferred contact", lead.preferredContact],
    ["Message", lead.message || "—"],
  ];

  const text = [
    `New contact submission from your Keybase digital business card.`,
    `Recipient: ${lead.recipientName} <${lead.recipientEmail}>`,
    ``,
    ...rows.map(([k, v]) => `${k}: ${v}`),
  ].join("\n");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
      <h2 style="margin:0 0 4px;font-size:18px;">New contact via your digital business card</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:13px;">
        For ${escapeHtml(lead.recipientName)} (${escapeHtml(lead.recipientEmail)})
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${rows
          .map(
            ([k, v]) => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;width:140px;vertical-align:top;">${escapeHtml(
              k,
            )}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;white-space:pre-wrap;">${escapeHtml(
              v,
            )}</td>
          </tr>`,
          )
          .join("")}
      </table>
    </div>
  `.trim();

  return { text, html };
}

export async function sendBusinessCardLead(
  lead: BusinessCardLead,
): Promise<SendLeadResult> {
  const { text, html } = buildBody(lead);
  const subject = `New contact from ${lead.name} — Keybase business card`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dev fallback: print to server logs so the flow is testable without a key.
    console.log("[business-card lead] RESEND_API_KEY not set — logging only.");
    console.log("Subject:", subject);
    console.log("To:", lead.recipientEmail);
    console.log("Reply-To:", lead.email);
    console.log(text);
    return { ok: true, delivered: "console" };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: lead.recipientEmail,
      replyTo: lead.email,
      subject,
      text,
      html,
    });
    if (error) {
      return { ok: false, error: error.message ?? "Resend rejected the send." };
    }
    return { ok: true, delivered: "resend" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
