-- ===========================================================================
-- Migration 002 — compliance_settings (singleton table)
--
-- Run this in Supabase SQL Editor after schema.sql.
-- Idempotent: re-running will not duplicate or destroy data.
-- ===========================================================================

create table if not exists public.compliance_settings (
  id                  uuid        primary key default uuid_generate_v4(),
  signature           text        not null default 'Your Keybase Advisor',
  mandatory_footer    text        not null default '',
  required_phrases    jsonb       not null default '[]'::jsonb,
  prohibited_phrases  jsonb       not null default '[]'::jsonb,
  updated_at          timestamptz not null default now(),
  updated_by          uuid        references public.users(id) on delete set null,
  -- Single-row guard so the table is treated as singleton settings.
  is_singleton        boolean     not null default true,
  constraint compliance_settings_singleton unique (is_singleton)
);

-- Seed the singleton row. Fresh installs get the Keybase confidentiality
-- footer by default; existing DBs are upgraded by migration 010.
insert into public.compliance_settings (id, signature, mandatory_footer)
values (
  '99999999-9999-9999-9999-999999999999',
  'Your Keybase Advisor',
  'The information in this Keybase e-mail is confidential and may be privileged. Any use or disclosure of this e-mail by anyone other than the intended recipient is unauthorized. If you are not the intended recipient, please delete this e-mail and notify us by reply e-mail.'
)
on conflict (is_singleton) do nothing;
