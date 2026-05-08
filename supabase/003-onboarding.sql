-- ===========================================================================
-- Migration 003 — Client Onboarding System
--
-- Run in Supabase SQL Editor after 002-compliance-settings.sql.
-- Idempotent: re-running is safe.
--
-- Adds:
--   * extra columns on public.clients (the existing `name` column stays so
--     all current code keeps working — onboarding stores first/last separately
--     and writes a combined `name` for back-compat).
--   * public.onboardings, public.signatures, public.onboarding_events.
--   * a private storage bucket `onboarding-documents` for KYC/NAAF files.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- clients — add new columns (leave existing ones untouched)
-- ---------------------------------------------------------------------------
alter table public.clients add column if not exists first_name        text;
alter table public.clients add column if not exists last_name         text;
alter table public.clients add column if not exists phone             text;
alter table public.clients add column if not exists date_of_birth     date;
alter table public.clients add column if not exists address           text;
alter table public.clients add column if not exists city              text;
alter table public.clients add column if not exists country           text;
alter table public.clients add column if not exists employment_status text;
alter table public.clients add column if not exists annual_income     numeric(14,2);
alter table public.clients add column if not exists risk_profile      text
  check (risk_profile is null or risk_profile in ('Low', 'Medium', 'High'));
alter table public.clients add column if not exists advisor_name      text;

-- ---------------------------------------------------------------------------
-- onboardings
-- ---------------------------------------------------------------------------
create table if not exists public.onboardings (
  id                  uuid        primary key default uuid_generate_v4(),
  client_id           uuid        not null references public.clients(id) on delete cascade,
  status              text        not null default 'draft'
                                  check (status in ('draft','in_progress','sent','signed','completed')),
  signing_token       text        not null unique default replace(uuid_generate_v4()::text, '-', ''),
  kyc_document_url    text,
  naaf_document_url   text,
  signed_kyc_url      text,
  signed_naaf_url     text,
  client_signed_at    timestamptz,
  advisor_signed_at   timestamptz,
  sent_at             timestamptz,
  created_by          uuid        references public.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists onboardings_client_id_idx on public.onboardings(client_id);
create index if not exists onboardings_status_idx    on public.onboardings(status);
create index if not exists onboardings_token_idx     on public.onboardings(signing_token);

-- Auto-bump updated_at.
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists onboardings_touch_updated_at on public.onboardings;
create trigger onboardings_touch_updated_at
  before update on public.onboardings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- signatures (raster image stored in storage; row records metadata)
-- ---------------------------------------------------------------------------
create table if not exists public.signatures (
  id              uuid        primary key default uuid_generate_v4(),
  onboarding_id   uuid        not null references public.onboardings(id) on delete cascade,
  type            text        not null check (type in ('client', 'advisor')),
  signature_url   text        not null,
  signed_at       timestamptz not null default now(),
  unique (onboarding_id, type)
);

create index if not exists signatures_onboarding_idx on public.signatures(onboarding_id);

-- ---------------------------------------------------------------------------
-- onboarding_events (append-only audit trail; separate from public.audit_logs
-- to avoid colliding with the email-pipeline schema)
-- ---------------------------------------------------------------------------
create table if not exists public.onboarding_events (
  id            uuid        primary key default uuid_generate_v4(),
  onboarding_id uuid        not null references public.onboardings(id) on delete cascade,
  event_type    text        not null
                            check (event_type in ('created','updated','sent','viewed','signed','generated','completed')),
  ip_address    text,
  user_agent    text,
  metadata      jsonb       not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists onboarding_events_onboarding_idx on public.onboarding_events(onboarding_id);
create index if not exists onboarding_events_created_idx    on public.onboarding_events(created_at desc);

-- Append-only guard.
drop trigger if exists onboarding_events_no_update on public.onboarding_events;
create trigger onboarding_events_no_update
  before update on public.onboarding_events
  for each row execute function public.audit_logs_immutable();

drop trigger if exists onboarding_events_no_delete on public.onboarding_events;
create trigger onboarding_events_no_delete
  before delete on public.onboarding_events
  for each row execute function public.audit_logs_immutable();

-- ---------------------------------------------------------------------------
-- Storage bucket for generated + signed documents.
-- Public-read so the in-app preview iframe works without signed URLs;
-- the file paths use unguessable UUIDs so the surface is small for an MVP.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('onboarding-documents', 'onboarding-documents', true)
on conflict (id) do update set public = excluded.public;
