import { createHash, randomBytes } from "node:crypto";
const salt = randomBytes(16).toString("hex");
const attempts = new Map<string, { count: number; expires: number }>();
/** Per-instance protection. Configure a shared edge limit for multi-instance hosting. */
export function rateLimited(request: Request): boolean {
  const address = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const key = createHash("sha256").update(salt + address).digest("hex");
  const now = Date.now();
  for (const [k, item] of attempts) if (item.expires <= now) attempts.delete(k);
  const item = attempts.get(key) ?? { count: 0, expires: now + 600_000 };
  item.count += 1;
  if (attempts.size >= 10_000 && !attempts.has(key)) return true;
  attempts.set(key, item);
  return item.count > 5;
}
export async function readSmallBody(request: Request, maxBytes = 16_384): Promise<Buffer> {
  if (!request.body) throw new Error("Invalid request.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error("Request too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export function validOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

export async function readSmallJson(request: Request, maxBytes = 16_384): Promise<unknown> { return JSON.parse((await readSmallBody(request,maxBytes)).toString("utf8")); }
