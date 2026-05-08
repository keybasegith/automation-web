import {
  DOCUMENT_CATALOG,
  findCatalogCodesInText,
  type DocumentCatalogItem,
} from "./documentCatalog";
import {
  UNSURE_DOCUMENT_NAME,
  type ClassificationSource,
  type DocumentType,
  type PageClassification,
} from "./types";

const PREVIEW_CHAR_LIMIT = 280;

/**
 * Pattern that loosely matches the structured top-row of a passport
 * Machine Readable Zone (e.g. "P<USAJOHN<<DOE..."). Case-sensitive on purpose.
 */
const MRZ_PATTERN = /P<[A-Z]{3}[A-Z<]{20,}/;

const STRONG_KEYWORD_HIT_SCORE = 18;
const WEAK_KEYWORD_HIT_SCORE = 8;
const ALIAS_HIT_SCORE = 30;
const TITLE_BONUS = 25;

interface CatalogScore {
  item: DocumentCatalogItem;
  score: number;
  matchedKeywords: string[];
  matchedAliases: string[];
  exactCodeHit: boolean;
  exactTitleHit: boolean;
  titleNearTop: boolean;
}

interface CategoryScore {
  category: string;
  score: number;
  matchedKeywords: string[];
}

const COARSE_FROM_CATEGORY: Record<string, DocumentType> = {
  "Keybase Client Risk Questionnaire": "CRQ",
  "Keybase Know Your Client KYC": "KYC",
  "Keybase Account Opening": "NAAF",
  "Identity Documents": "Passport",
  Banking: "Void Cheque",
  "Signature Pages": "Signature Page",
  "Government and CRA Forms": "Tax Form",
};

function deriveCoarseType(args: {
  documentName: string;
  category: string;
}): DocumentType {
  if (args.documentName === "Passport") return "Passport";
  if (args.documentName === "Driver's License") return "Driver's License";
  if (args.documentName === "Void Cheque") return "Void Cheque";
  if (args.documentName === "Signature Page") return "Signature Page";
  if (args.documentName === "Other") return "Other";
  if (args.documentName === "Unknown") return "Unknown";
  const fromCategory = COARSE_FROM_CATEGORY[args.category];
  return fromCategory ?? "Other";
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    count += 1;
    idx += needle.length;
  }
  return count;
}

function buildPreview(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= PREVIEW_CHAR_LIMIT) return trimmed;
  return trimmed.slice(0, PREVIEW_CHAR_LIMIT) + "…";
}

function scoreCatalogItem(args: {
  item: DocumentCatalogItem;
  normalized: string;
  topSlice: string;
  rawText: string;
}): CatalogScore {
  const { item, normalized, topSlice, rawText } = args;
  const matchedKeywords: string[] = [];
  const matchedAliases: string[] = [];
  let score = 0;

  // 1. Exact document code match (case-insensitive). Codes like "RC518-20e",
  //    "T2033", "10089" are highly distinctive.
  let exactCodeHit = false;
  if (item.documentCode) {
    const codeLower = item.documentCode.toLowerCase();
    // Use word-ish boundary so e.g. "10089" doesn't match "100891234".
    const codeMatch =
      countOccurrences(normalized, ` ${codeLower} `) > 0 ||
      countOccurrences(normalized, `-${codeLower}`) > 0 ||
      countOccurrences(normalized, ` ${codeLower}`) > 0 ||
      countOccurrences(normalized, `${codeLower} `) > 0 ||
      // Also try in the raw (unnormalized) text — case-sensitive forms like
      // T2033 are sometimes preserved.
      new RegExp(`\\b${item.documentCode.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`).test(
        rawText
      );
    if (codeMatch) {
      exactCodeHit = true;
      score += 80;
    }
  }

  // 2. Exact / partial title match for the documentName.
  const titleLower = item.documentName.toLowerCase();
  // Strip trailing " - <code>" so "KYC Update - 3 Pages - 10001" still matches
  // "KYC Update - 3 Pages" appearing in the page text.
  const titleCore = titleLower.replace(/\s*-\s*\d+\s*$/, "").trim();
  let exactTitleHit = false;
  let titleNearTop = false;
  if (titleCore.length >= 6 && normalized.includes(titleCore)) {
    exactTitleHit = true;
    score += 70;
    if (topSlice.includes(titleCore)) {
      titleNearTop = true;
      score += TITLE_BONUS;
    }
  }

  // 3. Strong alias matches.
  for (const alias of item.aliases) {
    const aliasLower = alias.toLowerCase();
    if (aliasLower.length < 2) continue;
    const occurrences = countOccurrences(normalized, aliasLower);
    if (occurrences > 0) {
      matchedAliases.push(alias);
      score += ALIAS_HIT_SCORE * Math.min(occurrences, 2);
      if (topSlice.includes(aliasLower)) score += 8;
    }
  }

  // 4. Keyword matches.
  for (const kw of item.keywords) {
    const kwLower = kw.toLowerCase();
    const occurrences = countOccurrences(normalized, kwLower);
    if (occurrences > 0) {
      matchedKeywords.push(kw);
      const isStrong = kwLower.split(" ").length >= 2 || kwLower.length >= 9;
      const per = isStrong ? STRONG_KEYWORD_HIT_SCORE : WEAK_KEYWORD_HIT_SCORE;
      score += per * Math.min(occurrences, 3);
    }
  }

  return {
    item,
    score,
    matchedKeywords,
    matchedAliases,
    exactCodeHit,
    exactTitleHit,
    titleNearTop,
  };
}

