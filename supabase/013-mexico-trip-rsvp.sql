-- ===========================================================================
-- 013 — Trip RSVPs (Huatulco 2026)
--
-- Backs the attendance capture on /mexico-trip. Deliberately trip-agnostic:
-- `trip_slug` scopes each set of responses so a future incentive trip reuses
-- the same table rather than adding another one.
--
-- One response per person per trip. Re-submitting the form with the same
-- email updates the existing row (see the RSVP route handler's upsert), so a
-- "maybe" can become a "yes" without creating duplicates for the planners.
-- ===========================================================================

create table if not exists public.trip_rsvps (
  id             uuid        primary key default uuid_generate_v4(),
  trip_slug      text        not null default 'huatulco-2026',
  full_name      text        not null,
  -- Stored lower-cased by the API so the unique constraint below is
  -- case-insensitive without needing an expression index.
  email          text        not null,
  attending      text        not null check (attending in ('yes', 'maybe', 'no')),
  passport_ready boolean     not null default false,
  dietary        text,
  message        text,
  source         text        not null default 'mexico-trip-landing',
  metadata       jsonb       not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- The upsert target. Must be a real unique constraint (not just an index) for
-- PostgREST's on_conflict to resolve it.
alter table public.trip_rsvps
  drop constraint if exists trip_rsvps_trip_email_key;
alter table public.trip_rsvps
  add constraint trip_rsvps_trip_email_key unique (trip_slug, email);

create index if not exists trip_rsvps_trip_attending_idx
  on public.trip_rsvps(trip_slug, attending);
create index if not exists trip_rsvps_trip_created_idx
  on public.trip_rsvps(trip_slug, created_at desc);

-- Responses are written and read only by the server (service-role key), so
-- RLS is on with no permissive policy: anon/authenticated clients get nothing.
alter table public.trip_rsvps enable row level security;

comment on table public.trip_rsvps is
  'Attendance responses for incentive trips, scoped by trip_slug. Written by /api/mexico-trip/rsvp with the service-role key.';
