import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { CmsAuditAction, CmsAuditEntry } from "@/lib/cms/types";

/**
 * Append-only activity log for the website CMS. Records who changed what and
 * when, so the admin Overview and History screens can show recent activity.
 * File-backed (data/cms-audit.json) to match the rest of the CMS store.
 */

const AUDIT_FILE = path.join(process.cwd(), "data", "cms-audit.json");
const MAX_ENTRIES = 500;

async function readAll(): Promise<CmsAuditEntry[]> {
  try {
    const raw = await fs.readFile(AUDIT_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as CmsAuditEntry[];
  } catch {
    // Missing/unreadable → treat as empty.
  }
  return [];
}

async function writeAll(entries: CmsAuditEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(AUDIT_FILE), { recursive: true });
  const tmp = `${AUDIT_FILE}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(entries, null, 2), "utf8");
  await fs.rename(tmp, AUDIT_FILE);
}

/** Record an admin action. Never throws — logging must not break a mutation. */
export async function logAudit(entry: {
  userId: string;
  action: CmsAuditAction;
  resource: string;
  description: string;
}): Promise<void> {
  try {
    const all = await readAll();
    const row: CmsAuditEntry = {
      id: randomUUID(),
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      description: entry.description,
      createdAt: new Date().toISOString(),
    };
    await writeAll([row, ...all].slice(0, MAX_ENTRIES));
  } catch {
    // Swallow — a failed audit write should not fail the user's action.
  }
}

/** Most recent activity, newest first. */
export async function listAudit(limit = 50): Promise<CmsAuditEntry[]> {
  const all = await readAll();
  return all.slice(0, limit);
}
