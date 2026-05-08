-- ===========================================================================
-- Migration 008 — Secure Email client_id link
--
-- Run after 007-secure-email-template-categories.sql. Idempotent.
--
-- Adds the `client_id` foreign key so each draft is linked to the looked-up
-- client. The column is nullable so that legacy rows from before this change
-- (and any drafts created when the auth/client table is unavailable) still
-- satisfy the schema.
--
-- Privacy note: linking a draft to a client_id is what lets the audit trail
-- prove that "the AI never saw this name" — the draft's `generated_draft`
-- column holds the placeholder version, while `final_body` holds the
-- substituted version derived server-side from the linked client record.
-- ===========================================================================

alter table public.secure_email_drafts
  add column if not exists client_id uuid
    references public.clients(id) on delete set null;

create index if not exists secure_email_drafts_client_idx
  on public.secure_email_drafts(client_id);
