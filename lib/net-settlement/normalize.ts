/**
 * Header resolution + value normalization.
 *
 * Both raw and normalized values are preserved by callers — this module only
 * derives normalized values and never mutates source data.
 */

import { parseAmountToCents } from "./money";

/** Normalized-field -> candidate header aliases (matched case/space-insensitively). */
export const FUNDSERV_ALIASES: Record<string, string[]> = {
  dealerCode: ["dealer", "dealer code", "dealer id", "dealer number"],
  settlementDate: ["settlement date", "settle date", "settlement dt"],
  currency: ["currency", "curr", "ccy"],
  cycle: ["cycle", "settlement cycle"],
  category: ["category"],
  reportType: ["report type", "report"],
  activityType: ["activity type", "n$m activity", "nsm activity", "activity"],
  code: ["code"],
  source: ["source"],
  tradeDate: ["trade date", "trade dt"],
  fundId: ["fund id", "fund", "fund code"],
  dealerAccountId: ["dealer account id", "dealer account", "account id", "account"],
  orderId: ["order id", "order", "order number", "order #", "order no"],
  sourceIdentifier: ["source identifier", "source id", "src id"],
  transactionType: ["tx type", "transaction type", "trans type", "type"],
  settlementAmount: ["settlement amt", "settlement amount", "settle amt", "amount", "amt", "net amount"],
  participant: ["participant", "participant id"],
  contractNumber: ["contract", "contract number", "contract #", "contract no"],
};

export const WINFUND_ALIASES: Record<string, string[]> = {
  trustSettledDate: ["trust settled date", "settled date", "trust settle date"],
  clientName: ["client's name", "client name", "clients name", "client"],
  settledUserId: ["settled userid", "settled user id", "settled user"],
  wireOrderNumber: ["wire order #", "wire order number", "wire order", "wire #", "wire order no"],
  supplier: ["supplier", "supplier code", "fund company"],
  fundNumber: ["fund #", "fund number", "fund no", "fund"],
  planId: ["plan id", "plan #", "plan number", "plan no"],
  planType: ["plan type"],
  trustTransactionDate: ["trust transaction date", "transaction date", "trust txn date"],
  transactionType: ["transaction type", "txn type", "trans type", "type"],
  repCode: ["rep code", "rep", "representative code"],
  amount: ["amount", "amt", "settled amount"],
  transactionStatus: ["transaction status", "txn status", "trans status"],
  settlementStatus: ["settlement status", "settle status"],
  userId: ["userid", "user id", "user"],
  bankCode: ["bank code", "bank", "bank id"],
  dealerCode: ["dealer", "dealer code", "dealer id"],
  currency: ["currency", "curr", "ccy"],
};

