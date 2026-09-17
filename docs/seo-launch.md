# Keybase SEO / GEO implementation handoff

Updated September 9, 2026. Source project: `/Users/taeheeeum/Desktop/keybase-automation-web`.

The checklist is **not fully complete** and the site has **not been deployed or switched to the production domain**. The workbook distinguishes local implementation, partial work, configuration, review and post-launch work. A template, configuration token or planned article is not evidence of a completed launch or campaign.

## Implemented in the project

- Production-only indexing, fixed production canonicals, staging/internal noindex, robots and dynamic sitemap, explicit 301 redirects for 16 service duplicates and 13 observed legacy paths, canonical navigation and trailing-slash handling.
- Shared title/description, Open Graph/Twitter metadata and branded share image endpoint; breadcrumb schema, company/person/article foundations and genuine job/location structured data.
- Public routes: `/search`, `/tools/compound-interest-calculator`, `/locations/richmond-hill`, `/media`, `/privacy`, `/complaints`, `/accessibility`, and noindex `/contact/thank-you`.
- Search covers published services, articles, profiles, the verified location and calculator. Search results are not indexable.
- Calculator methodology, assumptions, formula, worked example, FAQs, accessible input/slider/switch names and planning links. Verified example: $10,000 initially plus $100 at the beginning of each month, 6% nominal annual return compounded monthly, one year → **$11,856.50**.
- Homepage Find an Advisor CTA; service resource links; contextual related services for CMS articles; visible server-rendered statistics retained at the user's instruction; reduced-motion/reveal safeguards and stronger mobile hero contrast.
- Contact, advisor application and careers endpoints now cap/validate input, reject foreign origins, rate-limit locally, avoid logging PII, time out forwarding and report failure honestly. Contact success has its own confirmation URL. No external test inquiries were sent.
- Consent-gated GA4 integration runs only on the final production origin, with query-free page locations and origin-only referrers. Event names cover contact starts/leads, advisor/profile, telephone/email, calculator and article-to-service/advisor interactions.
- Google/Bing verification-token support. Production-only IndexNow key endpoint and CMS publication notifications. Failures do not roll back successfully saved content.
- Confirmed job openings can have real posting/closing dates, city/province, individual `/careers/[id]` pages and JobPosting schema. Expired/hidden openings are excluded dynamically. Legacy undated entries do not acquire invented dates/schema.
- CMS hardcoded credentials/default secret removed. The CMS now verifies scrypt hashes, requires a private session secret, signs random sessions, enforces expiry on the server and rate-limits sign-in.
- Authenticated `/website-admin-cms/seo`: configuration indicators, published-content source/review-date queue and monthly SEO/GEO measurements with JSON import/export. Measurements are manually entered; there is no live analytics connection. Entries remain in page memory until exported.
- Footer now exposes verified head-office contact details and real legal/help destinations; generic social platform homepages and empty legal links are omitted.

## Verification

- Production webpack build and TypeScript check completed in an isolated copy without production database credentials.
- 101 targeted tests passed: SEO/indexing/schema, form validation/delivery failure, IndexNow isolation, calculator mathematics, job expiry, CMS authentication and content normalization/authorization.
- Expanded local crawl: **38 indexable pages**, **60 redirect variants**, no broken internal links, no recorded title/description/canonical/H1 failures; four classes of missing URL returned real 404 responses.
- Mobile calculator and search checked at 390 × 844: no horizontal overflow; edited contribution recomputed results; RRSP search returned matching services and remained noindex.
- Scoped lint completed. Broader repository sweep also exposed three failures outside this change: one Keybase Answer cache expectation and two document-title classification expectations; 19 database-dependent tests skipped. These are not reported as passing. The first full sweep additionally found the calculator example mismatch, which was fixed and retested.
- Local tests use seeded CMS fallback data. Production CMS completeness, actual recipients, analytics collection, field Core Web Vitals, real-device accessibility and full legacy migration data remain to verify.

## Configuration required before launch

Use the hosting secret store; do not place credentials in source control or chat. `.env.example` documents the new keys.

