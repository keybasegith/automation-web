-- ===========================================================================
-- 014 — Client Risk Questionnaire submissions (form v2-crq25)
--
-- Backs the digital questionnaire at /client-risk-questionnaire.
--
-- Compliance notes:
--   * Rows are append-only in practice — a re-assessment is a NEW row, so the
--     history of a client's risk ranking stays intact. There is deliberately
--     no unique constraint to upsert against.
--   * `answers` stores the selected option id alongside its point value, so a
--     stored ranking can be re-derived and audited against the source form.
--   * Every score column is written from the API route's own recalculation,
--     never from the browser. `metadata.clientTotalsDisagree` flags a
--     submission whose client-side totals did not match.
--   * `risk_capacity_level` / `risk_tolerance_level` are nullable on purpose:
--     the printed threshold table assigns no level to a score of exactly 12
--     (see lib/risk-questionnaire/config.ts). Such a row carries a
--     `review_notice` instead of an invented level.
-- ===========================================================================

create table if not exists public.client_risk_questionnaires (
  id                           uuid        primary key default uuid_generate_v4(),
  form_version                 text        not null default 'v2-crq25',

  account_holder_name          text        not null,
  client_id                    text,

  -- Unscored context questions. Captured for the advisor, never for scoring.
  portfolio_priorities         jsonb       not null default '{}'::jsonb,
  investment_check_frequency   text        check (
    investment_check_frequency is null
    or investment_check_frequency in ('weekly', 'monthly', 'quarterly', 'annually')
  ),

  -- { "q1": { "optionId": "q1_a", "points": 10 }, … } for all twelve.
  answers                      jsonb       not null,

  risk_capacity_score          integer     not null,
  risk_capacity_level          text,
  risk_tolerance_score         integer     not null,
  risk_tolerance_level         text,
  final_risk_ranking           text,
  review_notice                text,

  notes                        text,

  acknowledgement_type         text        not null check (
    acknowledgement_type in ('all_accounts', 'single_account')
  ),
  acknowledgement_account_name text,

  account_holder_signature     text        not null,
  account_holder_date          text        not null,

  -- The advisor countersigns after the client completes their portion.
  advisor_name                 text,
  advisor_signature            text,
  advisor_date                 text,

  completed_at                 timestamptz not null default now(),
  metadata                     jsonb       not null default '{}'::jsonb,
  created_at                   timestamptz not null default now()
);

-- Option 2 of the acknowledgement is meaningless without the account it names.
alter table public.client_risk_questionnaires
  drop constraint if exists client_risk_questionnaires_single_account_named;
alter table public.client_risk_questionnaires
  add constraint client_risk_questionnaires_single_account_named check (
    acknowledgement_type <> 'single_account'
    or (acknowledgement_account_name is not null
        and length(btrim(acknowledgement_account_name)) > 0)
  );

create index if not exists client_risk_questionnaires_client_idx
  on public.client_risk_questionnaires(client_id, completed_at desc);
create index if not exists client_risk_questionnaires_completed_idx
  on public.client_risk_questionnaires(completed_at desc);
create index if not exists client_risk_questionnaires_ranking_idx
  on public.client_risk_questionnaires(final_risk_ranking);
