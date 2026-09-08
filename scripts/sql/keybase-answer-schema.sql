-- Keybase Answer storage schema.
-- Idempotent: safe to run repeatedly. Applied by scripts/migrate-keybase-answer.mjs
-- (npm run keybase-answer:migrate) and, so that indexing is one command, by the
-- indexer itself before it writes.
--
-- DESIGN NOTE — why embeddings are jsonb rather than a pgvector column.
-- This deployment's Postgres does not offer the `vector` extension
-- (pg_available_extensions has no row for it), so an ivfflat index is not on
-- the table. The corpus is a company website — tens of documents, hundreds of
-- chunks — and cosine similarity over a few hundred short vectors in Node
-- costs well under a millisecond, so nothing is lost by scoring in process.
-- Keyword retrieval, which is the half that actually needs an index at this
-- size, is a real GIN index on a generated tsvector below.
--
-- Moving to pgvector later changes this file and lib/keybase-answer/index-store.ts
-- and nothing else: retrieval, ranking, the API, and the UI never see a vector.

-- ---------------------------------------------------------------------------
-- Approved public documents
-- ---------------------------------------------------------------------------
create table if not exists ka_documents (
  id            text primary key,
  title         text not null,
  slug          text not null,
  canonical_url text not null,
  category      text not null default '',
  content_type  text not null,
  published_at  timestamptz,
  updated_at    timestamptz,
  excerpt       text not null default '',
  body          text not null default '',
  -- Content hash. An unchanged document is not re-embedded on the next run.
  checksum      text not null,
  index_version text not null,
  indexed_at    timestamptz not null default now()
);

create index if not exists ka_documents_version on ka_documents (index_version);
create index if not exists ka_documents_type on ka_documents (content_type);

-- ---------------------------------------------------------------------------
-- Retrievable chunks
-- ---------------------------------------------------------------------------
create table if not exists ka_chunks (
  id              text primary key,
  document_id     text not null references ka_documents (id) on delete cascade,
  chunk_index     int not null,
  heading         text not null default '',
  text            text not null,
  -- One JSON array of floats. Read back and scored in process; see the note above.
  embedding       jsonb,
  embedding_model text not null default '',
  metadata        jsonb not null default '{}'::jsonb,
  index_version   text not null,
  search          tsvector generated always as (to_tsvector('english', text)) stored
);

create index if not exists ka_chunks_document on ka_chunks (document_id);
create index if not exists ka_chunks_version on ka_chunks (index_version);
create index if not exists ka_chunks_search on ka_chunks using gin (search);

-- ---------------------------------------------------------------------------
-- Index metadata — one row. `index_version` is a cache-key ingredient, so
-- publishing new content expires every answer that was generated from the old
-- corpus without anybody having to remember to clear a cache.
-- ---------------------------------------------------------------------------
create table if not exists ka_index_meta (
  id              text primary key default 'default',
  index_version   text not null,
  embedding_model text not null,
  document_count  int not null default 0,
  chunk_count     int not null default 0,
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Generated answers
-- ---------------------------------------------------------------------------
create table if not exists ka_answer_cache (
  cache_key            text primary key,
  normalized_question  text not null,
  question             text not null,
  payload              jsonb not null,
  source_ids           text[] not null default '{}',
  content_index_version text not null,
  prompt_version       text not null,
  model                text not null,
  hit_count            int not null default 0,
  created_at           timestamptz not null default now(),
  expires_at           timestamptz not null
);

create index if not exists ka_answer_cache_expiry on ka_answer_cache (expires_at);
create index if not exists ka_answer_cache_version
  on ka_answer_cache (content_index_version);

-- ---------------------------------------------------------------------------
-- Rate limiting — a fixed window per hashed caller. The raw IP is never stored.
-- ---------------------------------------------------------------------------
create table if not exists ka_rate_limit (
  bucket       text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (bucket, window_start)
);

create index if not exists ka_rate_limit_window on ka_rate_limit (window_start);

-- ---------------------------------------------------------------------------
-- Operational analytics. Deliberately holds no question text and no personal
-- data — only what the feature did, how long it took, and how it ended.
-- ---------------------------------------------------------------------------
create table if not exists ka_events (
  id         uuid primary key,
  name       text not null,
  request_id text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ka_events_name on ka_events (name, created_at desc);

create table if not exists ka_feedback (
  id            uuid primary key,
  response_id   text not null,
  question_hash text not null,
  helpful       boolean not null,
  model         text not null default '',
  source_ids    text[] not null default '{}',
  created_at    timestamptz not null default now()
);

create index if not exists ka_feedback_response on ka_feedback (response_id);
