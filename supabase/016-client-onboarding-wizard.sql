-- ===========================================================================
-- 016 — Client onboarding wizard
--
-- Run in the Supabase SQL editor after 015. Idempotent: re-running is safe.
--
-- The wizard (/onboarding/new) collects a new client's NAAF and Client Risk
-- Questionnaire once, fills Keybase's official PDFs from it, and files the
-- client and documents where advisors can find them again. It builds on the
-- onboarding tables from 003 rather than replacing them:
--
--   clients           + Keybase Client ID, entity flag, and a search column
--   onboardings       + the full NAAF / CRQ answers and supporting-document
--                       status (jsonb), the CRQ edition,
--                       wizard progress, signing method, link expiry, and the
--                       joint holder's client row
--   signatures        + 'joint' as a signer type
--   client_documents  new — every generated PDF and uploaded supporting
--                       document (ID, RC518/RC519, PEP declaration, void
--                       cheque, POA, corporate resolution), filed against the client
--   storage           new PRIVATE bucket `client-documents`
--
-- Why a new bucket: 003's `onboarding-documents` is public-read. These PDFs
-- carry SINs, ID numbers and financial details, so they are only ever served
-- through short-lived signed URLs minted server-side.
-- ===========================================================================

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- clients
--
-- A wizard client may have no email address (the NAAF allows it), and the
-- legacy risk_tolerance column has no honest value until the CRQ is scored,
-- so both lose NOT NULL. Existing rows are unaffected; email stays unique.
-- ---------------------------------------------------------------------------
alter table public.clients alter column email drop not null;
alter table public.clients alter column risk_tolerance drop not null;

alter table public.clients add column if not exists keybase_client_id text;
alter table public.clients add column if not exists is_entity         boolean not null default false;

-- One lower-cased string to search on: names, client ID, email, phone.
-- A generated column so it can never drift from the fields it is made of.
alter table public.clients add column if not exists search_text text
  generated always as (
    lower(
      coalesce(name, '') || ' ' ||
      coalesce(first_name, '') || ' ' ||
      coalesce(last_name, '') || ' ' ||
      coalesce(keybase_client_id, '') || ' ' ||
      coalesce(email, '') || ' ' ||
      coalesce(phone, '')
    )
  ) stored;

create index if not exists clients_search_trgm_idx
  on public.clients using gin (search_text gin_trgm_ops);
create index if not exists clients_keybase_client_id_idx
  on public.clients (keybase_client_id);

-- ---------------------------------------------------------------------------
-- onboardings
-- ---------------------------------------------------------------------------
alter table public.onboardings add column if not exists source text not null default 'legacy'
  check (source in ('legacy', 'wizard'));
alter table public.onboardings add column if not exists naaf_data        jsonb;
alter table public.onboardings add column if not exists crq_data         jsonb;
alter table public.onboardings add column if not exists supporting_data  jsonb not null default '{}'::jsonb;
alter table public.onboardings add column if not exists crq_variant      text
  check (crq_variant is null or crq_variant in ('individual', 'joint', 'corporate'));
alter table public.onboardings add column if not exists current_step     text;
alter table public.onboardings add column if not exists visited_steps    text[] not null default '{}';
alter table public.onboardings add column if not exists signing_method   text
  check (signing_method is null or signing_method in ('in_person', 'remote'));
alter table public.onboardings add column if not exists signing_token_expires_at timestamptz;
alter table public.onboardings add column if not exists joint_client_id  uuid
  references public.clients(id) on delete set null;
alter table public.onboardings add column if not exists completed_at     timestamptz;

create index if not exists onboardings_source_idx       on public.onboardings(source);
create index if not exists onboardings_joint_client_idx on public.onboardings(joint_client_id);

-- ---------------------------------------------------------------------------
-- signatures — a joint account holder signs too
-- ---------------------------------------------------------------------------
alter table public.signatures drop constraint if exists signatures_type_check;
alter table public.signatures add constraint signatures_type_check
  check (type in ('client', 'joint', 'advisor'));

-- ---------------------------------------------------------------------------
-- client_documents — every generated PDF, filed against the client
--
-- The binary lives in the private bucket; this row is the index advisors
-- search through. `signed` separates the copy sent out for signature from the
-- executed one, and both are kept.
-- ---------------------------------------------------------------------------
create table if not exists public.client_documents (
  id             uuid        primary key default uuid_generate_v4(),
  client_id      uuid        not null references public.clients(id) on delete cascade,
  onboarding_id  uuid        references public.onboardings(id) on delete set null,
  kind           text        not null check (kind in ('naaf', 'crq', 'supporting', 'other')),
  -- For kind = 'supporting': which requirement it satisfies (id-A, tax-residence-A, pep-B, void-cheque, poa, …).
  document_type  text,
  crq_variant    text        check (crq_variant is null or crq_variant in ('individual', 'joint', 'corporate')),
  title          text        not null,
  storage_path   text        not null unique,
  byte_size      integer     not null,
  sha256         text        not null,
  signed         boolean     not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists client_documents_client_idx     on public.client_documents(client_id, created_at desc);
create index if not exists client_documents_onboarding_idx on public.client_documents(onboarding_id);

-- The server uses the service-role key; nothing reads these tables with the
-- anon key, so RLS is enabled with no policies — anon gets nothing.
alter table public.client_documents enable row level security;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for the generated PDFs
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', false)
on conflict (id) do update set public = false;
