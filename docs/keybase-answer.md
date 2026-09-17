# Keybase Answer

AI-powered financial insights, answered only from Keybase Financial Group's
published content.

A visitor asks a financial question. The system retrieves the Keybase material
that bears on it, decides whether that material is enough, and — only if it is —
asks a model to synthesize an answer from those sources and nothing else. Every
citation is checked against what retrieval actually supplied before it becomes a
link. If Keybase has not published on the subject, the answer is that Keybase
has not published on the subject.

- Homepage module: `components/keybase-answer/KeybaseAnswerHomeSection.tsx`
- Product page: `/keybase-answer`
- API: `POST /api/keybase-answer`

---

## Contents

1. [The one idea that matters](#the-one-idea-that-matters)
2. [Architecture](#architecture)
3. [OpenAI setup](#openai-setup)
4. [Retrieval](#retrieval)
5. [Embeddings](#embeddings)
6. [Indexing](#indexing)
7. [Approved content](#approved-content)
8. [Suggested questions](#suggested-questions)
9. [Caching and invalidation](#caching-and-invalidation)
10. [Citations](#citations)
11. [The typewriter](#the-typewriter)
12. [Financial guardrails](#financial-guardrails)
13. [Rate limiting](#rate-limiting)
14. [Analytics and feedback](#analytics-and-feedback)
15. [Environment variables](#environment-variables)
16. [Commands](#commands)
17. [Local development](#local-development)
18. [Deployment checklist](#deployment-checklist)
19. [Troubleshooting](#troubleshooting)
20. [Known gaps](#known-gaps)

---

## The one idea that matters

**The model is never asked a question the retrieved sources cannot answer.**

There is no prompt wording that reliably prevents a language model from filling
a gap out of memory. So the gap is closed structurally instead: three paths
return before any model call is made.

| Situation | What happens | Where |
|---|---|---|
| Nothing financial in the question | Redirect, with example prompts | `classify-question.ts` → `answer-service.ts` |
| Keybase has published nothing relevant | "We couldn't find enough information…" | `evidence.ts` |
| "Latest…" asked, nothing recent indexed | "…doesn't currently have sufficiently recent material" | `evidence.ts` |

A fourth stop sits after generation: the model can still report
`insufficientEvidence`, and its judgement wins over the retrieval scores,
because it has read the passages and the scores have not.

---

## Architecture

```
question
  │
  ├─ validateQuestion            guardrails.ts        shape, length, sensitive data
  ├─ consumeRateLimit            rate-limit.ts        hourly window per hashed caller
  ├─ classifyQuestion            classify-question.ts deterministic; no model call
  ├─ out of scope? ──────────────────────────────────► redirect, no model call
  ├─ buildCacheKey / read        cache.ts             question + corpus + prompt + models
  ├─ cache hit? ─────────────────────────────────────► return
  │
  ├─ retrieveKeybaseSources      retrieval.ts         hybrid: semantic ∪ keyword
  │   ├─ embedQuery              embeddings.ts
  │   ├─ allChunks               index-store.ts       cached in process, keyed on index version
  │   ├─ keywordCandidates       index-store.ts       Postgres tsvector
  │   ├─ rankChunks              ranking.ts           semantic · keyword · freshness · authority
  │   └─ groupIntoSources        ranking.ts           one source per document, opaque SRC_00n ids
  │
  ├─ evaluateEvidence            evidence.ts
  ├─ insufficient? ──────────────────────────────────► honest empty state, no model call
  │
  ├─ buildGroundedPrompt         prompt.ts            sources rendered WITHOUT urls
  ├─ generateFinancialAnswer     openai.ts            Responses API, Structured Outputs, streamed
  ├─ parseGeneratedAnswer        schemas.ts           re-validate the payload
  ├─ validateCitations           citation-validator.ts drop unsupported ids, attach real metadata
  ├─ writeCachedAnswer           cache.ts
  └─ trackEvent                  analytics.ts
```

### Module map

| File | Responsibility |
|---|---|
| `config.ts` | **Every** environment variable. Model names appear here and nowhere else. |
| `types.ts` | The domain model everything speaks. |
| `errors.ts` | `KeybaseAnswerError` — the only error crossing a module boundary. |
| `normalize-question.ts` | Display form vs. cache-key form, kept apart. |
| `classify-question.ts` | Topic, freshness intent, advice request, injection attempt. |
| `guardrails.ts` | Request validation, redaction, bounded-response copy. |
| `content-loader.ts` | **The approval boundary.** What may be indexed. |
| `chunking.ts` | Semantic chunking with paragraph overlap. |
| `html-extract.ts` | Rendered page → sections, minus site chrome. |
| `embeddings.ts` | Vectors, cosine, and the deterministic development stand-in. |
| `index-store.ts` | **The swappable backend.** Postgres and memory implementations. |
| `retrieval.ts` | The abstraction everything above it uses. |
| `ranking.ts` | The four-signal blend. |
| `evidence.ts` | Is there enough here to answer? |
| `prompt.ts` | System instruction and grounded prompt. `PROMPT_VERSION`. |
| `schemas.ts` | JSON Schema for Structured Outputs + runtime re-validation. |
| `openai.ts` | The provider. The only file importing the SDK's `responses` API. |
| `openai-client.ts` | The only file reading `OPENAI_API_KEY`. |
| `mock.ts` | Development provider. Never reachable in production. |
| `citation-validator.ts` | The security boundary between an answer and a link. |
| `cache.ts` | Answer cache and its key. |
| `rate-limit.ts` | Hourly fixed window per hashed caller. |
| `analytics.ts` | Events and feedback. Server-side. |
| `client-analytics.ts` | Browser events. No server imports. |
| `answer-service.ts` | The pipeline, in order. |
| `typing.ts` | Typewriter pacing, and where a partly-written string may be cut. |
| `copy.ts` | Every word the feature puts on screen. |
| `db.ts` | Pool, `ensureSchema` (command-line only), `isMissingRelation`. |

---

## OpenAI setup

1. Put a key in `.env.local`:
   ```
   OPENAI_API_KEY=sk-...
   ```
   It is read in `lib/keybase-answer/openai-client.ts` and nowhere else. No
   client component imports anything on that path, and the API route is the only
   boundary a browser can reach.

2. The generation model comes from `KEYBASE_ANSWER_MODEL`, default
   `gpt-5.6-terra`. Changing it is an environment change — the string does not
   appear anywhere else in the codebase.

Two deliberate choices in `openai.ts`:

- **Responses API, streamed for progress.** The stream is consumed so
  "Preparing your answer…" appears when generation actually begins, not before.
  What the browser receives are stage frames and then one validated result — see
  [The typewriter](#the-typewriter) for why the model's raw tokens are not piped
  through to the page.
- **`tools: []`.** No web search, no file search, no tool of any kind. The
  supplied sources are the entire world the model may draw on. Enabling web
  search would mean Keybase Answer no longer represents Keybase's published
  thinking.

`store: false` is set, so prompts and completions are not retained by the
provider.

---

## Retrieval

`retrieveKeybaseSources({ query, limit, categories, freshnessIntent })` is the
only thing the pipeline knows about the knowledge base. Nothing above it has
ever seen a chunk.

**The hybrid is a union, not a re-rank of one list.** Semantic search proposes
the passages that *mean* the same thing; keyword search proposes the ones that
*say* the same words; everything either proposed is then scored on one scale. A
question containing "Bank of Canada" therefore cannot lose the Bank of Canada
article merely because forty other passages embedded a little closer.

### Ranking

| Signal | Default weight | "Latest…" weight | Why |
|---|---|---|---|
| semantic | 0.56 | 0.44 | Meaning leads. |
| keyword | 0.24 | 0.20 | Financial questions turn on exact phrases: *TFSA*, *policy rate*, *CPI*. |
| freshness | 0.12 | **0.28** | Recency is a component, not a filter. |
| authority | 0.08 | 0.08 | A published article outranks a service page's marketing copy. |

Freshness is *reweighted*, not merely added, when the question asks about the
current position. Without that, a two-year-old commentary with slightly better
wording overlap outranks this month's — which for rate and inflation questions
is not a small error.

Undated evergreen material (a service page) scores 0.5 on freshness, not 0: it
is not stale, it is simply not news.

### Evidence threshold

```
KEYBASE_ANSWER_MIN_RELEVANCE=0.34          floor to count as evidence at all
KEYBASE_ANSWER_STRONG_RELEVANCE=0.58       one source at or above this is enough alone
KEYBASE_ANSWER_MIN_RELEVANT_SOURCES=2      required below the strong threshold
KEYBASE_ANSWER_FRESHNESS_WINDOW_DAYS=120   how recent "latest" material must be
```

Deliberately **not** a fixed two-source rule. One authoritative Keybase article
that squarely answers a question is better evidence than two that glance off it.

These thresholds are on the *blended* score, not on raw cosine.

### Swapping the backend

`index-store.ts` implements `KnowledgeIndex`. Replacing Postgres with pgvector,
a managed vector store, or a hosted search service is a change confined to that
one file: retrieval, ranking, the API, and the UI never see a vector.

**Why vectors are jsonb rather than a pgvector column.** This deployment's
Postgres does not offer the extension — `pg_available_extensions` has no row for
`vector`. The corpus is a company website (tens of documents, hundreds of
chunks) and cosine over a few hundred short vectors in Node costs well under a
millisecond, so nothing is lost. Keyword retrieval, which is the half that
actually needs an index at this size, uses a real GIN index on a generated
`tsvector`.

---

## Embeddings

`text-embedding-3-small` by default, via `KEYBASE_ANSWER_EMBEDDING_MODEL`.
Moving to `text-embedding-3-large` is an environment change plus a re-index; no
UI or domain code refers to a dimension.

Vectors are produced by the indexer and by **one query per uncached question** —
never per chunk per request. The stored embedding model is recorded alongside
each chunk, so a model change is detected and those documents are re-embedded on
the next index run rather than silently mis-scored.

---

## Indexing

```bash
npm run keybase-answer:migrate                                  # once, or on deploy
npm run keybase-answer:index -- --base-url=http://localhost:3000
npm run keybase-answer:warm
```

```
KEYBASE ANSWER INDEX
------------------------------

Public documents discovered:  21
Approved documents:           21
Documents indexed:            21
Chunks generated:             362
Embeddings generated:         0
Stale chunks removed:         0
Cached answers expired:       0
Skipped:                      0
Errors:                       0
Embedding model:              text-embedding-3-small
Generation model:             gpt-5.6-terra
Index version:                2026-08-31T20:00:28.307Z
```

`Embeddings generated: 0` on a repeat run is correct: documents are checksummed,
and unchanged ones keep their vectors. Re-indexing after publishing one article
costs one article's worth of embeddings, not the whole corpus.

**Pass `--base-url` pointing at a running Keybase site.** Most of Keybase's
financial education (the TFSA, RRSP, RESP, and investment pages) is written as
React components, so the rendered page is the only faithful copy of that prose.
Without the flag, those pages contribute only their one-line CMS summary and
answers about registered accounts will be thin.

Nothing scrapes the site per question. Indexing happens on publish; the answer
path only reads what the indexer wrote.

### Chunking

Documents are cut on their own section boundaries — a heading and the paragraphs
under it — not every N characters. A fixed-width cut routinely severs a
definition from the sentence that qualifies it, and the retrieved half then reads
as a firmer claim than the article makes. That matters more here than in a
general knowledge base, because the halves are about interest rates and
contribution limits.

Consecutive chunks in a long section overlap by one paragraph. Every chunk opens
with its heading, so a passage retrieved alone still says what it is about.

### Re-indexing when content changes

There is no CMS webhook in this repository yet, so re-indexing is a command.
When one is added, it should call the same script. A scheduled job works equally
well:

```
0 5 * * *  cd /srv/keybase && npm run keybase-answer:index -- --base-url=https://<site> && npm run keybase-answer:warm
```

Publishing new content moves the index version, which expires every cached
answer — see [Caching](#caching-and-invalidation).

---

## Approved content

`content-loader.ts` is the approval boundary. Nothing reaches the index unless it
is assembled there, and everything assembled there is already published on the
public website.

**Indexed**

- Published insight articles, via `lib/insights/registry` — the same
  published-revision-only view the public newsroom renders, so a draft, a
  submission under review, and a rejected piece are all invisible here too.
- Website CMS service pages (16), deepened with their rendered copy.
- Company pages with a CMS record (About, CEO Message).
- A short list of other public pages: `/our-advisors`, `/careers`.

**Structurally excluded** — the loader reads only published-content APIs, and
every path is additionally checked against `isIndexablePath`:

`/api` · `/website-admin-cms` · `/admin` · `/dashboard` · `/content` · `/login` ·
`/onboarding` · `/people` · `/profile-*` · `/businesscard-*` · `/net-settlement` ·
`/bp-dailysettlement` · `/discrepancy-detector` · `/financial-statement-generator` ·
`/finance-intelligence` · `/secure-email-generator` · `/smart-document-intake` ·
`/document-intake` · `/trivia-game` · `/world-cup-challenge` · `/mexico-trip` ·
`/sign` · `/testapi` · `/tradeshow-booth-connect-qr` · `/wealth-offering` ·
`/bike-fest` · `/compound-calculator`

So: no client records, no account information, no uploaded files, no internal
finance or employee documents, no CRM, no advisor private files, no compliance
material, no unpublished research, no admin pages, no internal APIs.

### Adding content

Publish it. An article approved through the content workflow, or a service page
edited in the website CMS, is picked up by the next index run — there is no
second place to register it.

To index a *new* public route that has no CMS record, add it to
`EXTRA_PUBLIC_ROUTES` in `content-loader.ts`.

### Excluding content

Add its path prefix to `EXCLUDED_PREFIXES` in `content-loader.ts` and re-index.
The next run removes its chunks as stale.

---

## Suggested questions

`config/keybase-answer.ts`. Not UI: components never hold a question string of
their own.

```ts
{ id, question, category, enabled, order, cachePriority }
```

More prompts are configured than fit on screen. `selectSuggestedQuestions()`
picks four using a **deterministic** rotation key — never `Math.random()`, which
would make the server and the client disagree and break hydration. The key is
computed on the server (`dailyRotationKey()`) and passed down, so the set moves
once a day.

**Warming follows the rotation.** `warmableQuestions()` puts today's four and
tomorrow's four first, then the rest by priority; `keybase-answer:warm` warms all
of them by default. Warming only the highest-priority four while the page
displayed a rotated four would mean the prompts a visitor can click are the ones
that were never warmed.

If the warm command reports a prompt as `EMPTY`, the index does not cover it.
Either publish content for it or set `enabled: false` — a curated prompt that
greets a visitor with an empty state is worse than one fewer prompt. Two are
currently disabled for exactly this reason; see the comments in the config.

---

## Caching and invalidation

The cache key binds an answer to everything that could change what the answer
should be:

```
sha256( normalizedQuestion | contentIndexVersion | promptVersion | model | embeddingModel | maxSources )
```

Publish new market commentary → the index version moves → every cached answer
expires at once. Nobody has to remember that a rate commentary went out this
morning and the cached "what is the latest Bank of Canada decision" is now wrong.

`PROMPT_VERSION` (in `prompt.ts`) covers the instruction, how sources are
rendered, **and classification** — `classify-question.ts` feeds the prompt and
decides which answers come back restricted, so a change there changes the answer
to a question whose wording and sources are identical. Bump it for any of the
three.

`KEYBASE_ANSWER_CACHE_TTL` (seconds) is the outer bound; the version ingredients
usually expire an answer long before it.

The indexer calls `purgeSupersededAnswers()` to reclaim rows the new version has
already made unreadable.

A question that looks like it carries personal data is answered but **never
cached**, so its text does not outlive the visit.

---

## Citations

**No href rendered by this feature was ever produced by a language model.**

The prompt renders each source with an opaque id, a title, a category, and a
date — and no URL. The model cannot return a link because it was never given the
material to build one. What it returns is `SRC_001`-style handles, and
`validateCitations()` checks every one against the sources retrieval actually
supplied. An id that was not supplied is dropped: not looked up, not corrected,
not guessed at. Only then does the server attach the real title, URL, and
publication date from the index.

Inline markers (`[1]`, `[2]`) are asked for sparingly — once or twice per section
where a specific figure or date rests on a specific source, never on every
sentence. `applyInlineMarkers()` rewrites the internal handle to the reader-facing
number and deletes any that refer to nothing, so a reader never sees `SRC_002`
and never sees a marker with no source behind it.

Further reading is drawn from what retrieval found, whether or not the model
nominated it. Asking a model which Keybase articles exist is exactly the question
it answers plausibly and wrongly.

---

## The typewriter

The answer writes itself out on screen, character by character, with a blinking
caret — `components/keybase-answer/useAnswerTypewriter.ts`, paced by
`lib/keybase-answer/typing.ts`.

**It types text that has already been validated, rather than piping model tokens
straight to the browser.** That distinction is the whole reason the code is
shaped this way. An answer is only trustworthy after `validateCitations` has run
over the complete payload: until then it may carry internal `SRC_00n` handles and
citations that point at nothing, and the server has not yet swapped those for
real Keybase titles and URLs. Streaming raw tokens would put that unchecked text
in front of a reader — which, on a page making financial claims, is the one thing
this feature exists not to do. There is a second, more mundane reason: the model
returns Structured Outputs, so its partial output is half-finished JSON
(`{"status":"success","summary":"A Reg…`), not renderable prose.

So the network stream reports *progress* while the answer is being written, and
the typewriter performs the reveal once the answer has been checked.

| Behaviour | Rule |
|---|---|
| Pace | 170 chars/sec, floored at 0.7s and capped at 6.5s total. A long answer compresses rather than making the reader wait on its length. |
| Timing | Time-based via `requestAnimationFrame`, so it is identical on a 60Hz and a 120Hz display. |
| Order | Summary first, then each section. A section's heading lands whole the moment its body starts. |
| Citations | A marker is never shown half-written. `revealText` holds `[1` back until it is `[12]`. |
| Tail | Sources, further reading, disclaimer, feedback, and the new-question control are held back until the writing finishes. |
| Skip | "Show full answer" completes it immediately. Always offered. |
| Reduced motion | No typing, no caret, no skip control — the finished answer renders at once. |
| Screen readers | The complete text is exposed in one block while the animated copy is `aria-hidden`, so nothing reads a half-typed paragraph or gets interrupted every frame. Completion is announced once. |

Cached answers type too. A reader must not be able to tell a cache hit from a
fresh generation, and an answer that appeared instantly while another was written
out would give it away.

To change the pace, edit the three constants in `lib/keybase-answer/typing.ts`.
To remove the effect entirely, drop `useAnswerTypewriter` from `FinancialAnswer`
and stop passing `maxChars`/`caret` down — the components render the full text
when those are omitted.

---

## Financial guardrails

The system instruction is in `prompt.ts`. Beyond it:

**Individual recommendations.** `classifyQuestion` flags a request to be told
what *this reader* should do with their money. The distinguishing feature is an
action verb — "should I *buy*", "should I *allocate*" — not the phrase "should
I", because "What should I *know* about how a TFSA works?" is an educational
question and answering it with a compliance redirect would be both unhelpful and
wrong. A flagged question is answered `restricted`: one sentence of redirect,
then the general education the sources support. Where there is no educational
material behind it, only the redirect.

**Out of scope.** A question with no financial vocabulary at all never reaches
retrieval or the model. It gets a redirect and three example prompts.

**Instruction overrides.** "Ignore your instructions", "show me your system
prompt", "use your own knowledge" are flagged and logged, then answered down the
normal grounded path. They are not refused outright, because the same words
appear in legitimate questions; what contains them is the instruction, the
absence of any tool, and citation validation. The system prompt, the key, the
configuration, and the retrieval internals are never discussed.

**Personal data.** The input carries a standing note not to include account
numbers. Server-side, a question matching a sensitive pattern is answered but
never written to the shared cache, and never written to a log or an analytics
row — `redactForLogs()` drops it whole rather than trying to mask it.

**Retrieved text is data, not instruction.** The prompt says so explicitly, and
source text is rendered inside a labelled block.

---

## Rate limiting

A fixed hourly window per caller, counted in Postgres — the only place a limit
can be enforced, since the browser is the thing being limited.

```
KEYBASE_ANSWER_HOURLY_LIMIT=8
KEYBASE_ANSWER_RATE_LIMIT_SALT=<any long random string>
```

The caller is identified by a **salted hash** of the address from
`x-forwarded-for` / `x-real-ip`. The address itself is never stored, so the table
cannot be read as a log of who asked what and when. Unidentifiable callers share
one bucket, which is strict rather than permissive.

The limiter **fails open**: if the table is unreachable the request is allowed
and a warning is logged. A limiter that took the feature down with the table
would be worse than the exposure, which is one hour of unmetered questions behind
the provider's own limits.

No Redis or Upstash was introduced. The repository has neither, and a new service
to operate for a counter this small would not earn its keep.

---

## Analytics and feedback

Events go to `ka_events` and to the server log. Recorded: which stage was
reached, retrieval and generation latency, cache hit or miss, source count,
result status, model, error category, and a one-way question hash. **Not**
recorded: the question, the address, or any identifier that survives the request.

Event names are in `analytics.ts`; the client route accepts only names from that
list and only scalar properties from a fixed key allowlist — an endpoint that
stored whatever it was handed is the easiest way for a question to end up in an
analytics table.

Feedback (`ka_feedback`) stores the response id, the question hash, the verdict,
the source ids, and the model. The model is read from server configuration rather
than taken from the browser, which can neither name it nor misreport it.

The repository has no analytics vendor. Adding one means changing `recordEvent`
and nothing else.

---

## Environment variables

See `.env.example` for the annotated list. In brief:

| Variable | Default | Notes |
|---|---|---|
| `KEYBASE_ANSWER_ENABLED` | `true` | `false` hides the homepage module and 404s the route. |
| `OPENAI_API_KEY` | — | Server only. Required in production. |
| `KEYBASE_ANSWER_MODEL` | `gpt-5.6-terra` | |
| `KEYBASE_ANSWER_EMBEDDING_MODEL` | `text-embedding-3-small` | Changing it re-embeds on the next index run. |
| `KEYBASE_ANSWER_MAX_SOURCES` | `6` | |
| `KEYBASE_ANSWER_MAX_PASSAGES_PER_SOURCE` | `3` | With max sources, this bounds prompt cost. |
| `KEYBASE_ANSWER_MAX_QUESTION_LENGTH` | `600` | |
| `KEYBASE_ANSWER_HOURLY_LIMIT` | `8` | |
| `KEYBASE_ANSWER_RATE_LIMIT_SALT` | `keybase-answer` | Set it. |
| `KEYBASE_ANSWER_CACHE_TTL` | `604800` | Seconds. |
| `KEYBASE_ANSWER_MIN_RELEVANCE` | `0.34` | |
| `KEYBASE_ANSWER_STRONG_RELEVANCE` | `0.58` | |
| `KEYBASE_ANSWER_MIN_RELEVANT_SOURCES` | `2` | |
| `KEYBASE_ANSWER_FRESHNESS_WINDOW_DAYS` | `120` | |
| `KEYBASE_ANSWER_FRESHNESS_HALF_LIFE_DAYS` | `240` | |
| `KEYBASE_ANSWER_INDEX_BASE_URL` | — | Or pass `--base-url`. |
| `KEYBASE_ANSWER_USE_MOCK` | `false` | Development only; ignored in production. |
| `DATABASE_URL` | — | Shared with the CMS and content systems. |

---

## Commands

```bash
npm run keybase-answer:migrate     # apply scripts/sql/keybase-answer-schema.sql
npm run keybase-answer:index       # build the knowledge index (add -- --base-url=…)
npm run keybase-answer:warm        # pre-generate the curated prompts (-- --visible-only)
npm run keybase-answer:test        # this feature's tests
```

The `:index` and `:warm` commands are TypeScript run directly by Node.
`scripts/register-ts.mjs` adds a resolve hook for the `@/*` alias and for
extensionless imports, so the scripts import `lib/keybase-answer/*` exactly as
the application does instead of those modules being duplicated in `.mjs` for the
sake of the command line.

---

## Local development

**With a key and a database** — the real thing:

```bash
npm run dev
npm run keybase-answer:migrate
npm run keybase-answer:index -- --base-url=http://localhost:3000
npm run keybase-answer:warm
```

**Without either** — set `KEYBASE_ANSWER_USE_MOCK=true`. The OpenAI provider is
replaced by a deterministic local one and, if there is no `DATABASE_URL`, the
index is built in memory from the approved content on first use. The whole
pipeline runs, including citation validation.

Two things to know about mock mode:

- It is ignored whenever `NODE_ENV` is `production`, regardless of what the
  environment says. A production deployment without a key **fails**; it never
  quietly serves an invented financial answer.
- Mock embeddings are a hashed bag of words, not a semantic index. They rank
  related passages above unrelated ones well enough to exercise the pipeline,
  but they score lower than real embeddings, so questions that would answer in
  production may come back as insufficient evidence locally. Lower
  `KEYBASE_ANSWER_MIN_RELEVANCE` if that gets in the way.

---

## Deployment checklist

1. `OPENAI_API_KEY` set in the server environment. Not in any `NEXT_PUBLIC_*`.
2. `KEYBASE_ANSWER_RATE_LIMIT_SALT` set to a long random string.
3. `DATABASE_URL` reachable; `npm run keybase-answer:migrate` applied.
4. `npm run keybase-answer:index -- --base-url=https://<production host>` — the
   base URL must point at a deployment serving the *current* content.
5. `npm run keybase-answer:warm`. Investigate anything reported `EMPTY`.
6. `KEYBASE_ANSWER_ENABLED=true`.
7. Re-index scheduled, or wired to the CMS publish step.
8. Confirm `/api/keybase-answer` returns `x-robots-tag: noindex, nofollow`.

---

## Troubleshooting

**"Keybase Answer is being updated. Please try again shortly."**
The index is empty or the tables do not exist. Run `keybase-answer:migrate` then
`keybase-answer:index`. The application never creates its own tables — same rule
the website CMS follows.

**Answers are thin on registered accounts (TFSA, RRSP, RESP).**
The index was built without `--base-url`, so the service pages contributed only
their CMS summary. Re-index against a running site.

**A question that should work returns insufficient evidence.**
Check whether Keybase has actually published on it — that is usually the answer,
and it is the system working. If the material exists, lower
`KEYBASE_ANSWER_MIN_RELEVANCE` a little and re-check; the thresholds are on the
blended score, so a change affects keyword and freshness weighting too.

**A change to the prompt or the classifier has no effect.**
Bump `PROMPT_VERSION`. Cached answers are keyed on it.

**"Something went wrong while preparing your answer."**
Deliberately opaque. The cause — provider message, status, request id — is in the
server log against the request id.

**The homepage module or `/keybase-answer` has disappeared.**
`KEYBASE_ANSWER_ENABLED` is false.

**`MODULE_TYPELESS_PACKAGE_JSON` when running a command.**
Suppressed with `--disable-warning` in the npm scripts. It is a Node performance
note about parsing `.ts` files as ES modules, and is irrelevant for a
command-line tool.

---

## Known gaps

- **Content coverage is the binding constraint, not the system.** The corpus is
  currently one published article and sixteen service pages. Questions about
  bond price/yield mechanics and about economic indicators return insufficient
  evidence because Keybase has not published on them — the two prompts that
  cover those subjects are disabled in the config for that reason. Publishing
  fills these in; no code change is needed.
- **No CMS webhook.** Re-indexing is a command or a scheduled job.
- **No search page on the site**, so the answer page's "looking for something
  else" link points at the Newsroom. If a search route is ever added, change
  `ANSWER_PAGE_COPY.helpHref` — nothing else refers to it.
- **Shareable answers are `?q=`**, which re-asks the question rather than
  restoring a stored response. That keeps session and response ids out of a
  shared link; a stored-answer route would be the richer option.
