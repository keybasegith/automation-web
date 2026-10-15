# Advisor page portal

This feature lives in the existing keybase-automation-web application at `/advisor-portal`, with links from the dashboard and Marketing, Compliance, and IT tools.

The existing `/profile-jleung` page and portal previews share `components/advisor-portal/AdvisorPageTemplate.tsx`. The public page retains its original profile data. Submitted changes never automatically modify the public page: Keith manually publishes in his own system and then records completion.

## Local preview

Run the existing `npm run dev -- --hostname 127.0.0.1 --port 3000`.

- `/dashboard`: existing automation workspace
- `/advisor-portal`: Supabase email/password sign-in
- `/advisor-portal?demo=1`: browser-local sample roles, development only

The demo uses Johnathan's existing template; its statistics are sample content. It is not production authentication or a live publishing integration. Demo records persist in browser localStorage. Inbox polling is every 15 seconds.

## Real connection status

Connected on October 15, 2026 to the existing **keybase-website** Supabase project (`rozjrujbxghnbtmnpsqd`). The project's local `.env.local` now contains the matching URL and keys. Credentials remain ignored by Git.

`supabase/017-advisor-portal.sql` was applied through the signed-in Supabase SQL editor. All six portal tables were verified with row-level security enabled. Katie Eum (`keum@keybase.com`) has an individual Supabase Auth account, a linked `advisor` profile, and an initial personal draft. No password is stored in application source or this documentation.

Migrations 017–019 are applied. Katie Eum is an advisor, David Atlas is compliance, and Keith Sutherland is IT. Their passwords are managed by Supabase Auth and are never committed.

Live browser verification passed: Katie submits, David receives an inbox notification and reviews the immutable snapshot, David returns feedback, Katie resubmits, and David approves to the IT queue. Keith's login and IT queue access are verified. Inbox notifications refresh every 15 seconds. Approved requests remain queued until Keith manually publishes them.

Company copy comes from the protected organization record. It is included in compliance review; its ready flag remains false pending formal approval. Logo and brand colors are fixed in the renderer and enforced by database triggers. New advisors start with four editable zero-valued statistics.

Production requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for the same Supabase project. The portal uses authenticated RPCs; it does not need a service-role key in the browser.

Advisors can read only their own drafts/submissions; compliance can review submissions; IT can read approved/published versions. Direct client mutations are revoked. RPCs enforce transitions and record inbox messages and history in a single transaction. Page content and company copy are snapshotted at submission. One pending submission per advisor is enforced with a unique index. Returning a request requires feedback.

Images are versioned inline as data URLs for this first implementation. The UI accepts JPG, PNG, and WebP up to 2 MB each; the complete JSON has a 6 MB database limit. Dedicated object storage can replace inline data without changing workflow semantics.

Password recovery, account invitation UI, and email notifications are not included yet. The portal's Supabase login is separate from the existing intentionally shared automation dashboard. Production mode cannot activate the demo through its query parameter.

## Validation

Workflow guard tests: `npm test -- lib/advisor-portal`.
Navigation and indexing tests: `npm test -- lib/workspace-nav.test.ts lib/seo/indexing.test.ts`.
TypeScript: `node node_modules/typescript/bin/tsc --noEmit --incremental false`.

A browser walkthrough verified submission, returned feedback in the advisor inbox, resubmission, approval, Keith's manual publication confirmation, reload persistence, mobile width, and live preview updates using the existing template. The full handoff walkthrough uses demo data; Katie’s authentication and draft permissions were also verified against the connected Supabase backend.
