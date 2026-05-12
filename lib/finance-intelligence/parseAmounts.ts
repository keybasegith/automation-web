const NON_NUMERIC_CHARS = /[\s,$£€]/g;

export function parseAmount(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "-" || trimmed === "—") return undefined;

  let negative = false;
  let body = trimmed;

  // Parentheses style negative: (1,234.56)
  if (body.startsWith("(") && body.endsWith(")")) {
    negative = true;
    body = body.slice(1, -1);
  }

  // Leading minus
  if (body.startsWith("-")) {
    negative = !negative;
    body = body.slice(1);
  }

  // Trailing minus (some accounting exports)
  if (body.endsWith("-")) {
    negative = !negative;
    body = body.slice(0, -1);
  }

  const cleaned = body.replace(NON_NUMERIC_CHARS, "");
  if (cleaned === "") return undefined;

  const n = Number(cleaned);
  if (!Number.isFinite(n)) return undefined;

  return negative ? -n : n;
}

export function formatAmount(value: number): string {
  const abs = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `(${abs})` : abs;
}

export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}