/** Collapse a header to a comparable token: lowercase, alnum + spaces only. */
export function canonicalHeader(h: string): string {
  return String(h)
    .toLowerCase()
    .replace(/[_\-.]/g, " ")
    .replace(/[^a-z0-9$#& ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ResolvedMapping {
  /** normalized field -> source header index */
  field: Record<string, number>;
  /** normalized field -> confidence */
  confidence: Record<string, "high" | "medium" | "low">;
  /** headers that could not be mapped to any known field */
  unmapped: string[];
}

/**
 * Resolve incoming headers against an alias table. Exact canonical match =
 * high confidence; substring/startsWith = medium; token-overlap = low.
 */
export function resolveHeaders(
  headers: string[],
  aliases: Record<string, string[]>
): ResolvedMapping {
  const canon = headers.map(canonicalHeader);
  const field: Record<string, number> = {};
  const confidence: Record<string, "high" | "medium" | "low"> = {};
  const usedCols = new Set<number>();

  for (const [normField, cands] of Object.entries(aliases)) {
    let bestIdx = -1;
    let bestConf: "high" | "medium" | "low" | null = null;

    for (let i = 0; i < canon.length; i++) {
      if (usedCols.has(i)) continue;
      const h = canon[i];
      for (const cand of cands) {
        const c = canonicalHeader(cand);
        let conf: "high" | "medium" | "low" | null = null;
        if (h === c) conf = "high";
        else if (h.startsWith(c) || c.startsWith(h) || h.includes(c)) conf = "medium";
        else {
          const ht = new Set(h.split(" "));
          const overlap = c.split(" ").filter((t) => ht.has(t)).length;
          if (overlap > 0 && overlap === c.split(" ").length) conf = "low";
        }
        if (conf && (bestConf === null || rank(conf) > rank(bestConf))) {
          bestConf = conf;
          bestIdx = i;
        }
      }
    }
    if (bestIdx >= 0 && bestConf) {
      field[normField] = bestIdx;
      confidence[normField] = bestConf;
      usedCols.add(bestIdx);
    }
  }

  const unmapped = headers.filter((_, i) => !usedCols.has(i));
  return { field, confidence, unmapped };
}

function rank(c: "high" | "medium" | "low"): number {
  return c === "high" ? 3 : c === "medium" ? 2 : 1;
}

/** Normalize a date-ish value into ISO yyyy-mm-dd, or null. */
export function normalizeDate(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;

  // Excel serial date (days since 1899-12-30).
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw > 20000 && raw < 90000) {
      const ms = Math.round((raw - 25569) * 86400 * 1000);
      const d = new Date(ms);
      return isoDate(d);
    }
  }

  const s = String(raw).trim();
  if (s === "") return null;

  // yyyymmdd
  let m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  // yyyy-mm-dd or yyyy/mm/dd
  m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;

  // mm/dd/yyyy or dd/mm/yyyy — ambiguous; assume mm/dd/yyyy (North American)
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) {
    const mo = Number(m[1]);
    const da = Number(m[2]);
    if (mo <= 12) return `${m[3]}-${pad2(mo)}-${pad2(da)}`;
    return `${m[3]}-${pad2(da)}-${pad2(mo)}`;
  }

  // Fallback to Date parsing (e.g. "Jul 7, 2026")
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return isoDate(d);
  return null;
}

function pad2(n: number | string): string {
  return String(n).padStart(2, "0");
}
function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Normalize whitespace/casing while keeping the value comparable. */
export function normalizeText(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().replace(/\s+/g, " ");
  return s === "" ? null : s;
}

/** Normalize an identifier: uppercase, trim, strip surrounding punctuation. */
export function normalizeId(raw: unknown): string | null {
  const t = normalizeText(raw);
  if (t === null) return null;
  return t.toUpperCase().replace(/^[#*\s]+|[#*\s]+$/g, "");
}

/** Fund/account codes: strip leading zeros for comparison but keep as string. */
export function normalizeCode(raw: unknown): string | null {
  const t = normalizeId(raw);
  if (t === null) return null;
  const stripped = t.replace(/^0+(?=\d)/, "");
  return stripped === "" ? "0" : stripped;
}

/** Map many spellings of buy/sell/deposit to canonical transaction types. */
export function normalizeTxnType(raw: unknown): string | null {
  const t = normalizeText(raw);
  if (t === null) return null;
  const u = t.toUpperCase();
  if (/\b(BUY|PUR|PURCHASE|SUBSCRIPTION|DEP|DEPOSIT)\b/.test(u)) return "BUY";
  if (/\b(SELL|RED|REDEMPTION|WITHDRAW|WD)\b/.test(u)) return "SELL";
  if (/\b(SWITCH|TRANSFER)\b/.test(u)) return "SWITCH";
  if (/\b(COMM|COMMISSION)\b/.test(u)) return "COMMISSION";
  if (/\b(CASH|DISTRIB|DISTRIBUTION|DIV)\b/.test(u)) return "CASH_DISTRIBUTION";
  return u;
}

export { parseAmountToCents };
