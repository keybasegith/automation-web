import { getServerSupabase } from "@/lib/supabaseClient";
import {
  clientFullName,
  type ClientRecord,
  type OnboardingRecord,
} from "@/lib/onboarding";

export type DocumentKind = "kyc" | "naaf";
export type DocumentVariant = "blank" | "signed";

const BUCKET = "onboarding-documents";

const escapeHtml = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return "—";
  const str = String(value);
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const formatCurrency = (n: number | null): string =>
  n === null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(n);

const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

interface BuildArgs {
  client: ClientRecord;
  onboarding: OnboardingRecord;
  variant: DocumentVariant;
  clientSignatureDataUrl?: string | null;
  advisorSignatureDataUrl?: string | null;
}

const baseStyles = `
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #0f172a; background: #f9fafb; margin: 0; padding: 32px; }
  .page { max-width: 760px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 40px 48px; }
  .brand-bar { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #006d6e; padding-bottom: 16px; margin-bottom: 24px; }
  .brand-bar h1 { font-size: 22px; margin: 0; letter-spacing: -0.01em; }
  .brand-bar .meta { font-size: 12px; color: #64748b; text-align: right; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: #006d6e; margin: 28px 0 12px; }
  table.fields { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  table.fields td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; vertical-align: top; }
  table.fields td.label { color: #64748b; width: 38%; font-weight: 500; }
  table.fields td.value { color: #0f172a; font-weight: 500; }
  .compliance { font-size: 11px; line-height: 1.6; color: #475569; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; }
  .sig-block { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px; }
  .sig-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; min-height: 120px; }
  .sig-card .sig-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 8px; }
  .sig-card .sig-line { border-top: 1px dashed #cbd5e1; margin-top: 56px; padding-top: 8px; font-size: 11px; color: #94a3b8; }
  .sig-card img { max-width: 100%; max-height: 80px; display: block; }
  .sig-card.signed { border-color: #006d6e; background: #f0faf9; }
  footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  @media print { body { padding: 0; background: #fff; } .page { border: none; box-shadow: none; padding: 24px; } }
`;

const renderSignatureBlock = (
  label: string,
  variant: DocumentVariant,
  signatureDataUrl: string | null | undefined,
  signedAt: string | null
): string => {
  const isSigned = variant === "signed" && signatureDataUrl;
  return `
    <div class="sig-card ${isSigned ? "signed" : ""}">
      <div class="sig-label">${escapeHtml(label)}</div>
      ${
        isSigned
          ? `<img src="${escapeHtml(signatureDataUrl!)}" alt="${escapeHtml(label)} signature" />`
          : ""
      }
      <div class="sig-line">${
        isSigned ? `Signed ${escapeHtml(formatDate(signedAt))}` : "Awaiting signature"
      }</div>
    </div>
  `;
};

