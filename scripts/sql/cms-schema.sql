-- Website CMS storage schema (approved 2026-07-22, docs/website-cms-spec.md 1-A).
-- Idempotent: safe to run repeatedly. Applied by scripts/migrate-cms-to-postgres.mjs.

create table if not exists cms_documents (
  resource         text not null,
  doc_id           text not null default 'default',
  draft            jsonb not null,
  published        jsonb,
  draft_updated_at timestamptz not null,
  draft_updated_by text not null,
  published_at     timestamptz,
  published_by     text,
  updated_at       timestamptz not null default now(),
  primary key (resource, doc_id)
);

create table if not exists cms_versions (
  id                   uuid primary key,
  resource             text not null,
  doc_id               text not null default 'default',
  version_number       int  not null,
  snapshot             jsonb not null,
  change_summary       text not null default '',
  is_published_version boolean not null default true,
  created_by           text not null,
  created_at           timestamptz not null
);
create index if not exists cms_versions_lookup
  on cms_versions (resource, doc_id, created_at desc);

create table if not exists cms_media (
  id          uuid primary key,
  file_key    text not null unique,  -- object-storage key (Phase 1-D)
  file_name   text not null,
  file_type   text not null,
  file_size   bigint not null,
  alt_text    text not null default '',
  uploaded_by text not null,
  uploaded_at timestamptz not null default now()
);

create table if not exists cms_audit (
  id          uuid primary key,
  user_id     text not null,
  action      text not null,
  resource    text not null,
  description text not null,
  created_at  timestamptz not null default now()
);
create index if not exists cms_audit_recent on cms_audit (created_at desc);
