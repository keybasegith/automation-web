"use client";

import type { PageClassification } from "./types";

export interface AIClassifyResponse {
  ok: boolean;
  configured: boolean;
  /** Free-text reason when ok===false (or `configured===false`). */
  message?: string;
  /** Present only when ok===true. */
  result?: {
    documentName: string;
    documentCode?: string;
    category: string;
    confidence: number;
    reason: string;
  };
}

/**
 * Invoke the server-side AI classifier for a single page.
 *
 * - Returns `{ ok: false, configured: false }` if the server has no API key.
 * - Returns `{ ok: false, configured: true }` for transient errors (network,
 *   model error, parse failure). The caller should fall back to the keyword
 *   classification rather than crashing the page.
 * - Returns `{ ok: true, result }` on success.
 *
 * The function is a thin wrapper around `/api/document-intake/classify-ai`
 * — the server route is the only place the OpenAI key is read.
 */
export async function classifyPageWithAI(args: {
  pageNumber: number;
  text: string;
  keywordResult: PageClassification;
}): Promise<AIClassifyResponse> {
  try {
    const res = await fetch("/api/document-intake/classify-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageNumber: args.pageNumber,
        text: args.text,
        keywordResult: {
          documentName: args.keywordResult.documentName,
          category: args.keywordResult.category,
          documentCode: args.keywordResult.documentCode,
          confidence: args.keywordResult.confidence,
          reason: args.keywordResult.reason,
          matchedKeywords: args.keywordResult.matchedKeywords,
        },
      }),
    });

    if (res.status === 503) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      return {
        ok: false,
        configured: false,
        message:
          data.message ?? "AI classification is not configured on the server.",
      };
    }

    const data = (await res.json().catch(() => ({}))) as Partial<AIClassifyResponse>;
    if (!res.ok || !data.result) {
      return {
        ok: false,
        configured: data.configured ?? true,
        message:
          data.message ?? `AI classifier returned ${res.status} ${res.statusText}`,
      };
    }
    return { ok: true, configured: true, result: data.result };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      message:
        err instanceof Error
          ? `AI classifier request failed: ${err.message}`
          : "AI classifier request failed",
    };
  }
}
