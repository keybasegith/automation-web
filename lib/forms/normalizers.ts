// Deterministic normalisers used by both the NAAF parser and the consistency
// checker. Keep them total, lower-case, and conservative — never invent values.

const blankIfMissing = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

export function isMissing(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value !== "string") return false;
  return value.trim() === "";
}

export function normalizeName(value: unknown): string {
  return blankIfMissing(value)
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ");
}

export type NormalizedRiskLevel = "low" | "medium" | "high" | "unknown";

export function normalizeRiskLevel(value: unknown): NormalizedRiskLevel {
  const v = blankIfMissing(value).toLowerCase();
  if (!v) return "unknown";
  if (/(^|\W)(low|conservative|cautious)(\W|$)/.test(v)) return "low";
  if (/(^|\W)(medium|moderate|balanced|mid)(\W|$)/.test(v)) return "medium";
  if (/(^|\W)(high|aggressive|growth-focused)(\W|$)/.test(v)) return "high";
  return "unknown";
}

export type NormalizedTimeHorizon =
  | "short" // <1y or 1-2y
  | "medium" // 2-5y
  | "long" // >5y
  | "unknown";

export function normalizeTimeHorizon(value: unknown): NormalizedTimeHorizon {
  const v = blankIfMissing(value).toLowerCase();
  if (!v) return "unknown";
  if (/less than 1|<\s*1|under 1|6 months|short term|short-term/.test(v))
    return "short";
  if (/1\s*(?:to|-)\s*2|1-2 years|1 to 2 years/.test(v)) return "short";
  if (/2\s*(?:to|-)\s*5|3\s*(?:to|-)\s*5|medium term|medium-term/.test(v))
    return "medium";
  if (
    /(?:long|long-term)|over 5|5\s*\+|more than 5|10\+ years/.test(v)
  )
    return "long";
  return "unknown";
}

export type NormalizedObjective =
  | "preservation"
  | "income"
  | "balanced"
  | "growth"
  | "aggressive_growth"
  | "unknown";

export function normalizeObjective(value: unknown): NormalizedObjective {
  const v = blankIfMissing(value).toLowerCase();
  if (!v) return "unknown";
  if (/aggressive growth|maximum growth|maximum return/.test(v))
    return "aggressive_growth";
  if (/growth/.test(v)) return "growth";
  if (/balanced|both income and growth/.test(v)) return "balanced";
  if (/income/.test(v)) return "income";
  if (/preservation|safety|capital preservation|capital protection/.test(v))
    return "preservation";
  return "unknown";
}

export type NormalizedKnowledgeLevel =
  | "none"
  | "novice"
  | "beginner"
  | "intermediate"
  | "good"
  | "excellent"
  | "unknown";

export function normalizeKnowledgeLevel(
  value: unknown
): NormalizedKnowledgeLevel {
  const v = blankIfMissing(value).toLowerCase();
  if (!v) return "unknown";
  if (/excellent|expert|extensive|professional/.test(v)) return "excellent";
  if (/good|proficient|advanced/.test(v)) return "good";
  if (/intermediate|moderate/.test(v)) return "intermediate";
  if (/beginner|some experience/.test(v)) return "beginner";
  if (/novice|limited/.test(v)) return "novice";
  if (/none|no experience|nil/.test(v)) return "none";
  return "unknown";
}

export type NormalizedLiquidityNeed = "low" | "medium" | "high" | "unknown";

export function normalizeLiquidityNeed(value: unknown): NormalizedLiquidityNeed {
  const v = blankIfMissing(value).toLowerCase();
  if (!v) return "unknown";
  if (/(^|\W)(low|minimal|none)(\W|$)/.test(v)) return "low";
  if (/(^|\W)(medium|moderate|some)(\W|$)/.test(v)) return "medium";
  if (/(^|\W)(high|significant|major|frequent)(\W|$)/.test(v)) return "high";
  return "unknown";
}

export type NormalizedCapacityForLoss = "low" | "medium" | "high" | "unknown";

export function normalizeCapacityForLoss(
  value: unknown
): NormalizedCapacityForLoss {
  const v = blankIfMissing(value).toLowerCase();
  if (!v) return "unknown";
  if (/(^|\W)(low|limited|minimal)(\W|$)/.test(v)) return "low";
  if (/(^|\W)(medium|moderate|some)(\W|$)/.test(v)) return "medium";
  if (/(^|\W)(high|significant|substantial)(\W|$)/.test(v)) return "high";
  return "unknown";
}

export function parseCurrencyToNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\s,$]/g, "").replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