function scoreByCategory(catalogScores: CatalogScore[]): CategoryScore[] {
  const byCategory = new Map<string, CategoryScore>();
  for (const cs of catalogScores) {
    const existing = byCategory.get(cs.item.category);
    if (existing) {
      existing.score += cs.score * 0.4; // category-level signal is weaker than per-doc
      for (const kw of cs.matchedKeywords) {
        if (!existing.matchedKeywords.includes(kw)) {
          existing.matchedKeywords.push(kw);
        }
      }
    } else {
      byCategory.set(cs.item.category, {
        category: cs.item.category,
        score: cs.score * 0.4,
        matchedKeywords: [...cs.matchedKeywords],
      });
    }
  }
  return Array.from(byCategory.values()).sort((a, b) => b.score - a.score);
}

function buildReason(top: CatalogScore): string {
  const parts: string[] = [];
  if (top.exactCodeHit && top.item.documentCode) {
    parts.push(`exact form code match (${top.item.documentCode})`);
  }
  if (top.exactTitleHit) {
    parts.push(top.titleNearTop ? "title-level match near top of page" : "title match");
  }
  if (top.matchedAliases.length > 0) {
    parts.push(`aliases: ${top.matchedAliases.slice(0, 3).join(", ")}`);
  }
  if (top.matchedKeywords.length > 0) {
    parts.push(`keywords: ${top.matchedKeywords.slice(0, 4).join(", ")}`);
  }
  return parts.join("; ") || "no catalog match";
}

function computeConfidence(top: CatalogScore, secondScore: number): number {
  // Confidence rules per spec:
  //   - Exact document code match: 95–99
  //   - Exact title match: 92–99
  //   - Strong alias + multiple keywords: 85–94
  //   - Multiple keyword matches only: 70–84
  //   - Weak match: 40–69
  //   - No text / unclear: <40
  const margin = top.score - secondScore;

  if (top.exactCodeHit) {
    return Math.max(95, Math.min(99, 95 + Math.round(margin / 30)));
  }
  if (top.exactTitleHit) {
    const base = top.titleNearTop ? 95 : 92;
    return Math.max(base, Math.min(99, base + Math.round(margin / 30)));
  }
  if (top.matchedAliases.length >= 1 && top.matchedKeywords.length >= 2) {
    return Math.max(85, Math.min(94, 85 + Math.round(top.score / 25)));
  }
  if (top.matchedKeywords.length >= 2) {
    return Math.max(70, Math.min(84, 70 + Math.round(top.score / 18)));
  }
  if (top.score > 0) {
    return Math.max(40, Math.min(69, 40 + Math.round(top.score / 6)));
  }
  return 25;
}

/**
 * Classify a single page given its extracted text.
 *
 * `headerText` and `footerText` (when supplied) are the top/bottom 15% bands
 * of the page. A catalog form code (e.g. "10089") found in those bands is
 * treated as the dominant signal — Keybase forms print the code in the
 * header/footer of every page of a multi-page form, so a header-band hit
 * means the whole page belongs to that form regardless of body keywords.
 */
