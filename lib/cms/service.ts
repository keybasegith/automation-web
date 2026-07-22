import {
  discardDraft,
  hasUnpublishedChanges,
  publishDraft,
  readDoc,
  restoreVersion,
  saveDraft,
} from "@/lib/cms/store";
import { getResourceConfig } from "@/lib/cms/registry";
import { logAudit } from "@/lib/cms/audit";
import type { CmsAuditAction, CmsResource } from "@/lib/cms/types";

/**
 * Admin-facing service layer. Ties the resource registry (seed + normalizer) to
 * the file store and the audit log so every mutation shares one validated,
 * audited path. Content is handled as `unknown` here and validated by the
 * registry's normalizer before it can touch the store.
 */

export type CmsAction =
  | "save_draft"
  | "publish"
  | "discard_draft"
  | "restore_version";

export interface AdminDocView {
  resource: CmsResource;
  draft: unknown;
  published: unknown;
  versions: {
    id: string;
    versionNumber: number;
    changeSummary: string;
    createdBy: string;
    createdAt: string;
  }[];
  draftUpdatedAt: string;
  draftUpdatedBy: string;
  publishedAt: string | null;
  publishedBy: string | null;
  hasUnpublishedChanges: boolean;
}

/** Shape returned to the admin editor — draft + published + version metadata. */
export async function getDocForAdmin(
  resource: CmsResource
): Promise<AdminDocView> {
  const { seed } = getResourceConfig(resource);
  const doc = await readDoc(resource, seed);
  return {
    resource,
    draft: doc.draft,
    published: doc.published,
    versions: doc.versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      changeSummary: v.changeSummary,
      createdBy: v.createdBy,
      createdAt: v.createdAt,
    })),
    draftUpdatedAt: doc.draftUpdatedAt,
    draftUpdatedBy: doc.draftUpdatedBy,
    publishedAt: doc.publishedAt,
    publishedBy: doc.publishedBy,
    hasUnpublishedChanges: hasUnpublishedChanges(doc),
  };
}

export type ApplyResult =
  | { ok: true; doc: AdminDocView }
  | { ok: false; status: number; error: string };

/**
 * Validate + apply an admin action, then write an audit-log entry. Returns a
 * discriminated result the route can translate into an HTTP response.
 */
export async function applyAction(
  resource: CmsResource,
  action: CmsAction,
  payload: { content?: unknown; changeSummary?: string; versionId?: string },
  user: string
): Promise<ApplyResult> {
  const { seed, normalize, label } = getResourceConfig(resource);

  try {
    if (action === "save_draft" || action === "publish") {
      const result = normalize(payload.content);
      if ("error" in result) {
        return { ok: false, status: 400, error: result.error };
      }
      // Persist the validated draft first...
      await saveDraft(resource, seed, result.value, user);
      if (action === "publish") {
        const summary =
          (payload.changeSummary ?? "").trim() || "Content updated";
        await publishDraft(resource, seed, user, summary);
      }
    } else if (action === "discard_draft") {
      await discardDraft(resource, seed, user);
    } else if (action === "restore_version") {
      if (!payload.versionId) {
        return { ok: false, status: 400, error: "No version selected." };
      }
      await restoreVersion(resource, seed, payload.versionId, user);
    } else {
      return { ok: false, status: 400, error: "Unknown action." };
    }

    await logAudit({
      userId: user,
      action: action as CmsAuditAction,
      resource,
      description: describeAction(action, label, payload),
    });

    return { ok: true, doc: await getDocForAdmin(resource) };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      error: err instanceof Error ? err.message : "Something went wrong.",
    };
  }
}

function describeAction(
  action: CmsAction,
  label: string,
  payload: { changeSummary?: string },
): string {
  switch (action) {
    case "save_draft":
      return `Saved a draft of ${label}`;
    case "publish":
      return `Published ${label}${
        payload.changeSummary ? ` — ${payload.changeSummary}` : ""
      }`;
    case "discard_draft":
      return `Discarded draft changes to ${label}`;
    case "restore_version":
      return `Restored a previous version of ${label} as a draft`;
  }
}
