-- ===========================================================================
-- 015 — Department content calendar (built for Marketing)
--
-- A shared planning surface for content: one row per planned piece, with the
-- files, reference links, and the full history of who moved it where.
--
-- Four tables, each with one job:
--   content_calendar_items        the planned piece and where it sits in the
--                                 workflow (the calendar cell)
--   content_calendar_attachments  metadata for files in object storage; the
--                                 binaries live in S3 (MEDIA_S3_*), never here
--   content_calendar_links        reference URLs plus the Open Graph preview
--                                 captured when the link was added
--   content_calendar_events       append-only trail: status moves, comments,
--                                 attachments added or removed
--
-- The dashboard currently signs everyone in through one shared internal
-- account (lib/auth/users.ts), so `created_by` / `actor_id` cannot say which
-- person acted. Every table therefore also carries the display name the actor
-- entered in the UI. When SSO lands, the name columns become redundant and the
-- id columns become the record — that is the intended direction.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Items
-- ---------------------------------------------------------------------------
create table if not exists public.content_calendar_items (
  id              uuid        primary key default uuid_generate_v4(),
  department      text        not null,
  title           text        not null,
  summary         text        not null default '',
  -- The pipeline, in order. A piece moves forward one stage at a time and can
  -- be sent back to any earlier stage; lib/marketing-calendar/workflow.ts is
  -- the single definition both the API and the UI read.
  status          text        not null default 'idea'
                              check (status in (
                                'idea',
                                'pending_approval',
                                'approved',
                                'in_production',
                                'compliance_review',
                                'compliance_cleared',
                                'ready_to_post',
                                'published'
                              )),
  content_type    text        not null default 'other'
                              check (content_type in (
                                'blog','social','newsletter','video','event','ad','other'
                              )),
  channel         text        not null default '',
  scheduled_on    date        not null,
  scheduled_time  time,
  owner_name      text        not null default '',
  created_by      uuid        references public.users(id) on delete set null,
  created_by_name text        not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists content_calendar_items_dept_date_idx
  on public.content_calendar_items(department, scheduled_on);
create index if not exists content_calendar_items_dept_status_idx
  on public.content_calendar_items(department, status, scheduled_on);

-- ---------------------------------------------------------------------------
-- Attachments — metadata only. `file_key` is the object-storage key, resolved
-- to a short-lived presigned URL at download time so the bucket need not be
-- public.
-- ---------------------------------------------------------------------------
create table if not exists public.content_calendar_attachments (
  id               uuid        primary key default uuid_generate_v4(),
  item_id          uuid        not null references public.content_calendar_items(id) on delete cascade,
  file_key         text        not null unique,
  file_name        text        not null,
  content_type     text        not null default 'application/octet-stream',
  size_bytes       bigint      not null default 0,
  uploaded_by      uuid        references public.users(id) on delete set null,
  uploaded_by_name text        not null default '',
  created_at       timestamptz not null default now()
);

create index if not exists content_calendar_attachments_item_idx
  on public.content_calendar_attachments(item_id, created_at);

-- ---------------------------------------------------------------------------
-- Links — the preview is captured once, at add time. A page that later changes
-- or disappears does not silently rewrite what the team saw.
-- ---------------------------------------------------------------------------
create table if not exists public.content_calendar_links (
  id            uuid        primary key default uuid_generate_v4(),
  item_id       uuid        not null references public.content_calendar_items(id) on delete cascade,
  url           text        not null,
  title         text        not null default '',
  description   text        not null default '',
  image_url     text,
  site_name     text        not null default '',
  added_by      uuid        references public.users(id) on delete set null,
  added_by_name text        not null default '',
  created_at    timestamptz not null default now()
);

create index if not exists content_calendar_links_item_idx
  on public.content_calendar_links(item_id, created_at);

-- ---------------------------------------------------------------------------
-- Events — the history strip under every item. Append-only by convention:
-- nothing in the application updates or deletes a row here.
-- ---------------------------------------------------------------------------
create table if not exists public.content_calendar_events (
  id          uuid        primary key default uuid_generate_v4(),
  item_id     uuid        not null references public.content_calendar_items(id) on delete cascade,
  kind        text        not null
                          check (kind in (
                            'created','updated','status_changed','comment',
                            'attachment_added','attachment_removed',
                            'link_added','link_removed'
                          )),
  from_status text,
  to_status   text,
  note        text        not null default '',
  actor_id    uuid        references public.users(id) on delete set null,
  actor_name  text        not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists content_calendar_events_item_idx
  on public.content_calendar_events(item_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Seed: a month of marketing work so the calendar is not empty on first open.
-- Fixed ids keep this re-runnable.
-- ---------------------------------------------------------------------------
insert into public.content_calendar_items
  (id, department, title, summary, status, content_type, channel,
   scheduled_on, owner_name, created_by_name)
values
  ('c0000000-0000-4000-a000-000000000001','marketing',
   'RRSP season blog — "Contribution room, explained"',
   'Explainer aimed at first-time contributors. Draft is with compliance.',
   'compliance_review','blog','Website blog',
   current_date + 3, 'Krissy', 'Krissy'),
  ('c0000000-0000-4000-a000-000000000002','marketing',
   'LinkedIn carousel — 5 TFSA myths',
   'Five-slide carousel repurposed from the TFSA landing page.',
   'in_production','social','LinkedIn',
   current_date + 5, 'Intern — Dana', 'Dana'),
  ('c0000000-0000-4000-a000-000000000003','marketing',
   'October newsletter',
   'Monthly client newsletter. Needs the market-recap section from Finance.',
   'idea','newsletter','Email',
   current_date + 12, 'Krissy', 'Krissy'),
  ('c0000000-0000-4000-a000-000000000004','marketing',
   'Advisor spotlight video — Jaxon',
   'Two-minute profile video for the advisor page.',
   'pending_approval','video','YouTube',
   current_date + 8, 'Intern — Marco', 'Marco'),
  ('c0000000-0000-4000-a000-000000000005','marketing',
   'Estate planning webinar — promo post',
   'Promo post for the November webinar. Compliance cleared; scheduling next.',
   'ready_to_post','social','Instagram',
   current_date + 1, 'Dana', 'Dana')
on conflict (id) do nothing;

insert into public.content_calendar_events
  (item_id, kind, from_status, to_status, note, actor_name)
values
  ('c0000000-0000-4000-a000-000000000001','status_changed','in_production','compliance_review',
   'Draft finished — sending for compliance review.','Krissy'),
  ('c0000000-0000-4000-a000-000000000005','status_changed','compliance_cleared','ready_to_post',
   'Cleared with the disclaimer added to the caption.','Compliance'),
  ('c0000000-0000-4000-a000-000000000004','status_changed','idea','pending_approval',
   'Storyboard attached — requesting sign-off before we book the studio.','Marco')
on conflict do nothing;
