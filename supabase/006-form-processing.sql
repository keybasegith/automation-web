-- ===========================================================================
-- Migration 006 — Form Intelligence & Compliance Review
--
-- Run after 005. Idempotent.
--
-- Adds the entire NAAF → KYC → CRQ → Compliance → BP/WindFund pipeline.
-- The schema is split into per-stage tables so each step has its own audit
-- surface; submissions row is the join.
-- ===========================================================================

-- pgcrypto is required for digest() (used for the demo PIN seed).
create extension if not exists pgcrypto;

-- Widen the existing role check to support compliance, bp, admin.
alter table public.users
  drop constraint if exists users_role_check;
alter table public.users
  add constraint users_role_check
  check (role in ('advisor','manager','compliance','bp','admin'));

-- Seed demo users for each role (idempotent on id).
insert into public.users (id, email, role) values
  ('00000000-0000-0000-0000-000000000002', 'compliance@keybase.com', 'compliance'),
  ('00000000-0000-0000-0000-000000000003', 'bp@keybase.com', 'bp'),
  ('00000000-0000-0000-0000-000000000004', 'admin@keybase.local', 'admin')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- submissions — the master record for one NAAF→WindFund flow
-- ---------------------------------------------------------------------------
create table if not exists public.submissions (
  id              uuid        primary key default uuid_generate_v4(),
  client_name     text        not null,
  advisor_id      uuid        references public.users(id) on delete set null,
  status          text        not null default 'naaf_uploaded'
                              check (status in (
                                'naaf_uploaded',
                                'extraction_completed',
                                'kyc_draft_created',
                                'crq_draft_created',
                                'ready_for_consistency_check',
                                'submitted_to_compliance',
                                'returned_to_advisor',
                                'clarification_requested',
                                'approved_by_compliance',
                                'rejected_by_compliance',
                                'sent_to_bp',
                                'pushed_to_windfund'
                              )),
  mismatch_count  integer     not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists submissions_advisor_idx on public.submissions(advisor_id);
create index if not exists submissions_status_idx  on public.submissions(status);
create index if not exists submissions_created_idx on public.submissions(created_at desc);

drop trigger if exists submissions_touch_updated_at on public.submissions;
create trigger submissions_touch_updated_at
  before update on public.submissions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- uploaded_documents — physical files attached to a submission
-- ---------------------------------------------------------------------------
create table if not exists public.uploaded_documents (
  id              uuid        primary key default uuid_generate_v4(),
  submission_id   uuid        not null references public.submissions(id) on delete cascade,
  file_name       text        not null,
  file_type       text,
  file_url        text        not null,
  uploaded_by     uuid        references public.users(id) on delete set null,
  uploaded_at     timestamptz not null default now(),
  document_type   text        not null check (document_type in ('NAAF','KYC','CRQ','OTHER'))
);

create index if not exists uploaded_documents_submission_idx on public.uploaded_documents(submission_id);

-- ---------------------------------------------------------------------------
-- extracted_naaf_data — 1:1 with submission
-- ---------------------------------------------------------------------------
create table if not exists public.extracted_naaf_data (
  submission_id           uuid         primary key references public.submissions(id) on delete cascade,
  raw_text                text         not null default '',
  fields                  jsonb        not null default '{}'::jsonb,
  field_confidence_map    jsonb        not null default '{}'::jsonb,
  field_source_map        jsonb        not null default '{}'::jsonb,
  extraction_confidence   numeric(4,3) not null default 0.0,
  extraction_warnings     jsonb        not null default '[]'::jsonb,
  updated_at              timestamptz  not null default now()
);

drop trigger if exists extracted_naaf_data_touch on public.extracted_naaf_data;
create trigger extracted_naaf_data_touch
  before update on public.extracted_naaf_data
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- kyc_drafts — 1:1 with submission
-- ---------------------------------------------------------------------------
create table if not exists public.kyc_drafts (
  submission_id     uuid         primary key references public.submissions(id) on delete cascade,
  fields            jsonb        not null default '{}'::jsonb,
  field_source_map  jsonb        not null default '{}'::jsonb,
  missing_fields    jsonb        not null default '[]'::jsonb,
  ready             boolean      not null default false,
  updated_at        timestamptz  not null default now()
);

drop trigger if exists kyc_drafts_touch on public.kyc_drafts;
create trigger kyc_drafts_touch
  before update on public.kyc_drafts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- crq_drafts — 1:1 with submission
-- ---------------------------------------------------------------------------
create table if not exists public.crq_drafts (
  submission_id                       uuid        primary key references public.submissions(id) on delete cascade,
  fields                              jsonb       not null default '{}'::jsonb,
  field_source_map                    jsonb       not null default '{}'::jsonb,
  missing_fields                      jsonb       not null default '[]'::jsonb,
  needs_client_confirmation_fields    jsonb       not null default '[]'::jsonb,
  ready                               boolean     not null default false,
  updated_at                          timestamptz not null default now()
);

drop trigger if exists crq_drafts_touch on public.crq_drafts;
create trigger crq_drafts_touch
  before update on public.crq_drafts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- consistency_check_results — append-only history of runs
-- ---------------------------------------------------------------------------
create table if not exists public.consistency_check_results (
  id              uuid        primary key default uuid_generate_v4(),
  submission_id   uuid        not null references public.submissions(id) on delete cascade,
  overall_status  text        not null check (overall_status in (
                                'no_issues_detected',
                                'needs_advisor_review',
                                'needs_compliance_review',
                                'blocked_missing_required'
                              )),
  flags           jsonb       not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists consistency_results_submission_idx on public.consistency_check_results(submission_id);
create index if not exists consistency_results_created_idx on public.consistency_check_results(created_at desc);

-- ---------------------------------------------------------------------------
-- compliance_reviews — append-only decision history
-- ---------------------------------------------------------------------------
create table if not exists public.compliance_reviews (
  id              uuid        primary key default uuid_generate_v4(),
  submission_id   uuid        not null references public.submissions(id) on delete cascade,
  reviewer_id     uuid        references public.users(id) on delete set null,
  decision        text        not null check (decision in (
                                'approved',
                                'returned_to_advisor',
                                'clarification_requested',
                                'rejected'
                              )),
  notes           text,
  reviewed_at     timestamptz not null default now(),
  pin_verified    boolean     not null default false
);

create index if not exists compliance_reviews_submission_idx on public.compliance_reviews(submission_id);
create index if not exists compliance_reviews_reviewed_idx on public.compliance_reviews(reviewed_at desc);

-- ---------------------------------------------------------------------------
-- bp_processing — 1:1 with submission once it reaches BP queue
-- ---------------------------------------------------------------------------
create table if not exists public.bp_processing (
  submission_id          uuid        primary key references public.submissions(id) on delete cascade,
  status                 text        not null default 'awaiting_processing'
                                     check (status in (
                                       'awaiting_processing',
                                       'in_progress',
                                       'pushed_to_windfund'
                                     )),
  pushed_to_windfund_at  timestamptz,
  bp_user_id             uuid        references public.users(id) on delete set null,
  notes                  text,
  updated_at             timestamptz not null default now()
);

drop trigger if exists bp_processing_touch on public.bp_processing;
create trigger bp_processing_touch
  before update on public.bp_processing
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- compliance_pins — hashed PIN per reviewer (never store raw)
-- ---------------------------------------------------------------------------
create table if not exists public.compliance_pins (
  user_id      uuid        primary key references public.users(id) on delete cascade,
  pin_hash     text        not null,
  pin_salt     text        not null,
  updated_at   timestamptz not null default now()
);

drop trigger if exists compliance_pins_touch on public.compliance_pins;
create trigger compliance_pins_touch
  before update on public.compliance_pins
  for each row execute function public.touch_updated_at();

-- Seed a demo PIN of "123456" for the compliance user.
-- Hash = sha256(pin || salt). Salt is per-row so re-running is safe.
-- Real production should use bcrypt/argon2 + per-user enrolment.
do $$
declare
  v_salt text := 'demo-salt-do-not-use-in-prod';
  v_hash text;
begin
  v_hash := encode(digest('123456' || v_salt, 'sha256'), 'hex');
  insert into public.compliance_pins (user_id, pin_hash, pin_salt)
  values ('00000000-0000-0000-0000-000000000002', v_hash, v_salt)
  on conflict (user_id) do nothing;
end $$;

-- ---------------------------------------------------------------------------
-- form_processing_audit_logs — append-only audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.form_processing_audit_logs (
  id             uuid        primary key default uuid_generate_v4(),
  submission_id  uuid        references public.submissions(id) on delete cascade,
  user_id        uuid        references public.users(id) on delete set null,
  user_role      text,
  action         text        not null,
  before_value   jsonb,
  after_value    jsonb,
  ip_address     text,
  user_agent     text,
  created_at     timestamptz not null default now()
);

create index if not exists fp_audit_submission_idx on public.form_processing_audit_logs(submission_id);
create index if not exists fp_audit_created_idx    on public.form_processing_audit_logs(created_at desc);
create index if not exists fp_audit_action_idx     on public.form_processing_audit_logs(action);

-- Append-only guard.
drop trigger if exists fp_audit_no_update on public.form_processing_audit_logs;
create trigger fp_audit_no_update
  before update on public.form_processing_audit_logs
  for each row execute function public.audit_logs_immutable();

drop trigger if exists fp_audit_no_delete on public.form_processing_audit_logs;
create trigger fp_audit_no_delete
  before delete on public.form_processing_audit_logs
  for each row execute function public.audit_logs_immutable();

-- ---------------------------------------------------------------------------
-- Storage bucket for NAAF files. Public-read for the in-app preview iframe;
-- file paths use unguessable UUIDs.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('form-processing', 'form-processing', true)
on conflict (id) do update set public = excluded.public;
