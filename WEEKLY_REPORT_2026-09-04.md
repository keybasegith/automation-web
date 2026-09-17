# Weekly Report — Keybase Financial Group

**Week of:** August 31 – September 4, 2026
**Focus areas:** Keybase Answer (AI search over our own content), Financial Statement Generator (shipped), Internal AI Phases 1–2, dashboard authentication, Client Risk Questionnaire, content/people/SEO system, Marketing Content Calendar
**Status:** Seven workstreams built in five days — roughly **37,000 lines of new code, tests and documentation**, plus the **8,100-line Financial Statement Generator shipped to main**

---

## Summary

This week was about turning the firm's remaining manual work into systems we
own, and it ran across seven parallel workstreams rather than the usual two or
three. Two of them — the Financial Statement Generator and the Mexico trip
page — are already on `main`. The other five are complete and working in the
development tree and are staged for review before they go up.

The headline outcomes:

1. **Keybase Answer** — a private, cited AI answer engine that answers
   questions using *only* Keybase's own published material, and says "not
   enough evidence" rather than inventing an answer.
2. **The Financial Statement Generator shipped** — Trial Balance in, Balance
   Sheet and Income Statement out, with no AI anywhere in the calculation and a
   golden test against real July 2026 figures.
3. **Internal AI reached the end of what can be built without hardware** —
   Phase 1 (the whole assistant) and Phase 2 (the local-inference
   architecture, benchmark framework and GB10 deployment runbook) are both
   done. The only thing left is the GB10 machine itself.
4. **The dashboard is now actually protected.** Sign-in went from a browser
   flag the server never checked to signed, expiring server-side sessions
   enforced on every internal page and API route.
5. **Compliance's Client Risk Questionnaire went digital**, scoring itself on
   screen and feeding the discrepancy detector.
6. **The website's content, people and SEO layer** was built out — advisor
   pages, article attribution, sitemap, robots and structured data.
7. **Marketing got a content calendar** — planning, files, links, approvals
   and compliance review in one place.

The through-line is unchanged: replace manual, error-prone work with systems
the firm owns end to end — and, increasingly, keep the firm's data inside the
firm's own walls.

---

## What I worked on

### 1. Keybase Answer — an AI answer engine over our own content (Monday)

A BCG-Answer-style question box at `/keybase-answer`, plus a module on the
homepage. You ask a question in plain language; it answers from Keybase's
published material and **cites the exact pages it used**.

- **It cannot make things up about Keybase.** Retrieval runs over an index
  built only from approved, published pages. When the evidence behind a
  question is too thin, it refuses and says so instead of guessing — which is
  the only acceptable behaviour for a regulated firm's public-facing tool.
- **Financial guardrails** sit on top: the tool does not give advice, and it
  routes those questions to a person.
- Built the whole pipeline in-house: chunking and indexing of our pages,
  embeddings, ranking, an evidence threshold, citation rendering, caching and
  invalidation, rate limiting, suggested questions, and answer feedback
  capture for measuring quality over time.
- Our database does not offer the usual vector extension, so embeddings are
  stored as JSON and the similarity search runs in the application behind a
  single interface — if we ever move to a host that supports it, that is a
  one-file change, not a rebuild.
- Shipped with **12 automated test suites**, two operator commands
  (`keybase-answer:index`, `keybase-answer:warm`) and a 680-line manual.

**One honest limitation, and it is a content problem rather than a software
problem:** the corpus is currently one insight article plus sixteen service
pages. Questions about bond price/yield mechanics and economic indicators come
back as "insufficient evidence" because *we have published nothing on them*.
The warm-up command reports exactly which questions the index cannot answer —
that list is effectively a content brief for Marketing.

### 2. Financial Statement Generator — shipped to main (Wednesday)

A Trial Balance goes in; a **Balance Sheet and Income Statement** come out.
**62 files, 8,116 lines**, on `main`.

- **Deterministic by design — there is no AI in the numbers.** Every figure is
  arithmetic on integer cents, so the statements are reproducible and balance
  exactly. Nothing about a client's financials is sent to any AI service.
- Account mappings are reusable and can be exported and imported, so the
  chart-of-accounts knowledge is captured once rather than re-entered monthly.
- Full package lifecycle: generate, review exceptions, regenerate, finalize,
  reopen, and an audit trail of who did what.
- Excel and PDF export for client-ready output.
- Verified with a **golden test against real July 2026 figures**, with the one
  remaining variance documented rather than hidden.
- Two follow-up fixes the same day: the generator now works on hosting without
  writable storage, and it no longer offers download links for packages it
  cannot actually serve.
- **13 automated test suites** cover the mapping, calculation and export paths.

### 3. Internal AI — Phases 1 and 2 complete, waiting on hardware (Friday)

The private assistant at `/internal-ai`, built to a standing constraint:
**inference must run on the company's own NVIDIA GB10 system — no external AI
API, ever.** That constraint is enforced by an automated test that fails the
build if anyone wires in an outside provider.

- **Phase 1 — the whole application:** dashboard entry point, chat interface,
  API, and a provider abstraction. It runs today against a mock that states
  plainly that no model is connected, so staff are never shown a fake answer.
  File attachments (drag, paste or picker; images and documents) are included —
  and are deliberately **neither read nor stored** until the retention question
  is answered.
- **Phase 2 — the local-inference architecture:** a model registry, a
  chat-completions client for the local server, a streaming parser, a
  **benchmark framework**, and a load-test sweep for measuring concurrency.
