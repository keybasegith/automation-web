export type VCardData = {
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  fax?: string;
  tollFree?: string;
  website: string;
  address: {
    line1: string;
    line2: string;
  };
  linkedin?: string;
  instagram?: string;
};

// RFC 6350: escape backslash, newline, comma, semicolon.
const esc = (v: string) =>
  v
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

const fullNameOf = (c: VCardData) =>
  [c.firstName, c.lastName].filter(Boolean).join(" ");

const normalizeUrl = (u: string) =>
  /^https?:\/\//i.test(u) ? u : `https://${u}`;

export function generateVCard(card: VCardData): string {
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(card.lastName)};${esc(card.firstName)};;;`,
    `FN:${esc(fullNameOf(card))}`,
    `ORG:${esc(card.company)}`,
    `TITLE:${esc(card.title)}`,
    `TEL;TYPE=WORK,VOICE:${esc(card.phone)}`,
  ];
  if (card.fax) lines.push(`TEL;TYPE=WORK,FAX:${esc(card.fax)}`);
  if (card.tollFree) lines.push(`TEL;TYPE=WORK,VOICE:${esc(card.tollFree)}`);
  lines.push(`EMAIL;TYPE=INTERNET,WORK:${esc(card.email)}`);
  lines.push(`URL:${esc(normalizeUrl(card.website))}`);
  lines.push(
    `ADR;TYPE=WORK:;;${esc(card.address.line1)};${esc(card.address.line2)};;;`,
  );
  if (card.linkedin) {
    lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${esc(card.linkedin)}`);
  }
  if (card.instagram) {
    lines.push(`X-SOCIALPROFILE;TYPE=instagram:${esc(card.instagram)}`);
  }
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export function vCardFileName(card: VCardData): string {
  const slug = fullNameOf(card)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${slug || "contact"}.vcf`;
}

// utf-8 string -> base64. btoa only handles latin1, so we round-trip through
// encodeURIComponent so non-ASCII characters in names/addresses survive.
const b64utf8 = (s: string) =>
  btoa(
    encodeURIComponent(s).replace(/%([0-9A-F]{2})/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    ),
  );

/**
 * Trigger a .vcf save on the user's device.
 *
 * Browsers cannot write directly to the OS contacts app — they hand the file
 * to the platform's contact-import flow:
 *   - iOS Safari: opens the Contacts preview where the user taps "Add Contact".
 *   - Android Chrome: downloads the .vcf; opening it offers "Add to contacts".
 *   - Desktop: downloads the file; double-click opens the contacts app.
 */
export function downloadVCard(card: VCardData): void {
  const vcard = generateVCard(card);
  const fileName = vCardFileName(card);

  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS reports as Mac with touch
    (ua.includes("Mac") && "ontouchend" in document);

  if (isIOS) {
    // iOS Safari ignores <a download>. Navigating to a data: URL with the
    // vcard MIME type opens the system contact preview directly.
    window.location.href = `data:text/vcard;charset=utf-8;base64,${b64utf8(vcard)}`;
    return;
  }

  const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so Safari/Firefox have time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
