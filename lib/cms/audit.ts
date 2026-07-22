import { randomUUID } from "crypto";
import type { CmsAuditAction, CmsAuditEntry } from "@/lib/cms/types";
import { getCmsBackend } from "@/lib/cms/storage";

/**
 * Append-only activity log for the website CMS. Records who changed what and
 * when, so the admin Overview and History screens can show recent activity.
 * Persisted by the selected CMS backend (Postgres in production).
 */

/** Record an admin action. Never throws — logging must not break a mutation. */
export async function logAudit(entry: {
  userId: string;
  action: CmsAuditAction;
  resource: string;
  description: string;
}): Promise<void> {
  try {
    await getCmsBackend().appendAudit({
      id: randomUUID(),
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      description: entry.description,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    // Swallow, but stay visible — a failed audit write should not fail the
    // user's action, yet must not disappear silently either.
    console.error("[cms] audit write failed:", err);
  }
}

/** Most recent activity, newest first. */
export async function listAudit(limit = 50): Promise<CmsAuditEntry[]> {
  return getCmsBackend().listAudit(limit);
}