- **Documentation for the handover:** a local-LLM architecture document and a
  step-by-step **GB10 deployment runbook** (hardware validation → NVIDIA stack
  → inference runtime → application connection → benchmark and select →
  security → operations → rollback).
- Model candidates are shortlisted (a quality option, a performance option and
  a baseline), with selection weighted toward **latency and concurrency over
  raw answer quality** — the assistant has to feel instant for a room full of
  staff, not win a benchmark.
- **No performance number has entered the repository**, because nothing has
  been measured yet: the benchmark runner refuses to write results when there
  is no server. Every figure stays UNKNOWN until it is measured on the actual
  GB10.

Switching from mock to live is a single environment variable once the machine
is here. There is deliberately no silent fallback to the mock if the server is
down — an outage is safer than a convincing fake answer.

### 4. Dashboard authentication — the internal tools are now actually locked

The dashboard previously trusted a flag in the browser that the server never
verified; anyone who knew a URL could reach internal tooling and the APIs
behind it.

- Replaced it with **signed, expiring, httpOnly session cookies** (eight-hour
  working-day lifetime) checked at the edge for every internal page and API
  route, **and** re-checked next to the data itself in **17 API routes** — so a
  mistake in the routing configuration cannot on its own open an endpoint.
- Sign-in is a single account configured from the server environment with a
  properly hashed password (never stored in the code), as an interim step
  **pending company SSO**; the file that defines it is the one file SSO
  replaces.
- Kept the three separate logins (dashboard, website CMS, content authoring)
  deliberately separate, because one cookie doing several jobs means one bug
  hands out several grants.
- The public marketing site runs from the same deployment, so which routes are
  internal is written down in one place and covered by tests — over-protecting
  would break the website.
- Documented the known gaps and the SSO migration path in
  `docs/authentication.md` rather than leaving them in my head.

### 5. Client Risk Questionnaire — digital and self-scoring

Built the individual account holder CRQ (form v2-crq25) as an on-screen
questionnaire that **scores itself and produces the risk profile
automatically**, with a print/PDF path for the file and persistence for the
compliance record.

This closes the loop with the discrepancy detector: the CRQ's risk profile is
the ceiling for the risk tolerance recorded on the NAAF, which is one of the
checks the detector runs. Three rule details are still waiting on the
compliance officer's sign-off (see below) — they are isolated in one
configuration file so her answers are a one-line change each, not a rewrite.

### 6. Website content, people and SEO

The largest single block of the week by volume (~74 files):

- A **content authoring system** for long-form material, with its own separate
  authoring session.
- **People and advisor pages** (`/people`), with articles attributed to their
  authors and shown on the author's profile.
- A proper **SEO layer**: sitemap, robots, canonical metadata helpers, and
  structured data (including job postings for the careers pages) so Google can
  read what we publish — with automated tests that check the indexing rules,
  because SEO regressions are otherwise invisible until traffic drops.

### 7. Marketing Content Calendar (Friday)

A "Google Calendar, but marketing only" at
`/dashboard/departments/marketing/calendar`, so interns and managers plan in
one place instead of across chat threads:

- Month grid and list view; drag a card to another day to reschedule.
- **Files** attach to a piece (briefs, drafts, artwork, decks, video) and
  download from it — uploads go straight to our own storage, and downloads are
  short-lived signed links rather than a public bucket.
- **Links** paste in and render a preview card, captured at the moment it was
  added.
- **An eight-stage pipeline** — idea → approval requested → approved → in
  production → compliance review → compliance cleared → ready to post →
  published. Work moves forward one stage at a time, can be sent back to any
  earlier stage with a required reason, and every move, comment and file is
  recorded against the piece.

### 8. Mexico trip landing page — final polish (Monday–Tuesday)

Five changes to the qualifiers' trip page ahead of distribution: the hero
send-off line and copy over the photos, the sign-off details, the full house
lockups in the header, six resort photos into the gallery with the Hyatt link,
and a rotated call to action with two cards retitled.

---

## Meetings & coordination

- Working from the **compliance officer's answers of August 18** on the
  NAAF/CRQ review rules; those answers are what the new questionnaire and the
  discrepancy detector are built against.
- **Waiting on the company's NVIDIA GB10 system.** Everything that can be
  built before it arrives now is built, including the deployment runbook, so
  installation should be an afternoon rather than a project.

## Open items / next steps

1. **Get this week's five in-tree workstreams reviewed and onto `main`** —
   Keybase Answer, Internal AI, authentication, the CRQ and the content
   calendar are complete and tested but not yet committed.
2. **Two database migrations to apply** — the Client Risk Questionnaire (014)
   and the marketing content calendar (015).
3. **Compliance sign-off on three CRQ/NAAF rule details**: the score boundary
   at 12 (the form leaves 12 undefined), whether the NAAF plan risk tolerance
   is read from the New or Current column, and reconciling the section letters
   used in deficiency emails with the form's own lettering.
4. **GB10**: on arrival, run the benchmark sweep and pick the model on measured
   latency and concurrency — not on reputation.
5. **Content for Keybase Answer**: publish material on bond price/yield
   mechanics and economic indicators, then re-index; those questions are
   switched off today only because we have nothing published to cite.
6. **Pilot the content calendar with Krissy and the interns**, and put the
   Financial Statement Generator in front of Finance against a live month.
7. **Two failing tests in the Smart Document Intake page classifier**
   (printed-title matching) — pre-existing, unrelated to this week's work, but
   they should be fixed rather than carried. The rest of the suite is green:
   **1,166 of 1,168 tests passing**.
