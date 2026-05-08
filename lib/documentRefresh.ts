import { MOCK_CLIENTS, type Client } from "@/lib/clients";
import {
  MOCK_DOCUMENTS,
  type ClientDocument,
} from "@/lib/documents";

export type RefreshPriority = "HIGH" | "MEDIUM";

export interface ClientNeedingRefresh {
  client: Client;
  documents: ClientDocument[];
  priority: RefreshPriority;
  expiredCount: number;
  expiringCount: number;
}

/**
 * Returns every client with at least one expired or expiring document,
 * sorted with HIGH-priority cases first.
 *
 * Priority rules:
 * - any document with status "expired"  → HIGH
 * - otherwise (only "expiring" found)   → MEDIUM
 */
export function getClientsNeedingRefresh(): ClientNeedingRefresh[] {
  const docsByClient = new Map<string, ClientDocument[]>();
  for (const doc of MOCK_DOCUMENTS) {
    if (doc.status === "valid") continue;
    const list = docsByClient.get(doc.clientId) ?? [];
    list.push(doc);
    docsByClient.set(doc.clientId, list);
  }

  const results: ClientNeedingRefresh[] = [];
  for (const client of MOCK_CLIENTS) {
    const docs = docsByClient.get(client.id);
    if (!docs || docs.length === 0) continue;

    const expiredCount = docs.filter((d) => d.status === "expired").length;
    const expiringCount = docs.filter((d) => d.status === "expiring").length;
    const priority: RefreshPriority = expiredCount > 0 ? "HIGH" : "MEDIUM";

    results.push({
      client,
      documents: docs,
      priority,
      expiredCount,
      expiringCount,
    });
  }

  return results.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority === "HIGH" ? -1 : 1;
    }
    // Tie-break by total outstanding documents.
    return b.documents.length - a.documents.length;
  });
}

export function summarizeRefreshQueue(rows: ClientNeedingRefresh[]) {
  return {
    total: rows.length,
    high: rows.filter((r) => r.priority === "HIGH").length,
    medium: rows.filter((r) => r.priority === "MEDIUM").length,
  };
}
