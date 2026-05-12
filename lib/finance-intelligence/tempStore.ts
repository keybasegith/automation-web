import { randomUUID } from "node:crypto";
import type { ParsedSageExport } from "./types";

interface StoreEntry {
  data: ParsedSageExport;
  expiresAt: number;
}

const TTL_MS = 60 * 60 * 1000; // 1 hour

interface GlobalStore {
  __keybase_finance_intelligence_store__?: Map<string, StoreEntry>;
}

const globalRef = globalThis as unknown as GlobalStore;

function getStore(): Map<string, StoreEntry> {
  if (!globalRef.__keybase_finance_intelligence_store__) {
    globalRef.__keybase_finance_intelligence_store__ = new Map();
  }
  return globalRef.__keybase_finance_intelligence_store__;
}

function sweep(): void {
  const store = getStore();
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt < now) store.delete(key);
  }
}

export function putParsedExport(data: ParsedSageExport): string {
  sweep();
  const id = randomUUID();
  getStore().set(id, { data, expiresAt: Date.now() + TTL_MS });
  return id;
}

export function getParsedExport(id: string): ParsedSageExport | undefined {
  sweep();
  return getStore().get(id)?.data;
}

export function deleteParsedExport(id: string): void {
  getStore().delete(id);
}
