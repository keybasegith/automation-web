# Finance Trivia Challenge — IT Review Brief

**Author:** Taehee Eum
**Audience:** IT Department Head
**Status:** Feature complete, **needs IT review before going live at the event**
**Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS

---

## 1. What this is

A short, mobile-first trivia game built to engage attendees at an upcoming Keybase Financial Group event. Attendees scan a single QR code, fill in a short contact form, and are routed into a 9-question finance trivia game. The form data is intended to be captured as a **warm lead list** for follow-up by Keybase advisors.

The goal is **lead generation** dressed up as entertainment — the trivia content reinforces our talking points (compounding, TFSA, advisor impact, patience) while we collect the information needed to follow up.

---

## 2. End-user flow

```
[QR code on event display/printout]
        │
        ▼
1. Attendee scans with phone camera
        │
        ▼
2. Lands on /trivia-game-form
        │
        ▼
3. Fills in: Full Name, Email, Phone, Investment Timeline, Consent
        │
        ▼
4. Submits form  ──►  POST /api/trivia-lead  ──►  Lead saved to Google Sheet
        │
        ▼
5. Auto-redirected to /trivia-game
        │
        ▼
6. Plays 9 multiple-choice questions
        │
        ▼
7. Sees score + summary screen, option to replay
```

Single QR code, single funnel. The trivia game is **gated** behind the form — attendees cannot reach the questions without submitting their contact info.

---

## 3. What data is collected

All collected from the form at `/trivia-game-form`. **No data is collected during the game itself** (answers are scored client-side; nothing is sent to the server during gameplay).

| Field                | Required | Notes                                                              |
| -------------------- | -------- | ------------------------------------------------------------------ |
| Full name            | Yes      | Plain text                                                         |
| Email                | Yes      | Validated client-side and server-side against a standard email regex |
| Phone number         | Yes      | Plain text; no formatting enforced                                 |
| Investment timeline  | Optional | Dropdown: "Within 3 months / 3–6 months / 6–12 months / 1+ year / Just exploring" |
| Consent              | Yes      | Checkbox: "I consent to Keybase Financial Group contacting me by phone or email about my inquiry." |
| Submitted At         | (system) | ISO timestamp added server-side                                    |
| Source               | (system) | Static value: `"trivia-game-form"`                                 |

**This is PII.** Specifically: name + email + phone, with marketing consent. **PIPEDA applies.**

---

## 4. Architecture

The feature is **entirely additive** to the existing app — no changes to existing routes, auth, or shared infrastructure. All new code lives under namespaced folders.

### Files added

```
app/
├── trivia-game/
│   └── page.tsx                  # The game (server-rendered shell + client component)
├── trivia-game-form/
│   ├── page.tsx                  # The lead-capture form
│   └── qr/
│       └── page.tsx              # QR code display page (for event signage)
└── api/
    └── trivia-lead/
        └── route.ts              # POST handler that forwards leads to Google Sheets

components/
└── trivia-game/
    ├── TriviaGame.tsx            # Game UI + scoring logic (client component)
    ├── TriviaForm.tsx            # Form UI + submit logic (client component)
    └── TriviaFormQR.tsx          # QR code renderer (client component)

docs/
└── trivia-game-it-review.md      # This document
```

### Public routes

| Route                   | Purpose                                                  | Auth |
| ----------------------- | -------------------------------------------------------- | ---- |
| `/trivia-game-form`     | Lead-capture form (QR code lands here)                   | None (public) |
| `/trivia-game-form/qr`  | Displays a QR code pointing to `/trivia-game-form`. Internal use only — the boss displays this on a laptop/projector at the event. | None |
| `/trivia-game`          | The trivia game itself                                   | None (public) |
| `POST /api/trivia-lead` | Receives form submission, forwards to Google Sheets      | None |

> **None of these routes are behind the existing Keybase login** — they have to be publicly reachable because attendees are anonymous external users scanning a QR code. This is intentional but worth flagging.

### Where each piece runs

- **Form, game, QR page:** Client components rendered in the attendee's mobile browser. No data is persisted client-side.
- **`/api/trivia-lead`:** Server-side route handler running in the Node.js runtime on whatever environment hosts the Next.js app. This is the only server-side data path.

---

## 5. Lead storage — current design

**Storage destination:** A Google Sheet owned by Keybase, via a Google Apps Script Web App acting as a webhook.

