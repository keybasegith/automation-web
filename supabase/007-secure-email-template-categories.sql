-- ===========================================================================
-- Migration 007 — Secure Email approved template categories
--
-- Run after 005-secure-email-send.sql. Idempotent.
--
-- Replaces the v1 set of seven email purposes with the sixteen approved
-- client-facing templates, organized into five categories. The "Approval
-- Required Before Sending" internal-review template is intentionally not in
-- this list — it is handled by the existing advisor_review_required workflow.
--
-- Existing rows that reference the old purpose values are preserved for audit
-- history. The new constraint is added with NOT VALID so legacy rows stay
-- intact while every new insert must use one of the approved values below.
-- ===========================================================================

alter table public.secure_email_drafts
  drop constraint if exists secure_email_drafts_email_purpose_check;

alter table public.secure_email_drafts
  add constraint secure_email_drafts_email_purpose_check
  check (email_purpose in (
    -- Relationship Management
    'general_client_check_in',
    'personal_milestone_greeting',
    'educational_update',
    -- Meetings
    'meeting_scheduling',
    'meeting_follow_up',
    'appointment_reminder',
    'annual_review_reminder',
    -- Onboarding
    'new_client_onboarding',
    'account_opening_follow_up',
    'confirmation_needed',
    -- Documents and Forms
    'document_reminder',
    'signature_reminder',
    'client_profile_update',
    'client_information_update',
    -- Support
    'client_portal_assistance',
    'client_service_follow_up'
  ))
  not valid;
