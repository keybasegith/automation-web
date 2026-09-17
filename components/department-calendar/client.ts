import type {
  CalendarAttachment,
  CalendarEvent,
  CalendarItem,
  CalendarItemDetail,
  CalendarLink,
} from "@/lib/content-calendar/types";
import type { CalendarStatus, ContentType } from "@/lib/content-calendar/workflow";

/**
 * Browser-side calls to the calendar API.
 *
 * One place that knows the URLs and the shape of a failure, so every component
 * surfaces the server's own message instead of inventing its own wording.
 * `actorName` rides along on every write — see the note in
 * lib/content-calendar/apiSupport.ts on why the name is sent explicitly.
 */

const base = (slug: string) => `/api/departments/${slug}/calendar`;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  const payload = (await res.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!res.ok) {
    throw new Error(payload?.error ?? `Request failed (${res.status}).`);
  }
  return payload as T;
}

export interface ListParams {
  from?: string;
  to?: string;
  status?: CalendarStatus;
}

export function fetchItems(
  slug: string,
  params: ListParams,
  signal?: AbortSignal
): Promise<{ items: CalendarItem[] }> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.status) query.set("status", params.status);
  return request(`${base(slug)}?${query}`, { signal });
}

export function fetchItem(
  slug: string,
  id: string,
  signal?: AbortSignal
): Promise<{ item: CalendarItemDetail }> {
  return request(`${base(slug)}/${id}`, { signal });
}

export interface ItemDraft {
  title: string;
  summary: string;
  contentType: ContentType;
  channel: string;
  scheduledOn: string;
  scheduledTime: string | null;
  ownerName: string;
  status?: CalendarStatus;
}

export function createItem(
  slug: string,
  draft: ItemDraft,
  actorName: string
): Promise<{ item: CalendarItem }> {
  return request(base(slug), {
    method: "POST",
    body: JSON.stringify({ ...draft, actorName }),
  });
}

export function updateItem(
  slug: string,
  id: string,
  patch: Partial<ItemDraft>,
  actorName: string
): Promise<{ item: CalendarItem }> {
  return request(`${base(slug)}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...patch, actorName }),
  });
}

export function deleteItem(slug: string, id: string): Promise<{ deleted: true }> {
  return request(`${base(slug)}/${id}`, { method: "DELETE" });
}

export function changeStatus(
  slug: string,
  id: string,
  to: CalendarStatus,
  note: string,
  actorName: string
): Promise<{ item: CalendarItem }> {
  return request(`${base(slug)}/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ to, note, actorName }),
  });
}

export function addComment(
  slug: string,
  id: string,
  note: string,
  actorName: string
): Promise<{ event: CalendarEvent }> {
  return request(`${base(slug)}/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ note, actorName }),
  });
}

export function addLink(
  slug: string,
  id: string,
  url: string,
  actorName: string
): Promise<{ link: CalendarLink }> {
  return request(`${base(slug)}/${id}/links`, {
    method: "POST",
    body: JSON.stringify({ url, actorName }),
  });
}

export function deleteLink(
  slug: string,
  id: string,
  linkId: string,
  actorName: string
): Promise<{ deleted: true }> {
  return request(`${base(slug)}/${id}/links/${linkId}`, {
    method: "DELETE",
    body: JSON.stringify({ actorName }),
  });
}

export function deleteAttachment(
  slug: string,
  id: string,
  attachmentId: string,
  actorName: string
): Promise<{ deleted: true }> {
  return request(`${base(slug)}/${id}/attachments/${attachmentId}`, {
    method: "DELETE",
    body: JSON.stringify({ actorName }),
  });
}

/** A link that downloads the file through the API's signed-URL redirect. */
export const attachmentHref = (slug: string, id: string, attachmentId: string): string =>
  `${base(slug)}/${id}/attachments/${attachmentId}`;

/**
 * Upload in three steps: ask for a presigned URL, PUT the body straight to
 * object storage, then have the server verify and record it. The file itself
 * never goes through the API, which is what allows a 200 MB video.
 */
export async function uploadAttachment(
  slug: string,
  id: string,
  file: File,
  actorName: string
): Promise<CalendarAttachment> {
  const fileType = file.type || "application/octet-stream";

  const presign = await request<{ key: string; uploadUrl: string }>(
    `${base(slug)}/${id}/attachments`,
    {
      method: "POST",
      body: JSON.stringify({ fileName: file.name, fileType, fileSize: file.size }),
    }
  );

  const put = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": fileType },
    body: file,
  }).catch(() => null);
  if (!put || !put.ok) {
    throw new Error(
      `"${file.name}" could not be sent to storage${put ? ` (HTTP ${put.status})` : ""}.`
    );
  }

  const done = await request<{ attachment: CalendarAttachment }>(
    `${base(slug)}/${id}/attachments`,
    {
      method: "PUT",
      body: JSON.stringify({ key: presign.key, fileName: file.name, actorName }),
    }
  );
  return done.attachment;
}
