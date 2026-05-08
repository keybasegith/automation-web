-- ===========================================================================
-- Migration 005 — Secure Email "approve & send"
--
-- Run after 004-secure-email-drafts.sql. Idempotent.
--
-- Adds:
--   * `sent` status (advisor approved + sent to client)
--   * final_subject / final_body — what the advisor actually approved
--     (the original AI draft stays in generated_draft for audit)
--   * recipient_email + sent_at — needed to actually deliver and to audit who
--     received what.
-- ===========================================================================

alter table public.secure_email_drafts
  add column if not exists final_subject  text;

alter table public.secure_email_drafts
  add column if not exists final_body     text;

alter table public.secure_email_drafts
  add column if not exists recipient_email text;

alter table public.secure_email_drafts
  add column if not exists sent_at        timestamptz;

-- Replace the status check to include the new 'sent' value.
alter table public.secure_email_drafts
  drop constraint if exists secure_email_drafts_status_check;

alter table public.secure_email_drafts
  add constraint secure_email_drafts_status_check
  check (status in (
    'draft_generated',
    'advisor_review_required',
    'reviewed',
    'copied',
    'archived',
    'sent'
  ));
