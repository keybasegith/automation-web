import { getServerSupabase } from "@/lib/supabaseClient";
import type { CalendarStatus, ContentType } from "@/lib/content-calendar/workflow";
import type {
  CalendarAttachment,
  CalendarAttachmentRow,
  CalendarEvent,
  CalendarEventKind,
  CalendarEventRow,
  CalendarItem,
  CalendarItemDetail,
  CalendarItemRow,
  CalendarLink,
  CalendarLinkRow,
} from "@/lib/content-calendar/types";

/**
 * Every database read and write the content calendar makes.
 *
 * Routes never touch Supabase directly — they call these — so the row shape,
 * the camelCase mapping, and the department scoping are each defined once.
 * Department scoping in particular is a filter on every query rather than a
 * caller's responsibility: an id alone must never be enough to reach another
 * department's item.
 */

export interface Actor {
  id: string | null;
  /** The display name typed into the UI. See the migration's header note. */
  name: string;
}

// A function declaration, not an arrow: TypeScript only narrows past a
// never-returning call when it can see the declaration this way.
function fail(what: string, message?: string): never {
  throw new Error(`Content calendar: failed to ${what}${message ? ` — ${message}` : ""}`);
}

/** PostgREST returns embedded aggregates as `[{ count: n }]`. */
const embeddedCount = (value: unknown): number =>
  Array.isArray(value) && value.length > 0
    ? Number((value[0] as { count?: number }).count ?? 0)
    : 0;

interface ItemRowWithCounts extends CalendarItemRow {
  attachments?: { count: number }[];
  links?: { count: number }[];
}

const toItem = (row: ItemRowWithCounts): CalendarItem => ({
  id: row.id,
  department: row.department,
  title: row.title,
  summary: row.summary,
  status: row.status,
  contentType: row.content_type,
  channel: row.channel,
  scheduledOn: row.scheduled_on,
  // Postgres hands back HH:MM:SS; the UI only ever shows and edits HH:MM.
  scheduledTime: row.scheduled_time ? row.scheduled_time.slice(0, 5) : null,
  ownerName: row.owner_name,
  createdByName: row.created_by_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  attachmentCount: embeddedCount(row.attachments),
  linkCount: embeddedCount(row.links),
});

const toAttachment = (row: CalendarAttachmentRow): CalendarAttachment => ({
  id: row.id,
  fileName: row.file_name,
  contentType: row.content_type,
  sizeBytes: Number(row.size_bytes),
  uploadedByName: row.uploaded_by_name,
  createdAt: row.created_at,
});

const toLink = (row: CalendarLinkRow): CalendarLink => ({
  id: row.id,
  url: row.url,
  title: row.title,
  description: row.description,
  imageUrl: row.image_url,
  siteName: row.site_name,
  addedByName: row.added_by_name,
  createdAt: row.created_at,
});

const toEvent = (row: CalendarEventRow): CalendarEvent => ({
  id: row.id,
  kind: row.kind,
  fromStatus: row.from_status,
  toStatus: row.to_status,
  note: row.note,
  actorName: row.actor_name,
  createdAt: row.created_at,
});

const ITEM_SELECT =
  "*, attachments:content_calendar_attachments(count), links:content_calendar_links(count)";

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export interface ListItemsFilters {
  department: string;
  /** Inclusive YYYY-MM-DD bounds. Both optional: omitted means unbounded. */
  from?: string;
  to?: string;
  status?: CalendarStatus;
}

export async function listItems(filters: ListItemsFilters): Promise<CalendarItem[]> {
  const supabase = getServerSupabase();
  let query = supabase
    .from("content_calendar_items")
    .select(ITEM_SELECT)
    .eq("department", filters.department)
    .order("scheduled_on", { ascending: true })
    .order("scheduled_time", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  if (filters.from) query = query.gte("scheduled_on", filters.from);
  if (filters.to) query = query.lte("scheduled_on", filters.to);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) fail("list items", error.message);
  return (data as ItemRowWithCounts[]).map(toItem);
}

