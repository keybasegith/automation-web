import type { CmsResource } from "@/lib/cms/types";

/** Where each CMS resource is edited, and where its result shows on the site. */
export const RESOURCE_EDIT_HREF: Record<CmsResource, string> = {
  "global-settings": "/admin/global-settings",
  footer: "/admin/footer",
  navigation: "/admin/navigation",
  executives: "/admin/executives",
  "service-pages": "/admin/service-pages",
  careers: "/admin/careers",
  newsroom: "/admin/newsroom",
  "content-pages": "/admin/company-pages",
};

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDateTime(iso);
}

export interface ResourceSummary {
  resource: CmsResource;
  label: string;
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
  publishedBy: string | null;
  draftUpdatedAt: string;
  draftUpdatedBy: string;
  versions: {
    id: string;
    versionNumber: number;
    changeSummary: string;
    createdBy: string;
    createdAt: string;
  }[];
}

export interface ActivityEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  description: string;
  createdAt: string;
}