| Setting | Required value or action |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://www.keybase.com` |
| Deployment mode | Vercel production, or `SITE_DEPLOYMENT_ENV=production` on other hosting |
| `SEO_INDEXING_ENABLED` | Do not set to `false` at launch; use `false` for emergency deindexing |
| `CMS_ADMIN_EMAIL` | Authorized website CMS administrator email |
| `CMS_ADMIN_PASSWORD_HASH` | scrypt hash from the repository's password-hash utility; keep private |
| `ADMIN_SESSION_SECRET` | Unique random secret of at least 32 characters |
| `CONTACT_INQUIRY_WEBHOOK_URL` | Verified contact-inquiry receiver |
| `ADVISOR_APPLICATION_WEBHOOK_URL` | Verified recruiting receiver, or documented contact receiver fallback |
| `CAREERS_APPLICATION_WEBHOOK_URL` | Verified careers receiver with private document handling |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | Actual GA4 web-stream measurement ID |
| `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` | Actual verification tokens, where HTML verification is used |
| `INDEXNOW_KEY` | Valid key; check `/indexnow-key.txt` on the final domain |
| `GPTBOT_POLICY` | Optional `block`; separate policy from OAI-SearchBot search visibility |

**CMS login now fails closed until its administrator configuration exists. Old CMS sessions are invalid.** Do not deploy without configuring this and checking the authorized administrator can sign in. Configure a shared edge rate limit for public forms/sign-in; the built-in limiter is per process. Resume file checks do not replace malware scanning or a private retention/access policy at the receiving system.

## Remaining implementation and content work

1. Complete the old-site inventory using Search Console, the old sitemap, traffic/backlink exports and still-used PDFs. The workbook's 30 mappings are a partial observed inventory, not a complete migration export.
2. Complete financial editorial publication/reviewer integration. The existing content CMS supports draft saving/submission and authorization types, but a complete review/publish lifecycle and article-specific IndexNow trigger were not established by this pass. Do not treat the presence of status fields as proof that this workflow is finished.
3. Provide a verified advisor roster, credentials, languages, biographies, permitted specialties, meeting links, photos, and actual offices/hours. The head-office page is real; other city pages were deliberately not invented.
4. Write and professionally review substantive articles, account expansions (including RRIF and applicable locked-in accounts), comparison tables and remaining account/product FAQs. The 73-row keyword plan is a production backlog, **not 73 published articles**.
5. Complete image/performance optimization and audit all CMS-driven content, mobile breakpoints, keyboard/screen-reader behavior and contrast. The local checks do not constitute a full WCAG or Core Web Vitals certification.
6. Add approved Terms and remaining legal disclosure text. Existing privacy/complaint text was reused; its currency and completeness need company/legal confirmation. Verify the retained company LinkedIn destination and any additional official profiles.
7. Connect/configure actual analytics and search accounts. GA4 enhanced measurement must not independently collect form data or raw sensitive URL parameters; check its settings alongside these custom events. Validate consent acceptance, refusal and withdrawal before collecting real traffic.
8. Finish article/advisor deployment notifications and durable IndexNow retry operations. Current CMS publication hooks cover the resources handled by that CMS; no notification was sent during this work.
9. Complete dependency, upload-processing and hosting/security review before domain migration. Source-level HTTP security headers are not a substitute for HTTPS/SSL configuration at the hosting edge.

## Launch and operating sequence

### Before domain switch

- Export and preserve existing site URLs, traffic, backlinks and PDFs. Reconcile every high-value URL in the migration map, retaining relevant destinations and removing chains/loops.
- Configure credentials, delivery and analytics in preview. Keep preview noindex. Confirm real receipts using a designated test recipient and authorized test submission.
- Obtain recorded compliance approval for financial statements, account rules, calculations, dates, author/reviewer credentials and retained company statistics.
- Crawl the release candidate with the real published CMS dataset. Verify image alt text, headings, single canonical URLs, sitemap membership, 404s and social previews. Measure mobile performance under a documented device/network profile.
- Connect SSL and the preferred domain. Configure HTTP/non-www redirects at the edge so they land directly at the final canonical destination; verify with actual response headers.

### Launch day