export interface CreateItemInput {
  department: string;
  title: string;
  summary: string;
  contentType: ContentType;
  channel: string;
  scheduledOn: string;
  scheduledTime: string | null;
  ownerName: string;
  status: CalendarStatus;
  actor: Actor;
}

export async function createItem(input: CreateItemInput): Promise<CalendarItem> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("content_calendar_items")
    .insert({
      department: input.department,
      title: input.title,
      summary: input.summary,
      status: input.status,
      content_type: input.contentType,
      channel: input.channel,
      scheduled_on: input.scheduledOn,
      scheduled_time: input.scheduledTime,
      owner_name: input.ownerName,
      created_by: input.actor.id,
      created_by_name: input.actor.name,
    })
    .select(ITEM_SELECT)
    .single();

  if (error || !data) fail("create the item", error?.message);

  const item = toItem(data as ItemRowWithCounts);
  await recordEvent({
    itemId: item.id,
    kind: "created",
    toStatus: item.status,
    note: "",
    actor: input.actor,
  });
  return item;
}

export async function getItem(
  department: string,
  id: string
): Promise<CalendarItem | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("content_calendar_items")
    .select(ITEM_SELECT)
    .eq("department", department)
    .eq("id", id)
    .maybeSingle();

  if (error) fail("load the item", error.message);
  return data ? toItem(data as ItemRowWithCounts) : null;
}

/** The item plus its attachments, links, and history — one call per table. */
export async function getItemDetail(
  department: string,
  id: string
): Promise<CalendarItemDetail | null> {
  const item = await getItem(department, id);
  if (!item) return null;

  const supabase = getServerSupabase();
  const [attachments, links, events] = await Promise.all([
    supabase
      .from("content_calendar_attachments")
      .select("*")
      .eq("item_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("content_calendar_links")
      .select("*")
      .eq("item_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("content_calendar_events")
      .select("*")
      .eq("item_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (attachments.error) fail("load attachments", attachments.error.message);
  if (links.error) fail("load links", links.error.message);
  if (events.error) fail("load the history", events.error.message);

  return {
    ...item,
    attachments: (attachments.data as CalendarAttachmentRow[]).map(toAttachment),
    links: (links.data as CalendarLinkRow[]).map(toLink),
    events: (events.data as CalendarEventRow[]).map(toEvent),
  };
}

export interface UpdateItemInput {
  title?: string;
  summary?: string;
  contentType?: ContentType;
  channel?: string;
  scheduledOn?: string;
  scheduledTime?: string | null;
  ownerName?: string;
}

export async function updateItem(
  department: string,
  id: string,
  patch: UpdateItemInput,
  actor: Actor
): Promise<CalendarItem | null> {
  const fields: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) fields.title = patch.title;
  if (patch.summary !== undefined) fields.summary = patch.summary;
  if (patch.contentType !== undefined) fields.content_type = patch.contentType;
  if (patch.channel !== undefined) fields.channel = patch.channel;
  if (patch.scheduledOn !== undefined) fields.scheduled_on = patch.scheduledOn;
  if (patch.scheduledTime !== undefined) fields.scheduled_time = patch.scheduledTime;
  if (patch.ownerName !== undefined) fields.owner_name = patch.ownerName;

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("content_calendar_items")
    .update(fields)
    .eq("department", department)
    .eq("id", id)
    .select(ITEM_SELECT)
    .maybeSingle();

  if (error) fail("update the item", error.message);
  if (!data) return null;

  const item = toItem(data as ItemRowWithCounts);
  await recordEvent({ itemId: id, kind: "updated", note: "", actor });
  return item;
}

/** Moves the item and records the move. The caller validates the transition. */
export async function setStatus(
  department: string,
  id: string,
  from: CalendarStatus,
  to: CalendarStatus,
  note: string,
  actor: Actor
): Promise<CalendarItem | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("content_calendar_items")
    .update({ status: to, updated_at: new Date().toISOString() })
    .eq("department", department)
    .eq("id", id)
    // Optimistic concurrency: if someone else moved it first, this matches no
    // row and the caller re-reads rather than overwriting their move.
    .eq("status", from)
    .select(ITEM_SELECT)
    .maybeSingle();

  if (error) fail("change the status", error.message);
  if (!data) return null;

  await recordEvent({
    itemId: id,
    kind: "status_changed",
    fromStatus: from,
    toStatus: to,
    note,
    actor,
  });
  return toItem(data as ItemRowWithCounts);
}

export async function deleteItem(department: string, id: string): Promise<boolean> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("content_calendar_items")
    .delete()
    .eq("department", department)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) fail("delete the item", error.message);
  return Boolean(data);
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface RecordEventInput {
  itemId: string;
  kind: CalendarEventKind;
  fromStatus?: CalendarStatus | null;
  toStatus?: CalendarStatus | null;
  note?: string;
  actor: Actor;
}

export async function recordEvent(input: RecordEventInput): Promise<CalendarEvent> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("content_calendar_events")
    .insert({
      item_id: input.itemId,
      kind: input.kind,
      from_status: input.fromStatus ?? null,
      to_status: input.toStatus ?? null,
      note: input.note ?? "",
      actor_id: input.actor.id,
      actor_name: input.actor.name,
    })
    .select("*")
    .single();

  if (error || !data) fail("record the event", error?.message);
  return toEvent(data as CalendarEventRow);
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export interface InsertAttachmentInput {
  itemId: string;
  fileKey: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  actor: Actor;
}

export async function insertAttachment(
  input: InsertAttachmentInput
): Promise<CalendarAttachment> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("content_calendar_attachments")
    .insert({
      item_id: input.itemId,
      file_key: input.fileKey,
      file_name: input.fileName,
      content_type: input.contentType,
      size_bytes: input.sizeBytes,
      uploaded_by: input.actor.id,
      uploaded_by_name: input.actor.name,
    })
    .select("*")
    .single();

  if (error || !data) fail("record the attachment", error?.message);

  await recordEvent({
    itemId: input.itemId,
    kind: "attachment_added",
    note: input.fileName,
    actor: input.actor,
  });
  return toAttachment(data as CalendarAttachmentRow);
}

/** The stored row, including the object key the API needs to sign a download. */
export async function getAttachmentRow(
  itemId: string,
  attachmentId: string
): Promise<CalendarAttachmentRow | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("content_calendar_attachments")
    .select("*")
    .eq("item_id", itemId)
    .eq("id", attachmentId)
    .maybeSingle();

  if (error) fail("load the attachment", error.message);
  return (data as CalendarAttachmentRow | null) ?? null;
}