export function classifyDocumentPage(args: {
  pageNumber: number;
  text: string;
  headerText?: string;
  footerText?: string;
}): PageClassification {
  const { pageNumber, text, headerText, footerText } = args;
  const cleanText = text ?? "";
  const preview = buildPreview(cleanText);

  if (cleanText.replace(/\s+/g, "").length < 8) {
    return {
      pageNumber,
      documentType: "Unknown",
      documentName: UNSURE_DOCUMENT_NAME,
      category: "Unknown",
      confidence: 5,
      reason: "no extractable text on page — likely scanned/image-only (Needs OCR Review)",
      matchedKeywords: [],
      extractedTextPreview: preview,
      needsReview: true,
      source: "fallback",
    };
  }

  // Dominant signal: a catalog form code printed in the page header or footer
  // (the strip Keybase uses to identify the form on every page). Exactly one
  // unique code in those bands → near-certain anchor.
  const headerFooterText = `${headerText ?? ""}\n${footerText ?? ""}`.trim();
  if (headerFooterText.length > 0) {
    const headerHits = findCatalogCodesInText(headerFooterText);
    if (headerHits.length === 1) {
      const item = headerHits[0];
      return {
        pageNumber,
        documentType: deriveCoarseType({
          documentName: item.documentName,
          category: item.category,
        }),
        documentName: item.documentName,
        documentCode: item.documentCode,
        category: item.category,
        confidence: 98,
        reason: `form code ${item.documentCode} found in page header/footer`,
        matchedKeywords: item.documentCode ? [item.documentCode] : [],
        extractedTextPreview: preview,
        needsReview: false,
        source: "keyword",
      };
    }
  }

  // Fallback dominant signal: exactly one catalog code anywhere on the page.
  // This catches forms whose code prints inside the body or whose
  // header/footer band wasn't reliably extracted (e.g. OCR-only pages).
  const fullTextHits = findCatalogCodesInText(cleanText);
  if (fullTextHits.length === 1) {
    const item = fullTextHits[0];
    return {
      pageNumber,
      documentType: deriveCoarseType({
        documentName: item.documentName,
        category: item.category,
      }),
      documentName: item.documentName,
      documentCode: item.documentCode,
      category: item.category,
      confidence: 92,
      reason: `form code ${item.documentCode} found on page`,
      matchedKeywords: item.documentCode ? [item.documentCode] : [],
      extractedTextPreview: preview,
      needsReview: false,
      source: "keyword",
    };
  }

  // Special case: passport MRZ pattern is a near-certain identifier.
  if (MRZ_PATTERN.test(cleanText)) {
    return {
      pageNumber,
      documentType: "Passport",
      documentName: "Passport",
      category: "Identity Documents",
      confidence: 96,
      reason: "Machine Readable Zone (MRZ) pattern detected",
      matchedKeywords: ["MRZ"],
      extractedTextPreview: preview,
      needsReview: false,
      source: "keyword",
    };
  }

  const normalized = normalize(cleanText);
  const topSlice = normalized.slice(0, 220);

  const scored: CatalogScore[] = DOCUMENT_CATALOG.map((item) =>
    scoreCatalogItem({ item, normalized, topSlice, rawText: cleanText })
  );

  const ranked = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // Category-level scoring is used as a secondary signal — when a per-doc
  // match exists we prefer it; when no per-doc match exists we still record
  // the strongest category in the reason text.
  const categoryRanking = scoreByCategory(scored);

  if (ranked.length === 0) {
    const topCategory = categoryRanking[0];
    if (topCategory && topCategory.score > 6) {
      return {
        pageNumber,
        documentType: "Other",
        documentName: UNSURE_DOCUMENT_NAME,
        category: topCategory.category,
        confidence: 45,
        reason: `category-level match only — ${topCategory.matchedKeywords
          .slice(0, 3)
          .join(", ")}`,
        matchedKeywords: topCategory.matchedKeywords.slice(0, 5),
        extractedTextPreview: preview,
        needsReview: true,
        source: "fallback",
      };
    }
    return {
      pageNumber,
      documentType: "Unknown",
      documentName: UNSURE_DOCUMENT_NAME,
      category: "Unknown",
      confidence: 25,
      reason: "no catalog matches found",
      matchedKeywords: [],
      extractedTextPreview: preview,
      needsReview: true,
      source: "fallback",
    };
  }

  const top = ranked[0];
  const second = ranked[1];
  const confidence = computeConfidence(top, second?.score ?? 0);

  // A "strong anchor" is the only thing we trust enough to assign a specific
  // document name to a page. Anything weaker becomes Unsure so the splitter
  // doesn't merge weak-keyword pages into the wrong document group.
  const isStrongAnchor =
    top.exactCodeHit ||
    (top.exactTitleHit && top.titleNearTop) ||
    (top.matchedAliases.length >= 1 && top.matchedKeywords.length >= 2);

  if (!isStrongAnchor) {
    return {
      pageNumber,
      documentType: "Other",
      documentName: UNSURE_DOCUMENT_NAME,
      category: top.item.category,
      confidence,
      reason: `weak match — ${buildReason(top)} (no exact code or title-near-top hit)`,
      matchedKeywords: Array.from(
        new Set([...top.matchedAliases, ...top.matchedKeywords])
      ).slice(0, 8),
      extractedTextPreview: preview,
      needsReview: true,
      source: "fallback",
    };
  }

  const documentType = deriveCoarseType({
    documentName: top.item.documentName,
    category: top.item.category,
  });

  const matchedKeywords = Array.from(
    new Set([...top.matchedAliases, ...top.matchedKeywords])
  ).slice(0, 8);

  const source: ClassificationSource = "keyword";

  return {
    pageNumber,
    documentType,
    documentName: top.item.documentName,
    documentCode: top.item.documentCode,
    category: top.item.category,
    confidence,
    reason: buildReason(top),
    matchedKeywords,
    extractedTextPreview: preview,
    needsReview: confidence < 85,
    source,
  };
}
