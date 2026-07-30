# Weekly Report — Keybase Financial Group

**Week of:** July 20–24, 2026
**Focus areas:** Business Processing Settlement Automation (delivered), Compliance Discrepancy Detection (delivered), In-House Website ERP — Phase 1 production infrastructure (delivered)
**Status:** Highest-output week to date — three major systems moved from design to working software

---

## Summary

This was, by a wide margin, my most productive week since joining. The
groundwork laid over the previous weeks — the shadowing sessions, the workflow
drafts, the settlement logic clarified with Karthika — all converged, and I
converted it into **working, tested software across three parallel
workstreams simultaneously**. In raw terms: roughly **25,000 lines of
production code and tests** were designed, written, tested, and shipped this
week alone.

The headline outcomes:

1. The **Business Processing Settlement automation** is no longer a draft — it
   is now **two live, working tools**: a full Net Settlement reconciliation
   system and a BP Daily Settlement tool, both built against real Fundserv
   data and backed by comprehensive automated test suites.
2. I built a complete **Compliance Discrepancy Detector** — a rules engine
   that cross-checks NAAF and CRQ documents automatically, catching the
   inconsistencies that today have to be found by eye.
3. The **in-house Website ERP** graduated from a prototype into
   **production-grade infrastructure**: content now persists in a real
   Postgres database, media lives in S3-compatible cloud storage, and the
   whole system was restructured and documented for long-term maintainability.

Every one of these was carried from architecture through implementation
through testing within the same week. The through-line remains the same:
replace manual, error-prone back-office work with **systems the firm owns and
controls end to end** — but this week those systems became real.

---

## What I worked on

### 1. Business Processing Settlement automation — from draft to working system

Last week I was waiting on the Fundserv Transaction Details file from
Karthika. This week I received it, and rather than building incrementally, I
pushed hard and delivered the **entire settlement automation pipeline**:

- **Net Settlement reconciliation tool** (`/net-settlement`) — a complete
  system that ingests both **Fundserv and WinFund files** (CSV *and* PDF),
  automatically detects which source a file came from, normalizes the data,
  and runs a **transaction-level matching engine** that reconciles the two
  sides and pinpoints exactly where they diverge.
  - Handles messy real-world input: PDF text extraction, flexible column
    mapping with a visual mapping modal, paste-from-clipboard support, and
    currency-safe money arithmetic (no floating-point errors in financial
    figures).
  - Produces a **side-by-side comparison table**, an automated
    **recommendation summary**, and a **client-ready export**.
  - Backed by a **full automated test suite** with real fixture files, so the
    reconciliation logic is verified — not assumed — to be correct.
- **BP Daily Settlement tool** (`/bp-dailysettlement`) — a second tool built
  on the same engine, tailored to the daily settlement workflow I mapped
  during my shadowing sessions with the Business Processing team.
  - Includes dedicated **parsers for Fundserv Summary and Transaction Listing
    documents**, including **OCR support** for scanned pages, file
    auto-classification, and a transaction drill-down drawer for
    investigating individual line items.
  - Also fully covered by automated tests across parsing, normalization,
    validation, and reconciliation.

What was a workflow diagram two weeks ago is now software the team can
actually run.

### 2. Compliance Discrepancy Detector — built end to end

Drawing directly on my time embedded with the Compliance team, I designed and
built an **automated discrepancy detection system** for account documents:

- Extracts and normalizes fields from **NAAF and CRQ documents** (PDF
  ingestion included), then runs them through a **rules engine of several
  hundred lines** encoding the actual compliance checks the team performs —
  field-by-field cross-document consistency, blank-field detection, and
  validation against a controlled vocabulary.
- Automatically identifies the responsible **advisor** and **drafts the
  follow-up email** flagging the discrepancies — turning what is currently a
  manual review-and-write process into a single automated pass.
- Includes an audit trail and, like everything else this week, an extensive
  **automated test suite** (rules, normalization, validation, advisor lookup,
  and email generation are all independently tested).

### 3. In-House Website ERP — Phase 1 production infrastructure complete

The ERP took a major leap from "working prototype" to "production system":

- Authored a formal **development specification** (`docs/website-cms-spec.md`)
  covering architecture, hosting, storage, and a phased delivery plan — then
  revised it after working through the infrastructure trade-offs
  (Vercel + Postgres + S3), so the build is following a documented plan
  rather than improvisation.
- **Migrated all CMS content into a real Postgres database** and **all media
  into S3-compatible cloud storage**, complete with presigned direct uploads,
  a media usage/policy layer, an automated **data migration script**, and a
  documented **rollback procedure**. The website's content is no longer tied
  to files on a single machine — it is durable, scalable infrastructure.
- **Restructured the entire admin area** to its own dedicated, secured
  namespace (`/website-admin-cms`), cleanly separating the firm's internal
  tooling from the public site.
- Wrote **local development and operations documentation** so the system is
  maintainable long-term, not just by me.
- With Phase 1 complete, the foundation is in place for **Phase 2: the
  Newsroom editor** — the module that will let Krissy publish news and
  articles herself, Canva-style, with zero code and zero external agency.

### 4. Additional deliverables

Even alongside the three main workstreams, I shipped several smaller items:

- **Digital business card for Ernest** (`/businesscard-ernest`) — a polished,
  mobile-friendly interactive flip card with one-tap contact sharing.
- **Bike Fest flyer page** (`/bike-fest`) — a mobile-optimized PDF flyer
  viewer with a **QR code** for print distribution; iterated on it across the
  week (including a same-day fix for a mobile rendering bug and a final
  content swap on Friday) so it stayed reliable for the event.
- An internal **API test harness** (`/testapi`) to speed up development and
  debugging of the tools above.

---

## Meetings & coordination

- Followed through on last week's coordination with **Karthika**: received the
  Fundserv working files and used them immediately as the ground truth for
  the settlement tools' parsers, fixtures, and automated tests.

## Open items / next steps

- **Put the settlement tools in front of the Business Processing team** for
  hands-on validation against live daily files, and tighten the matching
  rules based on their feedback.
- **Pilot the Discrepancy Detector with the Compliance team** on real
  NAAF/CRQ pairs and calibrate the rules engine against their judgment.
- **Begin ERP Phase 2 (Newsroom)** — the block-based news/article editor that
  moves the firm to full self-service publishing.
