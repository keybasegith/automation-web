-- ===========================================================================
-- Migration 010 — Keybase confidentiality footer
--
-- Sets the mandatory_footer on the singleton compliance_settings row to the
-- firm's standard Keybase e-mail confidentiality / privilege notice.
--
-- Idempotent: re-running this migration only overwrites the footer when it
-- is currently empty OR set to one of the legacy disclaimer variants. If
-- compliance has manually changed the footer after this migration runs,
-- this migration will leave their text alone.
--
-- Run this AFTER 002-compliance-settings.sql.
-- ===========================================================================

update public.compliance_settings
set
  mandatory_footer = 'The information in this Keybase e-mail is confidential and may be privileged. Any use or disclosure of this e-mail by anyone other than the intended recipient is unauthorized. If you are not the intended recipient, please delete this e-mail and notify us by reply e-mail.',
  updated_at = now()
where is_singleton = true
  and (
    coalesce(trim(mandatory_footer), '') = ''
    or mandatory_footer ilike '%past performance does not guarantee%'
    or mandatory_footer ilike '%informational purposes only%'
  );