function buildKycHtml(args: BuildArgs): string {
  const { client, onboarding, variant } = args;
  const fullName = clientFullName(client);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>KYC — ${escapeHtml(fullName)}</title>
<style>${baseStyles}</style>
</head>
<body>
<div class="page">
  <div class="brand-bar">
    <h1>Know Your Client (KYC)</h1>
    <div class="meta">
      <div><strong>Keybase Financial Group</strong></div>
      <div>Document ID: ${escapeHtml(onboarding.id.slice(0, 8))}</div>
      <div>Generated: ${escapeHtml(formatDate(new Date().toISOString()))}</div>
    </div>
  </div>

  <h2>Client Identification</h2>
  <table class="fields">
    <tr><td class="label">Full name</td><td class="value">${escapeHtml(fullName)}</td></tr>
    <tr><td class="label">Email</td><td class="value">${escapeHtml(client.email)}</td></tr>
    <tr><td class="label">Phone</td><td class="value">${escapeHtml(client.phone)}</td></tr>
    <tr><td class="label">Date of birth</td><td class="value">${escapeHtml(formatDate(client.dateOfBirth))}</td></tr>
  </table>

  <h2>Address</h2>
  <table class="fields">
    <tr><td class="label">Street address</td><td class="value">${escapeHtml(client.address)}</td></tr>
    <tr><td class="label">City</td><td class="value">${escapeHtml(client.city)}</td></tr>
    <tr><td class="label">Country</td><td class="value">${escapeHtml(client.country)}</td></tr>
  </table>

  <h2>Identity Verification</h2>
  <table class="fields">
    <tr><td class="label">Government ID</td><td class="value">[ To be presented at signing ]</td></tr>
    <tr><td class="label">ID type</td><td class="value">[ Passport / Driver's License ]</td></tr>
    <tr><td class="label">ID number</td><td class="value">[ ___________________________ ]</td></tr>
    <tr><td class="label">Issuing authority</td><td class="value">[ ___________________________ ]</td></tr>
  </table>

  <h2>Compliance Attestation</h2>
  <div class="compliance">
    The undersigned client confirms that the information above is accurate and
    complete. Keybase Financial Group will retain this record in accordance with
    applicable Know-Your-Client and anti-money-laundering regulations.
    The client agrees to inform Keybase of any material change to the information
    above. The advisor confirms that identification documentation has been
    inspected and reasonable steps have been taken to verify the client's identity.
  </div>

  <h2>Signatures</h2>
  <div class="sig-block">
    ${renderSignatureBlock(
      "Client signature",
      variant,
      args.clientSignatureDataUrl,
      onboarding.clientSignedAt
    )}
    ${renderSignatureBlock(
      `Advisor signature${client.advisorName ? ` — ${client.advisorName}` : ""}`,
      variant,
      args.advisorSignatureDataUrl,
      onboarding.advisorSignedAt
    )}
  </div>

  <footer>Keybase Automation · KYC Form · This document is generated and stored securely.</footer>
</div>
</body>
</html>`;
}

function buildNaafHtml(args: BuildArgs): string {
  const { client, onboarding, variant } = args;
  const fullName = clientFullName(client);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>NAAF — ${escapeHtml(fullName)}</title>
<style>${baseStyles}</style>
</head>
<body>
<div class="page">
  <div class="brand-bar">
    <h1>New Account Application Form (NAAF)</h1>
    <div class="meta">
      <div><strong>Keybase Financial Group</strong></div>
      <div>Document ID: ${escapeHtml(onboarding.id.slice(0, 8))}</div>
      <div>Generated: ${escapeHtml(formatDate(new Date().toISOString()))}</div>
    </div>
  </div>

  <h2>Account Holder</h2>
  <table class="fields">
    <tr><td class="label">Full name</td><td class="value">${escapeHtml(fullName)}</td></tr>
    <tr><td class="label">Email</td><td class="value">${escapeHtml(client.email)}</td></tr>
    <tr><td class="label">Phone</td><td class="value">${escapeHtml(client.phone)}</td></tr>
  </table>

  <h2>Financial Information</h2>
  <table class="fields">
    <tr><td class="label">Employment status</td><td class="value">${escapeHtml(client.employmentStatus)}</td></tr>
    <tr><td class="label">Annual income</td><td class="value">${escapeHtml(formatCurrency(client.annualIncome))}</td></tr>
    <tr><td class="label">Risk profile</td><td class="value">${escapeHtml(client.riskProfile)}</td></tr>
  </table>

  <h2>Investment Objectives</h2>
  <div class="compliance">
    Based on the client's stated risk profile of <strong>${escapeHtml(client.riskProfile)}</strong>,
    the recommended investment objective is
    ${
      client.riskProfile === "Low"
        ? "<strong>capital preservation</strong> with a focus on income-generating fixed-income securities and high-grade bonds."
        : client.riskProfile === "Medium"
          ? "<strong>balanced growth and income</strong>, with a diversified mix of equities and fixed income."
          : "<strong>long-term capital appreciation</strong> through a primarily equity-oriented portfolio, accepting higher short-term volatility."
    }
    The client acknowledges that all investments carry risk and that past
    performance is not indicative of future results.
  </div>

  <h2>Suitability Acknowledgement</h2>
  <div class="compliance">
    The client confirms that the financial information above is accurate.
    The advisor has discussed the client's investment objectives, risk tolerance,
    and time horizon, and has determined that the recommended account type and
    strategy are suitable. Keybase Financial Group will review this profile
    annually or upon any material change in the client's circumstances.
  </div>

  <h2>Signatures</h2>
  <div class="sig-block">
    ${renderSignatureBlock(
      "Client signature",
      variant,
      args.clientSignatureDataUrl,
      onboarding.clientSignedAt
    )}
    ${renderSignatureBlock(
      `Advisor signature${client.advisorName ? ` — ${client.advisorName}` : ""}`,
      variant,
      args.advisorSignatureDataUrl,
      onboarding.advisorSignedAt
    )}
  </div>

  <footer>Keybase Automation · NAAF · This document is generated and stored securely.</footer>
</div>
</body>
</html>`;
}

export function buildDocumentHtml(
  kind: DocumentKind,
  args: BuildArgs
): string {
  return kind === "kyc" ? buildKycHtml(args) : buildNaafHtml(args);
}

/**
 * Upload an HTML document to the onboarding-documents bucket.
 * Returns the public URL (the bucket is configured public-read in the migration).
 */
export async function uploadDocument(args: {
  onboardingId: string;
  kind: DocumentKind;
  variant: DocumentVariant;
  html: string;
}): Promise<string> {
  const supabase = getServerSupabase();
  const path = `${args.onboardingId}/${args.variant}-${args.kind}-${Date.now()}.html`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Blob([args.html], { type: "text/html" }), {
      contentType: "text/html",
      upsert: true,
    });
  if (uploadErr) {
    throw new Error(`Document upload failed: ${uploadErr.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Failed to resolve public URL for uploaded document.");
  }
  return data.publicUrl;
}

export async function uploadSignatureImage(args: {
  onboardingId: string;
  type: "client" | "advisor";
  dataUrl: string;
}): Promise<string> {
  const supabase = getServerSupabase();
  const match = /^data:image\/(png|jpeg);base64,(.+)$/.exec(args.dataUrl.trim());
  if (!match) {
    throw new Error("Signature must be a base64-encoded PNG or JPEG data URL.");
  }
  const [, ext, base64] = match;
  const buffer = Buffer.from(base64, "base64");
  if (buffer.byteLength === 0) {
    throw new Error("Signature is empty.");
  }
  if (buffer.byteLength > 1_000_000) {
    throw new Error("Signature is too large (max 1MB).");
  }

  const path = `${args.onboardingId}/signature-${args.type}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: `image/${ext}`,
      upsert: true,
    });
  if (error) {
    throw new Error(`Signature upload failed: ${error.message}`);
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Failed to resolve public URL for signature.");
  }
  return data.publicUrl;
}
