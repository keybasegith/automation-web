/**
 * Local audit log — spec 12.
 *
 * Records what was checked on each run so the firm can demonstrate its review
 * process. Local only: nothing is transmitted.
 *
 * ADAPTATION FROM THE SPEC: the spec describes appending JSON lines to a file on
 * disk. This tool runs in the browser, which cannot append to an arbitrary local
 * file, so records are kept in the origin's localStorage in exactly the JSONL
 * record shape the spec describes, and "Download audit log" writes them out as a
 * .jsonl file. If this ever needs to be a true append-only file on a server or
 * in a desktop shell, `exportJsonl` already produces the target format and only
 * the sink below changes.
 *
 * NOTE FOR COMPLIANCE: localStorage is per-browser and per-machine. It is
 * cleared if the reviewer clears site data. Export the log if it must be
 * retained.
 */

import type { AuditEntry } from "./types";

const STORAGE_KEY = "keybase.discrepancy-detector.audit";
/** Keeps the log bounded; the reviewer exports before it rolls over. */
const MAX_ENTRIES = 500;

const available = (): boolean => {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
};

export function readAuditLog(): AuditEntry[] {
  if (!available()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AuditEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendAuditEntry(entry: AuditEntry): void {
  if (!available()) return;
  try {
    const log = readAuditLog();
    log.push(entry);
    const trimmed = log.slice(-MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // A full or disabled localStorage must never block a compliance review.
  }
}

/** The spec's on-disk format: one JSON object per line. */
export const exportJsonl = (entries: readonly AuditEntry[]): string =>
  entries.map((e) => JSON.stringify(e)).join("\n");

export function downloadAuditLog(): void {
  if (typeof document === "undefined") return;
  const entries = readAuditLog();
  const blob = new Blob([exportJsonl(entries)], { type: "application/x-ndjson" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "discrepancy-detector-audit.jsonl";
  a.click();
  URL.revokeObjectURL(url);
}
