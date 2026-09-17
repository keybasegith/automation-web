-- Advisor Content CMS + Compliance approval schema.
-- Idempotent: safe to run repeatedly. Applied by scripts/migrate-content-schema.mjs
-- (npm run content:migrate) against DATABASE_URL, alongside cms-schema.sql.
--
-- DESIGN NOTE — approval belongs to a revision, never to an article.
-- There is no `approved` boolean anywhere in here. An approval is a row in
-- content_reviews keyed by revision_id, and content_articles.published_revision_id
-- names one specific revision. Editing an article creates a NEW revision, which
-- has no review row of its own and therefore cannot inherit approval.

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
create table if not exists content_users (
  id            uuid primary key,
  email         text not null unique,
  name          text not null,
  role          text not null check (role in ('advisor', 'compliance', 'admin')),
  -- scrypt, as "scrypt$N$r$p$<salt-b64>$<hash-b64>". Never a plaintext password.
  password_hash text not null,
  -- Optional link into the people registry (lib/people). When set, the public
  -- byline resolves from that one person record instead of a stored copy.
  person_id     text,
  -- Byline title for an author who is not in the people registry yet.
  author_title  text not null default '',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Articles — stable identity and pointers. Content lives in revisions.
-- ---------------------------------------------------------------------------
create table if not exists content_articles (
  id           uuid primary key,
  -- The public URL segment. Stable once published: renaming the article does
  -- not move a live page (see lib/content/service.ts).
  slug         text not null unique,
  content_type text not null check (
                 content_type in ('market-perspective', 'advisor-perspective',
                                  'financial-education', 'company-news')),
  status       text not null check (
                 status in ('draft', 'submitted', 'under_review',
                            'changes_requested', 'approved', 'scheduled',
                            'published', 'rejected', 'archived')),
  owner_id     uuid not null references content_users (id),

  -- The revision an author is currently working on. Mutable while its state
  -- is 'draft'; frozen the moment it is submitted.
  current_draft_revision_id uuid,
  -- The revision compliance is reviewing right now, if any.
  submitted_revision_id     uuid,
  -- The revision the public site renders. Changed ONLY by an explicit publish
  -- of a revision that has an approval row of its own.
  published_revision_id     uuid,

  published_at  timestamptz,
  scheduled_for timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists content_articles_owner on content_articles (owner_id, updated_at desc);
create index if not exists content_articles_status on content_articles (status, updated_at desc);
create index if not exists content_articles_published on content_articles (published_at desc)
  where published_revision_id is not null;

-- ---------------------------------------------------------------------------
-- Revisions — the content snapshots.
-- ---------------------------------------------------------------------------
create table if not exists content_revisions (
  id              uuid primary key,
  article_id      uuid not null references content_articles (id) on delete cascade,
  revision_number int  not null,
  state           text not null check (
                    state in ('draft', 'submitted', 'changes_requested',
                              'approved', 'rejected', 'superseded')),
  -- The authored article, in the shape lib/insights renders (ArticlePayload).
  payload         jsonb not null,
  created_by      uuid not null references content_users (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Set on submission. Non-null means the content can never change again.
  frozen_at       timestamptz,
  unique (article_id, revision_number)
);

create index if not exists content_revisions_article
  on content_revisions (article_id, revision_number desc);

-- ---------------------------------------------------------------------------
-- Compliance decisions — append-only. An 'approved' row IS the approval record.
-- ---------------------------------------------------------------------------
create table if not exists content_reviews (
  id          uuid primary key,
  article_id  uuid not null references content_articles (id) on delete cascade,
  revision_id uuid not null references content_revisions (id) on delete cascade,
  reviewer_id uuid not null references content_users (id),
  decision    text not null check (
                decision in ('changes_requested', 'rejected', 'approved')),
  comment     text not null default '',
  -- The reviewer's checklist ticks. A review aid the reviewer filled in — never
  -- a determination the system made on its own.
  checklist   jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists content_reviews_revision on content_reviews (revision_id, created_at desc);
create index if not exists content_reviews_article  on content_reviews (article_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Audit trail — append-only, and outlives the article it describes.
-- No foreign keys on purpose: deleting an article must not erase the record of
-- who approved what. Actor and article are stored as ids plus a text label so
-- the trail stays readable after a user is deactivated.
-- ---------------------------------------------------------------------------
create table if not exists content_audit (
  id          uuid primary key,
  article_id  uuid,
  revision_id uuid,
  actor_id    uuid,
  actor_label text not null,
  action      text not null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists content_audit_article on content_audit (article_id, created_at desc);
create index if not exists content_audit_recent  on content_audit (created_at desc);

-- ---------------------------------------------------------------------------
-- Referential integrity for the article → revision pointers.
--
-- Added after both tables exist because the reference is circular (an article
-- points at its revisions; a revision points back at its article). Wrapped in
-- DO blocks because Postgres has no `add constraint if not exists`.
--
-- A dangling published_revision_id would 404 a live article, so these are worth
-- having rather than trusting the service layer alone.
-- ---------------------------------------------------------------------------
do $$
declare
  c text;
begin
  foreach c in array array[
    'current_draft_revision_id',
    'submitted_revision_id',
    'published_revision_id'
  ] loop
    if not exists (
      select 1 from pg_constraint
       where conname = 'content_articles_' || c || '_fkey'
    ) then
      execute format(
        'alter table content_articles
           add constraint %I foreign key (%I)
           references content_revisions (id) on delete set null',
        'content_articles_' || c || '_fkey', c
      );
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Revision immutability, enforced by the database.
--
-- The single most important rule in this schema: once a revision is submitted
-- for compliance review it is frozen, and the exact bytes a reviewer approved
-- can never be edited underneath them. `state` may still advance (submitted →
-- approved → superseded); the content may not.
-- ---------------------------------------------------------------------------
create or replace function content_revision_frozen() returns trigger as $$
begin
  if old.frozen_at is not null and (
       new.payload         is distinct from old.payload
    or new.revision_number is distinct from old.revision_number
    or new.article_id      is distinct from old.article_id
    or new.created_by      is distinct from old.created_by
    or new.frozen_at       is distinct from old.frozen_at
  ) then
    raise exception
      'Revision % was frozen at % and its content cannot be changed.',
      old.id, old.frozen_at;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists content_revisions_frozen_guard on content_revisions;
create trigger content_revisions_frozen_guard
  before update on content_revisions
  for each row execute function content_revision_frozen();

-- ---------------------------------------------------------------------------
-- The audit trail is append-only at the database level. No application bug and
-- no signed-in user can rewrite the record of who approved what and when.
-- ---------------------------------------------------------------------------
create or replace function content_audit_append_only() returns trigger as $$
begin
  raise exception 'content_audit is append-only; entries cannot be % .', lower(tg_op);
end;
$$ language plpgsql;

drop trigger if exists content_audit_guard on content_audit;
create trigger content_audit_guard
  before update or delete on content_audit
  for each row execute function content_audit_append_only();

-- Compliance decisions are a matter of record too: a reviewer's comment or
-- verdict cannot be rewritten after the fact. A changed mind is a new row.
--
-- UPDATE only, deliberately. Deletes still cascade from content_articles, so an
-- article can be removed outright if it ever has to be; content_audit carries no
-- foreign key and survives that, which is what makes it the permanent record.
create or replace function content_reviews_no_update() returns trigger as $$
begin
  raise exception 'content_reviews is append-only; record a new decision instead.';
end;
$$ language plpgsql;

drop trigger if exists content_reviews_guard on content_reviews;
create trigger content_reviews_guard
  before update on content_reviews
  for each row execute function content_reviews_no_update();
