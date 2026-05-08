-- ===========================================================================
-- Migration 004 — Secure Email Drafts
--
-- Run in Supabase SQL Editor after 003-onboarding.sql.
-- Idempotent: re-running is safe.
--
-- Stores AI-polished email drafts. By design we do NOT store the raw OpenAI
-- request, the unredacted advisor notes, or any client identifiers — only
-- abstracted structured context plus the rendered draft.
-- ===========================================================================

create table if not exists public.secure_email_drafts (
  id                  uuid        primary key default uuid_generate_v4(),
  advisor_id          uuid        references public.users(id) on delete set null,
  email_purpose       text        not null check (email_purpose in (
                                    'portfolio_review_reminder',
                                    'document_request',
                                    'kyc_update_reminder',
                                    'meeting_follow_up',
                                    'general_check_in',
                                    'idle_cash_review',
                                    'annual_review_invitation'
                                  )),
  client_segment      text,
  client_stage        text,
  tone                text,
  urgency             text,
  sanitized_context   jsonb       not null default '{}'::jsonb,
  generated_draft     text        not null,
  template_name       text        not null,
  risk_flags          jsonb       not null default '[]'::jsonb,
  status              text        not null default 'advisor_review_required'
                                  check (status in (
                                    'draft_generated',
                                    'advisor_review_required',
                                    'reviewed',
                                    'copied',
                                    'archived'
                                  )),
  created_at          timestamptz not null default now(),
  reviewed_at         timestamptz
);

create index if not exists secure_email_drafts_advisor_idx
  on public.secure_email_drafts(advisor_id);
create index if not exists secure_email_drafts_status_idx
  on public.secure_email_drafts(status);
create index if not exists secure_email_drafts_created_idx
  on public.secure_email_drafts(created_at desc);