export async function deleteAttachmentRow(
  itemId: string,
  attachmentId: string
): Promise<CalendarAttachmentRow | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("content_calendar_attachments")
    .delete()
    .eq("item_id", itemId)
    .eq("id", attachmentId)
    .select("*")
    .maybeSingle();

  if (error) fail("delete the attachment", error.message);
  return (data as CalendarAttachmentRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

export interface InsertLinkInput {
  itemId: string;
  url: string;
  title: string;
  description: string;
  imageUrl: string | null;
  siteName: string;
  actor: Actor;
}

export async function insertLink(input: InsertLinkInput): Promise<CalendarLink> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("content_calendar_links")
    .insert({
      item_id: input.itemId,
      url: input.url,
      title: input.title,
      description: input.description,
      image_url: input.imageUrl,
      site_name: input.siteName,
      added_by: input.actor.id,
      added_by_name: input.actor.name,
    })
    .select("*")
    .single();

  if (error || !data) fail("save the link", error?.message);

  await recordEvent({
    itemId: input.itemId,
    kind: "link_added",
    note: input.title || input.url,
    actor: input.actor,
  });
  return toLink(data as CalendarLinkRow);
}

export async function deleteLinkRow(
  itemId: string,
  linkId: string
): Promise<CalendarLinkRow | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("content_calendar_links")
    .delete()
    .eq("item_id", itemId)
    .eq("id", linkId)
    .select("*")
    .maybeSingle();

  if (error) fail("delete the link", error.message);
  return (data as CalendarLinkRow | null) ?? null;
}