- Check production index/follow, staging noindex/nofollow, canonical host, sitemap, core pages, old→new 301s, schema, consent, approved form receipts and administrator login.
- Verify the Search Console domain property and Bing property; submit the production sitemap; inspect homepage, major services, advisor directory and priority articles. A configured HTML token alone does not prove account verification.
- Configure GA4 key events and referral groups. Record the deployment identifier, launch time, baseline traffic and rollback owner. Keep old redirect rules long-term.

### Days 1–7

Review daily: new 404/5xx errors, failed redirects, sitemap discovery, crawl/indexing exclusions, selected canonicals, organic landing-page traffic, important migrated URLs and real form delivery. Use Search Console/Bing exports rather than invented index counts. Investigate unexpected declines against comparable dates and previous traffic levels. No recurring automation was scheduled before a launch date exists.

### Days 8–30: first five article briefs

All are **planned**, with author/reviewer/approval still unassigned. Each needs a direct answer, substantial explanation, a realistic labelled example, limitations, current citations, related service/article links and an advisor CTA.

| Priority brief | Required original contribution | Primary reference to verify during drafting | Service link |
|---|---|---|---|
| How much money do I need to retire in Canada? | Spending worksheet and multiple explicitly hypothetical household scenarios; no universal target | [FCAC retirement planning](https://www.canada.ca/en/financial-consumer-agency/services/retirement-planning/start-saving-retirement.html) | `/retirement-planning` |
| RRSP vs TFSA for retirement | Comparison table and a qualified advisor's explanation of tax/timing tradeoffs | [CRA RRSP guide](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4040/rrsps-other-registered-plans-retirement.html), [CRA TFSA](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account.html) | `/rrsp`, `/tfsa` |
| FHSA planning for a first home | Eligibility questions and a dated source checklist; confirm rules before citing numeric limits | [CRA FHSA](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account.html) | `/fhsa` |
| RRIF explained | Account transition and withdrawal considerations, with approved examples | [CRA RRIF](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/registered-retirement-income-fund-rrif.html) | `/retirement-planning` |
| How to choose a financial advisor | Genuine first-meeting preparation worksheet and verified scope/fee explanations | [FCAC choosing an advisor](https://www.canada.ca/en/financial-consumer-agency/services/savings-investments/choose-financial-advisor.html) | `/our-advisors` |

Publish only after actual editorial/compliance approval; display actual publication/review dates. Complete verified advisor profiles, inspect query impressions, improve low-CTR titles using sufficient data and link approved articles into services.

### Days 31–90

Select the next 15–25 pieces from the workbook based on real query data and review capacity, rather than committing to 40 thin pages. Build retirement/registered-account coverage first, then investing/estate/insurance. Commission expert interviews and one original research project with a documented sample, questionnaire, consent and methodology. Do not fabricate survey findings, quotations or testimonials. Add further tools only after their models and assumptions are independently reviewed.

For PR/backlinks, prepare a verified spokesperson bio, company fact sheet and reviewed expert commentary. Build a prospect list of relevant industry publications, associations and community organizations; verify editorial contacts, pitch relevance and permission before sending. No outreach messages, profile changes or press claims were made in this task.

### Recurring editorial and measurement work

- Monthly: market/rate commentary and material regulatory changes; monitor broken sources and urgent factual changes.
- Quarterly: tax, benefit and account guidance, top landing pages, comparisons, reviewer coverage and conversion pathways.
- Annually and on announced changes: account limits, tax brackets, government programs, biographies/credentials, company facts and legal notices.
- Record a real reviewer and review completion date; only materially changed articles get a new modification date. Do not reset dates for cosmetic edits.
- Import monthly GA4/GSC/Bing/CRM aggregates into the CMS SEO/GEO screen. Export before navigating away. Separate branded/non-branded/local ranking notes and retain source periods.
- AI referral groups: observed origins for ChatGPT, Perplexity, Copilot/Bing and other identifiable tools. Referral data does not measure all AI citations, and Google AI traffic is not always distinguishable. Record observed citations only with evidence.

IndexNow implementation follows its [official documentation](https://www.indexnow.org/documentation); accepted submissions do not guarantee indexing. GA4 event naming is based on the [official event reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/events).
