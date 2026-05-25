-- ===========================================================================
-- 011 — Department mailboxes
--
-- Adds a per-department message store used by the in-app mailbox UI.
-- This table is the canonical record when the system is acting as the email
-- platform (mock provider). When a real external email provider is wired in,
-- rows here become audit records — the body may be omitted and
-- `provider_message_id` points to the upstream system.
-- ===========================================================================

create table if not exists public.department_messages (
  id                  uuid        primary key default uuid_generate_v4(),
  department          text        not null,
  direction           text        not null check (direction in ('inbound', 'outbound')),
  from_address        text        not null,
  to_addresses        text[]      not null,
  cc_addresses        text[]      not null default '{}',
  subject             text        not null,
  body                text        not null default '',
  provider            text        not null default 'mock',
  provider_message_id text,
  status              text        not null default 'received'
                                  check (status in ('draft','sending','sent','failed','received')),
  sent_at             timestamptz,
  received_at         timestamptz,
  created_by          uuid        references public.users(id) on delete set null,
  metadata            jsonb       not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists department_messages_dept_created_idx
  on public.department_messages(department, created_at desc);
create index if not exists department_messages_dept_direction_idx
  on public.department_messages(department, direction, created_at desc);
create index if not exists department_messages_provider_msg_idx
  on public.department_messages(provider, provider_message_id);

-- ---------------------------------------------------------------------------
-- Seed: a couple of inbound messages per department so the UI demos.
-- Safe to re-run: ON CONFLICT against the unique provider_message_id.
-- ---------------------------------------------------------------------------
create unique index if not exists department_messages_seed_unique
  on public.department_messages(provider, provider_message_id)
  where provider_message_id is not null;

insert into public.department_messages (
  department, direction, from_address, to_addresses, subject, body,
  provider, provider_message_id, status, received_at
) values
  -- Finance
  ('finance','inbound','statements@sage.com','{finance@keybase.com}',
   'Monthly statement ready', 'Your May statement is available for download.',
   'mock','seed-finance-001','received', now() - interval '2 hours'),
  ('finance','inbound','accounts@stripe.com','{finance@keybase.com}',
   'Payout summary — May 2026','Total payouts: $42,318.22 across 18 transfers.',
   'mock','seed-finance-002','received', now() - interval '1 day'),
  -- Business Processing
  ('business-processing','inbound','intake@partner.com','{bp@keybase.com}',
   'New package ready for review','Package #4821 has all signatures and is queued.',
   'mock','seed-bp-001','received', now() - interval '30 minutes'),
  ('business-processing','inbound','noreply@docusign.com','{bp@keybase.com}',
   'Envelope completed','All recipients have signed envelope KFG-2026-0419.',
   'mock','seed-bp-002','received', now() - interval '5 hours'),
  -- Compliance
  ('compliance','inbound','regulator@osfi.gc.ca','{compliance@keybase.com}',
   'Q2 attestation reminder','Quarterly attestation forms are due 2026-06-15.',
   'mock','seed-compliance-001','received', now() - interval '3 hours'),
  ('compliance','inbound','alerts@keybase.com','{compliance@keybase.com}',
   'Prohibited phrase detected','Draft 8a3c flagged for high-severity phrase.',
   'mock','seed-compliance-002','received', now() - interval '12 hours'),
  -- Sales
  ('sales','inbound','sarah.chen@example.com','{sales@keybase.com}',
   'Re: Portfolio review','Thanks for the update — happy to schedule a call next week.',
   'mock','seed-sales-001','received', now() - interval '1 hour'),
  ('sales','inbound','james.patel@example.com','{sales@keybase.com}',
   'Question about fees','Could you clarify the management fee on my growth account?',
   'mock','seed-sales-002','received', now() - interval '6 hours'),
  -- IT
  ('it','inbound','alerts@datadog.com','{it@keybase.com}',
   '[P3] Latency above threshold','/api/email/send p95 = 1.4s for last 15 min.',
   'mock','seed-it-001','received', now() - interval '45 minutes'),
  ('it','inbound','noreply@github.com','{it@keybase.com}',
   'Dependabot — 2 vulnerabilities','2 high-severity vulnerabilities in keybase-automation-web.',
   'mock','seed-it-002','received', now() - interval '2 days'),
  -- Insurance Sales
  ('insurance-sales','inbound','carrier@manulife.com','{insurance@keybase.com}',
   'Application APP-77231 approved','Coverage starts on the requested effective date.',
   'mock','seed-ins-001','received', now() - interval '4 hours'),
  ('insurance-sales','inbound','emma.thompson@example.com','{insurance@keybase.com}',
   'Re: Beneficiary update','Please find the updated beneficiary form attached.',
   'mock','seed-ins-002','received', now() - interval '20 hours'),
  -- Marketing
  ('marketing','inbound','noreply@mailchimp.com','{marketing@keybase.com}',
   'May newsletter — engagement report','Open rate 38.4%, click rate 9.1% (n=1,204).',
   'mock','seed-mkt-001','received', now() - interval '2 hours'),
  ('marketing','inbound','events@bloomberg.com','{marketing@keybase.com}',
   'Speaker confirmation','Your panel slot is confirmed for the June summit.',
   'mock','seed-mkt-002','received', now() - interval '1 day'),
  -- Senior Management
  ('senior-management','inbound','board@keybase.com','{exec@keybase.com}',
   'Q2 board pack draft','Attached is the draft pack for next Thursday''s meeting.',
   'mock','seed-sm-001','received', now() - interval '8 hours'),
  ('senior-management','inbound','legal@keybase.com','{exec@keybase.com}',
   'Updated compliance policy v3.2','Please review and sign off by EOW.',
   'mock','seed-sm-002','received', now() - interval '1 day')
on conflict do nothing;
