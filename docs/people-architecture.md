# People and profiles

One record per person, one URL per person, one place to change either.

## Why this exists

Before this, the same seven leadership biographies existed three times: in the
CMS seed (`lib/cms/seeds.ts`), in a fallback list inside
`app/key-executives/page.tsx`, and again in the persisted store
(`data/cms/executives.json`). Nothing kept them in step, and articles carried
their author as a loose `{ name, title }` string, so an article could describe
someone differently from their own page.

## The model

`lib/people/types.ts` defines `PersonProfile`, and `lib/people/people.ts` holds
the registry. A person is one record with a stable id; the roles they hold are a
list (`profileTypes: ["leadership" | "advisor" | "author" | "reviewer"]`), so
someone who leads a department, writes an explainer, and reviews someone else's
is still one record.

Ownership is split:

| Owns | What |
| --- | --- |
| CMS (`/website-admin-cms`) | Editable leadership content: title, lead, paragraphs, portrait, visibility |
| Registry (`lib/people/people.ts`) | Identity and everything the CMS has no field for: the id, roles, credentials, expertise, professional links |
| `lib/people/leadership.ts` | Merges the two into one `PersonProfile` per person |

The registry also seeds the CMS, so a fix here reaches the seed, the leadership
page's fallback, and every profile at once. If the store cannot be read, the
registry's own copy stands in.

## Profile URLs

Profiles live at **`/people/<slug>`** — one canonical route for everyone.

The alternative was a route per role (`/leadership/<slug>`, `/advisors/<slug>`),
which was rejected because a person can hold several roles at once. An advisor
who joins the leadership team would either need two URLs for one person — a
duplicate entity, and the exact problem this task set out to remove — or a
redirect and a lost URL. A role-neutral path survives the change.

The advisor directory that comes later gets its own **index** (the existing
`/our-advisors`), and links into `/people/<slug>` for each advisor. The index is
a listing; the profile is the entity. Only the entity needs a canonical URL.

Rendering is dynamic (`export const dynamic = "force-dynamic"`), matching
`/key-executives`, because leadership content is CMS-editable and staff expect
an edit to appear immediately. Which slugs exist is decided by the registry, not
by the URL: anything else calls `notFound()`.

## Advisors

Advisors are the same `PersonProfile` records, with `profileTypes` containing
`"advisor"` and an optional `advisor` block for what is genuinely particular to
practising — office, city, province, service areas, client types, contact
details, booking link, whether they are taking new clients. Everything an
advisor shares with a leader or an author — portrait, biography, credentials,
languages, `areasOfExpertise` — stays on the record itself, so nothing is
duplicated and a person who is both is still one record.

`areasOfExpertise` is deliberately the only expertise field. An advisor's
"areas of focus" and an author's `knowsAbout` are the same claim about the same
person; a second `specialties` field beside it would only let the two disagree.

**Directory: `/our-advisors`** — the existing route, kept. It is already in the
navigation under Our Team, and it already carries the network hero and the
coast-to-coast map. A second `/advisors` route would have split the same page in
two. The advisor list is a section beneath the existing hero.

**Profiles: `/people/<slug>`** — advisors reuse the canonical person route
rather than getting `/advisors/<slug>`. A dedicated advisor path reads better in
isolation, but it would give an advisor who joins the leadership team two URLs
for one person, which is the duplication the route was chosen to avoid in the
first place. The directory is the advisor-intent surface; the profile is the
entity. Only the entity needs a canonical URL.

### Filters appear when the data can support them

`directoryControls()` in `lib/people/advisors.ts` decides what the directory
renders. A facet is offered only when at least two advisors carry the field
**and** it has at least two distinct values — a filter that isolates one person
is a link to that person, and a filter whose every option returns the same list
is a control that does nothing. Search appears only once the roster passes
`MIN_ADVISORS_FOR_SEARCH`, below which every advisor is on screen anyway.

Today no facet clears either bar — no advisor has language data and all seven
work out of the same office — so the directory renders the plain server grid
with no controls at all. Add the data and the controls appear on their own.

Filter state stays in component state and never reaches the URL. `?province=ON`
and friends would turn every combination of controls into another crawlable
page, which is precisely the programmatic sprawl the directory is meant not to
create. Curated location or language pages, if they are ever warranted, are a
separate decision made against real coverage.

## The thin-profile guardrail

`isProfileReady()` in `lib/people/people.ts` decides who gets a page: an
approved biography of at least two paragraphs **and** a published portrait. A
name and a job title is a byline, not a profile.

Six of the seven leadership records clear it. Linda Yang does not — no portrait
has been published for her, and the leadership grid shows a "Coming Soon" tile —
so `/people/linda-yang` is a 404, and her name appears without a link. Publish a
portrait and the page appears with no other change.

**No advisor clears it.** Not one of the seven has published prose about
themselves anywhere in the repository, so every `/people/<advisor-slug>` is a
404 today. They are listed in the directory, where a name, a title, a portrait
and a way to get in touch is a complete and honest card — it is only a *page*
about a person that needs more than that. Supply a biography for an advisor and
their profile appears, related services and all.

## Articles

An article names people by id (`authorId`, `reviewerId`), never by name.
`lib/insights/attribution.ts` resolves those to a byline — name, title, and a
profile link only where a profile exists — and filters the other way for the
"Articles Written" / "Articles Reviewed" sections on a profile. The relationship
is recorded once, on the article; neither list is maintained by hand.

## What is deliberately empty

`credentials`, `areasOfExpertise`, `languages`, and `professionalProfiles` are
fields on the model with no values in it. The site publishes none of these for
anyone, and none of them can be inferred: a Chief Compliance Officer is not
thereby a CFP, and "leads the firm's technology systems" is not an expertise
taxonomy. They render only when the Keybase team supplies real content —
sections with nothing in them do not appear at all.

The advisor-directory fields (`location`, `specialties`, `clientTypes`,
`contact`) are the same: shaped, unpopulated, and waiting for that task.
