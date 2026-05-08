-- ===========================================================================
-- Migration 009 — Secure Email PIN approval
--
-- Run after 008-secure-email-client-link.sql. Idempotent.
--
-- Adds the columns and seed data needed for the PIN-based approval flow on
-- the secure email "Approve & send" action:
--
-- 1. `users.name` — the display name used to substitute [Advisor Name] in
--    the email body at send time. Each PIN-holder has their own name, so
--    the email signs off with whoever entered the PIN, not a generic label.
-- 2. `secure_email_drafts.approved_by` / `approved_at` — who approved the
--    send and when. The matching `compliance_pins` row is what proves it
--    was actually that user (we never store the raw PIN).
-- 3. `secure_email_drafts.approved_name_snapshot` — the name we stamped
--    into the body. Stored alongside the user id so the audit row remains
--    accurate even if someone renames the user later.
--
-- Also seeds three sample advisors with demo PINs so the flow can be
-- exercised end-to-end without wiring real auth:
--   1234 → Shomari Hutchinson
--   5678 → Jamie Lee
--   9999 → Morgan Patel
-- These are demo-grade only. Production should use enrolment via the
-- compliance settings UI.
-- ===========================================================================

-- pgcrypto is preinstalled on Supabase in the `extensions` schema. We call
-- digest() with an explicit schema below so this script does not depend on
-- the search_path including `extensions`.

-- 1. Add display name to users.
alter table public.users add column if not exists name text;

update public.users
set name = 'Admin'
where id = '00000000-0000-0000-0000-000000000001'
  and name is null;

-- 2. Approval columns on the draft row.
alter table public.secure_email_drafts
  add column if not exists approved_by uuid
    references public.users(id) on delete set null;

alter table public.secure_email_drafts
  add column if not exists approved_at timestamptz;

alter table public.secure_email_drafts
  add column if not exists approved_name_snapshot text;

create index if not exists secure_email_drafts_approved_by_idx
  on public.secure_email_drafts(approved_by);

-- 3. compliance_pins — hashed PIN per user. The same table is also created
--    by migration 006 (form-processing); we re-declare it here with `if not
--    exists` so the secure-email feature does not depend on that migration
--    being run first. The trigger from 006 is optional and is only needed
--    for `updated_at` maintenance — we skip it here to avoid depending on
--    `public.touch_updated_at()` (also defined in 006).
create table if not exists public.compliance_pins (
  user_id      uuid        primary key references public.users(id) on delete cascade,
  pin_hash     text        not null,
  pin_salt     text        not null,
  updated_at   timestamptz not null default now()
);

-- 4. Seed sample advisors. Deterministic UUIDs so re-running stays a no-op.
insert into public.users (id, email, role, name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'shomari.hutchinson@keybase.com', 'advisor', 'Shomari Hutchinson'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'jamie.lee@keybase.com',          'advisor', 'Jamie Lee'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'morgan.patel@keybase.com',       'manager', 'Morgan Patel')
on conflict (id) do nothing;

-- 5. Seed PINs. Hash matches the lib/forms/pin.ts scheme: sha256(pin || salt).
do $$
declare
  v_salt text := 'demo-salt-do-not-use-in-prod';
begin
  insert into public.compliance_pins (user_id, pin_hash, pin_salt) values
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     encode(extensions.digest('1234' || v_salt, 'sha256'), 'hex'), v_salt),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
     encode(extensions.digest('5678' || v_salt, 'sha256'), 'hex'), v_salt),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc',
     encode(extensions.digest('9999' || v_salt, 'sha256'), 'hex'), v_salt)
  on conflict (user_id) do nothing;
end $$;