**Flow:**

```
Form (browser)
  │
  │  HTTPS POST (JSON)
  ▼
/api/trivia-lead  ── runs on our Next.js server
  │
  │  Validates the payload (required fields, email format, consent)
  │  Logs the lead to server console as a backup
  │
  │  HTTPS POST (JSON)
  ▼
Google Apps Script Web App  ── runs in Google's infrastructure
  │
  │  Apps Script appends a row
  ▼
Google Sheet  ── owned by Keybase Workspace account
```

**Apps Script code** (provided to whoever owns the Sheet):

```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([
    data.submittedAt, data.source, data.fullName,
    data.email, data.phone, data.timeline,
    data.consent ? "Yes" : "No",
  ]);
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

**Resilience:** If the webhook is unset or fails, the lead is still logged to the Next.js server console with a `[trivia-lead]` prefix so it can be recovered manually. The user is always allowed to proceed to the game so the event experience never breaks — but **leads will silently fail to reach the Sheet** if the webhook URL is misconfigured. IT should confirm where server logs are collected.

---

## 6. ⚠️ Data residency — needs IT decision

Keybase is a Canadian wealth-management firm and our internal standard is that **client/prospect PII must remain within Canada**. This feature, **as currently built, does not guarantee that**. Please review the following before go-live:

### 6.1 Where does Google store the Sheet data?

- Google Workspace storage region depends on the Workspace edition and the Keybase admin's region settings.
- **Standard / Business / older Enterprise tiers:** data location is **not guaranteed to be Canada**. Google may distribute it across global data centers.
- **Workspace Enterprise Plus with Data Regions add-on:** allows pinning Drive/Docs/Sheets at-rest data to a specific region — but the available regions are typically **US** or **Europe**, not Canada specifically (verify with current Google docs / your Workspace contract).
- **Apps Script execution location:** Apps Script may execute in any Google region; payloads in transit pass through Google infrastructure outside Canada.

**Conclusion: if strict Canadian data residency is required, Google Sheets is likely not acceptable.** IT should confirm.

### 6.2 Where does our Next.js server run?

The form briefly handles PII server-side (validation, console logging, webhook forwarding). The hosting region of the Next.js app therefore also matters.

- If hosted on **Vercel**: Vercel does **not** currently offer a Canadian region. The closest options are US East (`iad1`) or US West (`sfo1`). Serverless functions and edge functions execute in whatever region the deployment is pinned to.
- If hosted on **AWS / Azure / GCP**: a Canadian region (`ca-central-1`, `canadacentral`, `northamerica-northeast1`) is available and should be used.
- If self-hosted on Keybase infrastructure: presumably already Canadian — please confirm.

**IT to confirm:** the current hosting region for `keybase-automation-web` and whether it satisfies our residency policy.

### 6.3 Recommended alternatives if Google Sheets is a no-go

The Next.js app already includes a Supabase client ([lib/supabaseClient.ts](../lib/supabaseClient.ts)) used by other features in the codebase. **Supabase offers a Canada Central region.** If the existing Supabase project is provisioned in Canada, we could swap the storage backend with minimal code change:

1. Create a `trivia_leads` table in the existing Supabase project.
2. Replace the Apps Script forwarder in `/api/trivia-lead/route.ts` with a Supabase `insert()` call.
3. Export the table to CSV/Sheet for advisor follow-up when needed.

This keeps all data inside infrastructure IT already manages and audits. **I haven't made this change yet — waiting on IT direction.**

Other options IT may prefer:
- A dedicated row in an existing CRM (if Keybase has one with a Canadian region).
- A simple write to an existing internal database used by other Keybase tools.

---

## 7. Secrets & configuration

| Variable                    | Where           | Purpose                                              | Sensitivity |
| --------------------------- | --------------- | ---------------------------------------------------- | ----------- |
| `TRIVIA_LEAD_WEBHOOK_URL`   | `.env.local` (and production env)  | Apps Script Web App URL the lead is forwarded to     | Treat as a secret — anyone with this URL can append rows to our Sheet |

The webhook URL is **never exposed to the browser** — it lives only in server-side env vars and is read inside the API route. There is no client-side JS that contains it.

**IT to handle:**
- Decide whether the webhook URL goes into our existing secrets store (e.g. Vercel env vars, AWS Parameter Store, Doppler, etc.).
- Decide who has access to manage / rotate it.
- If we switch to Supabase per §6.3, the relevant env vars are already managed and no new secret is needed.

---

## 8. Security considerations

| Concern | Current state | Notes for IT |
| --- | --- | --- |
| **Public endpoints** | Form, game, QR page, and `/api/trivia-lead` are all unauthenticated. | Intentional — attendees are anonymous. But it means `/api/trivia-lead` is open to the public internet. |
| **Rate limiting** | None implemented. | An attacker could spam the endpoint and either fill the Sheet with junk or run up Google quota. Recommend adding rate limiting (IP-based, simple throttle) before public launch — easy to add at the edge (Cloudflare / WAF) or via a small middleware. |
| **Bot protection / CAPTCHA** | None. | Same risk as above. Consider Cloudflare Turnstile or Google reCAPTCHA if abuse is a concern. |
| **CORS** | Default Next.js behaviour — `/api/trivia-lead` only accepts same-origin requests by default. | OK unless the form is ever embedded elsewhere. |
| **Input validation** | Server-side: required fields, email regex, consent boolean. No length caps. | Recommend adding max-length caps server-side (e.g. name ≤ 100, email ≤ 254, phone ≤ 30) to prevent payload abuse. I can add this if IT wants. |
| **Logging** | Each lead is logged to server `console.log` with the full payload. | This is **intentional as a recovery backup** but it does mean PII ends up in whatever log aggregator we use (CloudWatch / Datadog / Vercel logs / etc.). IT to confirm the log destination is Canadian and has appropriate retention/access controls. |
| **HTTPS** | All POSTs are HTTPS in production. | Standard. |
| **Consent record** | Checkbox stored as `Yes/No` in the Sheet alongside the lead. | This is the basic CASL/PIPEDA consent record. **The exact consent wording is in the UI and should be reviewed by Compliance** before go-live. |

---

## 9. Privacy / Compliance — flagging for review

This needs review by whoever owns Keybase's privacy practices (likely Compliance, not IT — but flagging here so it doesn't fall through the cracks):

- The consent wording shown to attendees is currently: *"I consent to Keybase Financial Group contacting me by phone or email about my inquiry. I can unsubscribe at any time."* — please confirm this satisfies CASL (Canadian Anti-Spam Legislation) express-consent requirements.
- There is no link to a privacy policy on the form. **Recommend adding one** before go-live, pointing to the Keybase public privacy notice.
- Retention policy for the Sheet (or whatever storage we land on) is currently undefined — IT and Compliance to set this.
- Right-to-deletion: attendees may later request removal of their data. We need a process for this.

---

## 10. What I'm asking IT to decide / do

| # | Decision needed | Owner | Blocking go-live? |
| - | --- | --- | --- |
| 1 | Confirm Google Sheets is acceptable for Canadian data residency, **or** approve switching to Supabase (Canada region) / another internal backend. | IT | **Yes** |
| 2 | Confirm hosting region of `keybase-automation-web` (and migrate if needed). | IT | **Yes** |
| 3 | Decide where the `TRIVIA_LEAD_WEBHOOK_URL` (or replacement secret) lives and who manages it. | IT | **Yes** |
| 4 | Add rate limiting + bot protection to `/api/trivia-lead`. | IT or me with IT's guidance | **Recommended** |
| 5 | Confirm log destination + retention is policy-compliant. | IT | Recommended |
| 6 | Review consent wording + add privacy-policy link. | Compliance | **Yes** |
| 7 | Define retention + deletion process for collected leads. | IT + Compliance | Before go-live |

I'm happy to implement whatever direction IT chooses — switching storage backends, adding middleware, moving env vars, etc. The feature code is namespaced and small enough that any of these changes is a few hours of work, not a rewrite.

---

## 11. How to test it locally

```bash
npm install
npm run dev
# Visit http://localhost:3000/trivia-game-form/qr  (the QR display)
# Or http://localhost:3000/trivia-game-form        (the form directly)
```

Without `TRIVIA_LEAD_WEBHOOK_URL` set, the form still submits successfully and the user proceeds to the game — leads land in the dev-server terminal as `[trivia-lead] {...JSON...}` log lines. This was a deliberate choice so the event experience never breaks if the webhook is misconfigured.

---

## 12. Contact

Questions / changes: **Taehee Eum** — taeheeeum.uoft@gmail.com
