import type { CalendarStatus, ContentType } from "@/lib/content-calendar/workflow";

/**
 * Row shapes (snake_case, as Postgres returns them) and the API shapes
 * (camelCase, what the browser sees). The mapping between the two lives in
 * lib/content-calendar/repo.ts and nowhere else.
 */

export interface CalendarItemRow {
  id: string;
  department: string;
  title: string;
  summary: string;
  status: CalendarStatus;
  content_type: ContentType;
  channel: string;
  scheduled_on: string; // YYYY-MM-DD
  scheduled_time: string | null; // HH:MM:SS
  owner_name: string;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarAttachmentRow {
  id: string;
  item_id: string;
  file_key: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  uploaded_by_name: string;
  created_at: string;
}

export interface CalendarLinkRow {
  id: string;
  item_id: string;
  url: string;
  title: string;
  description: string;
  image_url: string | null;
  site_name: string;
  added_by: string | null;
  added_by_name: string;
  created_at: string;
}

export type CalendarEventKind =
  | "created"
  | "updated"
  | "status_changed"
  | "comment"
  | "attachment_added"
  | "attachment_removed"
  | "link_added"
  | "link_removed";

export interface CalendarEventRow {
  id: string;
  item_id: string;
  kind: CalendarEventKind;
  from_status: CalendarStatus | null;
  to_status: CalendarStatus | null;
  note: string;
  actor_id: string | null;
  actor_name: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// API shapes
// ---------------------------------------------------------------------------

export interface CalendarItem {
  id: string;
  department: string;
  title: string;
  summary: string;
  status: CalendarStatus;
  contentType: ContentType;
  channel: string;
  /** YYYY-MM-DD. A calendar date, deliberately not a timestamp: a piece is
   *  planned for a day, and a timestamp would drift with the reader's zone. */
  scheduledOn: string;
  /** HH:MM, or null when the day is enough. */
  scheduledTime: string | null;
  ownerName: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  attachmentCount: number;
  linkCount: number;
}

export interface CalendarAttachment {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedByName: string;
  createdAt: string;
}

export interface CalendarLink {
  id: string;
  url: string;
  title: string;
  description: string;
  imageUrl: string | null;
  siteName: string;
  addedByName: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  kind: CalendarEventKind;
  fromStatus: CalendarStatus | null;
  toStatus: CalendarStatus | null;
  note: string;
  actorName: string;
  createdAt: string;
}

/** An item with everything the detail panel renders. */
export interface CalendarItemDetail extends CalendarItem {
  attachments: CalendarAttachment[];
  links: CalendarLink[];
  events: CalendarEvent[];
}
