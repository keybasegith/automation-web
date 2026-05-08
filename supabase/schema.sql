-- ===========================================================================
-- Keybase Automation — database schema
--
-- Run this once in the Supabase SQL Editor (Project → SQL → New query).
-- It is idempotent: re-running will not drop or duplicate data.
-- ===========================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- users  (advisors and managers)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id          uuid        primary key default uuid_generate_v4(),
  email       text        not null unique,
  role        text        not null check (role in ('advisor', 'manager')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id               uuid          primary key default uuid_generate_v4(),
  name             text          not null,
  email            text          not null unique,
  risk_tolerance   text          not null check (risk_tolerance in ('Low', 'Medium', 'High')),
  portfolio_value  numeric(14,2) not null default 0,
  created_at       timestamptz   not null default now()
);

create index if not exists clients_email_idx on public.clients(email);

-- ---------------------------------------------------------------------------
-- generated_emails
-- ---------------------------------------------------------------------------
create table if not exists public.generated_emails (
  id          uuid        primary key default uuid_generate_v4(),
  client_id   uuid        not null references public.clients(id) on delete restrict,
  subject     text        not null,
  body        text        not null,
  status      text        not null default 'drafted'
                          check (status in ('drafted', 'approved', 'sent')),
  created_by  uuid        not null references public.users(id) on delete restrict,
  created_at  timestamptz not null default now()
);

create index if not exists generated_emails_client_id_idx  on public.generated_emails(client_id);
create index if not exists generated_emails_status_idx     on public.generated_emails(status);
create index if not exists generated_emails_created_at_idx on public.generated_emails(created_at desc);

-- ---------------------------------------------------------------------------
-- audit_logs  (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id           uuid        primary key default uuid_generate_v4(),
  user_id      uuid        not null references public.users(id) on delete restrict,
  action       text        not null,
  entity_type  text        not null,
  entity_id    uuid        not null,
  metadata     jsonb       not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_user_id_idx    on public.audit_logs(user_id);
create index if not exists audit_logs_entity_idx     on public.audit_logs(entity_type, entity_id);

-- Append-only guard: prevent updates and deletes on audit_logs.
-- (The service role key bypasses RLS, but these triggers apply universally.)
create or replace function public.audit_logs_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_logs is append-only; % is not permitted', tg_op;
end;
$$;

drop trigger if exists audit_logs_no_update on public.audit_logs;
create trigger audit_logs_no_update
  before update on public.audit_logs
  for each row execute function public.audit_logs_immutable();

drop trigger if exists audit_logs_no_delete on public.audit_logs;
create trigger audit_logs_no_delete
  before delete on public.audit_logs
  for each row execute function public.audit_logs_immutable();

-- ---------------------------------------------------------------------------
-- Seed: mock advisor + 5 fixture clients (deterministic UUIDs).
-- These match lib/currentUser.ts and lib/clients.ts.
-- ---------------------------------------------------------------------------
insert into public.users (id, email, role) values
  ('00000000-0000-0000-0000-000000000001', 'admin@keybase.com', 'advisor')
on conflict (id) do nothing;

insert into public.clients (id, name, email, risk_tolerance, portfolio_value) values
  ('11111111-1111-1111-1111-111111111111', 'Sarah Chen',      'sarah.chen@example.com',      'Medium',   850000),
  ('22222222-2222-2222-2222-222222222222', 'James Patel',     'james.patel@example.com',     'High',     320000),
  ('33333333-3333-3333-3333-333333333333', 'Maria Rodriguez', 'maria.rodriguez@example.com', 'Low',     1240000),
  ('44444444-4444-4444-4444-444444444444', 'David Kim',       'david.kim@example.com',       'Medium',  2100000),
  ('55555555-5555-5555-5555-555555555555', 'Emma Thompson',   'emma.thompson@example.com',   'Low',      540000)
on conflict (id) do nothing;
