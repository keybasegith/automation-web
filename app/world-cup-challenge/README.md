# Argosy / Keybase World Cup Challenge 2026

**Stronger Together: Celebrating Canada Through Sport**

An internal FIFA World Cup 2026 prediction challenge microsite. Participants
register, submit match predictions, take on the Canada Pride Challenge and the
Ultimate Final Prediction, and follow a live leaderboard from June 11 to
July 19, 2026.

> ⚠️ **Internal engagement only.** This platform does **not** process payments or
> issue payouts. The $20 entry fee, pool, prize distribution, and participant
> eligibility are displayed as challenge information and are **subject to
> internal and legal review and approval before launch.**

This feature lives entirely under the **`/world-cup-challenge`** route of the
existing Next.js app and does not modify any other feature.

---

## Routes

| Route | Description | Access |
| --- | --- | --- |
| `/world-cup-challenge` | Public landing page | Public |
| `/world-cup-challenge/register` | Participant sign-up | Public |
| `/world-cup-challenge/login` | Log in | Public |
| `/world-cup-challenge/leaderboard` | Public leaderboard | Public |
| `/world-cup-challenge/tracker` | Daily match tracker | Public |
| `/world-cup-challenge/rules` | Rules & scoring | Public |
| `/world-cup-challenge/predictions` | Match / Canada / Final predictions | Participant |
| `/world-cup-challenge/admin` | Admin overview | Admin |
| `/world-cup-challenge/admin/matches` | Add / edit / delete matches | Admin |
| `/world-cup-challenge/admin/results` | Enter scores, set lock dates & official results, recalculate points | Admin |
| `/world-cup-challenge/admin/participants` | View participants & their predictions, export CSV | Admin |
| `/world-cup-challenge/admin/announcements` | Create / publish announcements | Admin |
| `/world-cup-challenge/admin/exports` | Export leaderboard & participant CSVs | Admin |

---

## Tech stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- **Supabase** — Postgres, Auth (email/password), and Row Level Security

### Architecture notes (intentional decisions)

- **Table prefix.** This Supabase project is shared across several internal
  microsites, so all tables for this feature are namespaced with a `wc_`
  prefix (`wc_profiles`, `wc_matches`, …). The columns match the project
  specification exactly. See the table mapping at the top of the migration.
- **Auth model.** Authentication uses Supabase Auth from the browser (anon key)
  with **Row Level Security as the real security boundary**. The anon key is
  safe to expose; RLS policies enforce who can read/write what, and an
  `is_admin()` SQL helper gates all admin writes. Admin routes are additionally
  guarded in the UI for UX, but security does not depend on the client. This
  keeps the feature self-contained with **no new npm dependencies**.
- **Scoring** is authoritative in the database via the `wc_recalculate_points()`
  SQL function (admin-only, `SECURITY DEFINER`). The client mirror in
  `lib/world-cup/scoring.ts` is for display only.

---

## 1. Environment variables

These already exist in `.env.local` for this project. The feature uses:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
# SUPABASE_SERVICE_ROLE_KEY is NOT used by this feature and is never exposed to the browser.
```

On Vercel, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
in **Project → Settings → Environment Variables**.

## 2. Database setup

In the Supabase dashboard → **SQL Editor**, run the files in order:

1. `supabase/world-cup/migrations/0001_world_cup_challenge.sql` — tables, RLS
   policies, the public `wc_leaderboard` view, and the scoring function.
2. `supabase/world-cup/seed.sql` — placeholder fixtures (including Canada’s three
   group games), sample announcements, and default lock dates. Optional but
   recommended for a populated demo.

> **Email confirmation:** For the smoothest demo, disable email confirmation in
> Supabase → **Authentication → Providers → Email** (“Confirm email” off). New
> sign-ups then get a session immediately and their profile row is created
> automatically. If confirmation stays **on**, the profile is created
> automatically on first login instead.

## 3. Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000/world-cup-challenge>.

## 4. Create the first admin

1. Register a normal account at `/world-cup-challenge/register` (or create a
   user in Supabase → **Authentication → Users**, then log in once so the
   profile row is created).
2. In Supabase → **SQL Editor**, promote that account to admin:

   ```sql
   update public.wc_profiles
   set role = 'admin'
   where email = 'you@example.com';
   ```

3. Log out and back in. The **Admin** link now appears in the navbar and
   `/world-cup-challenge/admin` is unlocked.

## 5. Running the challenge (admin workflow)

1. **Matches** → add/edit fixtures (the seed provides a starting set).
2. **Results** → map Canada’s three group games, set the Canada & Final lock
   dates, and (later) record the official finalists/champion.
3. As games finish, **Results** → enter each score and **Mark final**.
4. Click **Recalculate points** to refresh everyone’s scores and the leaderboard.
5. **Announcements** → publish daily updates / weekly recaps.
6. **Exports** → download the leaderboard and participant list as CSV.

---

## Scoring summary

**Match predictions**
- Exact score: **8 pts** (goal-difference bonus not added on top)
- Correct result only (winner/draw): **3 pts**
- Correct goal difference: **+2 pts**

**Canada Pride Challenge** (per group game)
- Correct Canada result: **5 pts** · correct Canada score: **5 pts** · correct opponent score: **5 pts**
- Correct total Canada goals scored (3 games): **10 pts**
- Correct total Canada goals conceded (3 games): **10 pts**

**Final prediction**
- One correct finalist: **10 pts** · both correct finalists: **25 pts** · correct champion: **30 pts**

---

## Deploy to Vercel

1. Push the repository to GitHub.
2. Import the project into Vercel (framework auto-detected as Next.js).
3. Add the two `NEXT_PUBLIC_SUPABASE_*` environment variables.
4. Deploy. The challenge is live at `https://<your-deploy>/world-cup-challenge`.

No build configuration changes are required — the feature is part of the
existing Next.js app and ships with it.
