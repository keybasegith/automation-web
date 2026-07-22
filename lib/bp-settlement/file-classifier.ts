/**
 * Content-based file classification (spec §"FILE CLASSIFICATION").
 * Searches normalized extracted text + column headers. The filename is only a
 * weak tiebreaker. Low confidence → the UI offers manual assignment.
 */

import type { SettlementFileType } from "./types";

export interface ClassificationResult {
  fileType: SettlementFileType;
  confidence: number; // 0..1
  signals: string[];
  needsManualAssignment: boolean;
}

export function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

interface Rule {
  fileType: SettlementFileType;
  strong: string[];
  supporting: string[];
  minStrong: number;
}

const RULES: Rule[] = [
  {
    fileType: "FUNDSERV_CATEGORY_SUMMARY",
    strong: ["settlement summary by category"],
    supporting: [
      "net matched - all",
      "net matched - pay only",
      "net matched - rec only",
      "pay tx",
      "rec tx",
      "net matched",
    ],
    minStrong: 1,
  },
  {
    fileType: "WINFUND_UNSETTLED",
    strong: ["trust account listing", "settled (no cheque)", "w/o order number", "not settled"],
    supporting: [
      "transaction status",
      "total inflow",
      "total outflow",
      "total for date",
      "bank code",
      "settlement status",
      "client name",
      "transaction type / type 2",
      "supplier",
      "fund",
      "code",
      "amount",
      "wire order",
    ],
    minStrong: 1,
  },
  {
    fileType: "FUNDSERV_DETAIL",
    strong: ["buy shares", "sell of shares", "sell shares"],
    supporting: [
      "supplier",
      "fund",
      "plan id",
      "order",
      "contract",
      "transaction type",
      "amount",
      "buy",
      "sell",
    ],
    minStrong: 1,
  },
];

export function classifyFile(
  extractedText: string,
  opts?: { headers?: string[]; filename?: string }
): ClassificationResult {
  const hay = normalizeForMatch([extractedText, (opts?.headers ?? []).join(" ")].join(" "));

  let best: ClassificationResult = {
    fileType: "UNKNOWN",
    confidence: 0,
    signals: [],
    needsManualAssignment: true,
  };

  for (const rule of RULES) {
    const strongHits = rule.strong.filter((p) => hay.includes(p));
    if (strongHits.length < rule.minStrong) continue;
    const supportHits = rule.supporting.filter((p) => hay.includes(p));
    const confidence = Math.min(1, strongHits.length * 0.4 + supportHits.length * 0.08);
    if (confidence > best.confidence) {
      best = {
        fileType: rule.fileType,
        confidence,
        signals: [...strongHits, ...supportHits],
        needsManualAssignment: confidence < 0.45,
      };
    }
  }

  if (best.confidence < 0.45 && opts?.filename) {
    const name = normalizeForMatch(opts.filename);
    const nudge: [RegExp, SettlementFileType][] = [
      [/categor/, "FUNDSERV_CATEGORY_SUMMARY"],
      [/winfund|not\s*settled|unsettled/, "WINFUND_UNSETTLED"],
      [/detail|transaction|buy|sell/, "FUNDSERV_DETAIL"],
    ];
    for (const [re, type] of nudge) {
      if (re.test(name)) {
        return {
          fileType: type,
          confidence: Math.max(best.confidence, 0.4),
          signals: [...best.signals, `filename:${type}`],
          needsManualAssignment: true,
        };
      }
    }
  }

  return best;
}
