/**
 * UI-side masking helpers. Server-side storage NEVER receives the unmasked
 * SIN — the masking only matters for display.
 */

export function maskSIN(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  return `••• ••• ${digits.slice(-3)}`;
}

export function maskAccountNumber(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "•".repeat(trimmed.length);
  return `${"•".repeat(Math.max(4, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

/**
 * Mask any free-form client identifier — used in audit-log "before/after"
 * snapshots so we don't accidentally print SINs or account numbers in logs.
 */
export function maskClientIdentifier(value: string | null | undefined): string {
  if (!value) return "";
  const v = value.trim();
  // SIN / dollar / phone-shaped patterns get the strict treatment.
  if (/^\d{3}[-\s]?\d{3}[-\s]?\d{3,4}$/.test(v)) return maskSIN(v);
  return v.length <= 4 ? "•".repeat(v.length) : `${v.slice(0, 1)}${"•".repeat(v.length - 2)}${v.slice(-1)}`;
}
