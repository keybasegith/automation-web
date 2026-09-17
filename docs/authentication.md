# Dashboard authentication

Server-verifiable sessions for the internal automation dashboard. Replaces the
`localStorage.getItem("isAuthenticated")` check, which was a UI convenience the
server never saw and therefore never enforced.

**Interim mechanism, pending company SSO.** See the last section for what SSO
replaces.

## The three auth systems in this repo

They stay separate, following the reasoning already recorded in
`lib/content/session.ts`: one cookie doing several jobs means one bug hands out
several grants.

| System | Cookie | Grants |
| --- | --- | --- |
| Automation dashboard (this one) | `kb_dashboard_session` | `/dashboard` and the internal tools |
| Website CMS (`lib/admin/auth.ts`) | `kb_admin_session` | `/website-admin-cms` |
| Content authoring (`lib/content/session.ts`) | `kb_content_session` | `/content` at a role |

## Session mechanism

A **stateless signed token** in an httpOnly cookie: `<userId>.<expiresAt>.<hmac>`,
HMAC-SHA256 over the first two segments, compared in constant time. This is the
same construction the content system already uses — proven in this codebase, no
new dependency, no invented cryptography.

Chosen over database-backed sessions because the dashboard has no session table
and `DATABASE_URL` is optional in development: a DB-backed session would make
signing in depend on Postgres being reachable and would need a migration, for a
single internal account. The trade-off is stated under Limitations.

Verified on **every** protected request: signature, expiry, and that the id
still resolves to a configured account.

## Where it is enforced

Two layers, deliberately. The framework's own guidance is that a proxy check is
optimistic and the authoritative check belongs beside the data.

1. **`proxy.ts`** — route-level. Turns away sessionless requests before a page
   renders or a handler runs. In Next 16 this file is `proxy.ts`, not
   `middleware.ts`: the convention was renamed, and the proxy runtime is
   Node.js and cannot be configured, so Node's `crypto` works here.
2. **Beside the data** — `AppShell` (server) for pages, and
   `requireApiUser` / `getSessionUser` / `requireCurrentUser` /
   `requireInternalAiUser` for routes. A mistake in the proxy matcher cannot on
   its own open an endpoint.

Which paths are internal is defined once, in `lib/auth/routes.ts`, and the
tests read the same file.

## Flows

**Login** — `POST /api/auth/login` → verify against the env-configured account
(scrypt, via `lib/content/password.ts`) → issue token → set httpOnly cookie →
return display fields only. Every failure returns the same message; an unknown
email still runs a full hash comparison so timing does not reveal which
addresses exist.

**Logout** — `POST /api/auth/logout` clears the cookie with the same attributes
and `maxAge: 0`. Always succeeds. The client cannot clear the cookie itself,
which is the point of `httpOnly`.

**Current user** — `getCurrentUser()` in `lib/currentUser.ts` is the one
function the app asks "who is this?". It is now async, reads the cookie through
`next/headers`, and returns the user or null. `requireCurrentUser()` throws
`UnauthorizedError` instead.

## Cookie

`httpOnly`, `sameSite=lax`, `secure` in production, `path=/`, `maxAge` 8 hours.
Not readable from JavaScript, and no auth value is exposed to the browser —
nothing here is prefixed `NEXT_PUBLIC_`.

## CSRF

`SameSite=Lax` stops a cross-site POST carrying the cookie. On top of that,
state-changing cookie-authenticated endpoints check the origin
(`isSameOrigin`). That check runs **after** authentication and is CSRF defence
only — a same-origin request from a signed-out browser is still refused.

## Configuration

Generate all three with `npm run auth:hash`.

| Variable | Effect |
| --- | --- |
| `AUTH_SESSION_SECRET` | HMAC key. **Required in production** — without it the server refuses to issue or accept sessions rather than signing with a default key. Rotating it signs everyone out. |
| `INTERNAL_ADMIN_EMAIL` | The single account permitted to sign in. |
| `INTERNAL_ADMIN_PASSWORD_HASH` | scrypt hash of its password. Production sign-in is refused entirely while unset. |

In development only, an unset hash falls back to the long-standing local
password so `npm run dev` works out of the box. That fallback is refused when
`NODE_ENV=production`.

## Limitations

- **No revocation before expiry.** A stateless token stays valid for up to 8
  hours. Rotating `AUTH_SESSION_SECRET` invalidates every session at once and
  is the only kill switch. A session table would fix this properly.
- **One shared account, one role.** `role` exists on the session and the
  finance permission table is real, but everyone who signs in is the same
  person as far as the system is concerned. Audit attribution is therefore
  "the dashboard account", not an individual.
- **No rate limiting on `/api/auth/login`.** Nothing throttles password
  guessing. scrypt makes each attempt expensive, which is not the same thing.
- **No MFA, no password rotation, no lockout.**
- The website CMS cookie (`lib/admin/auth.ts`) is still a static hash with no
  expiry. Out of scope here, and worth the same treatment.

## When SSO arrives

`lib/auth/users.ts` is what it replaces — `findUserById` and
`verifyCredentials` are the only two functions the rest of the system calls.
The session layer, the proxy, the guards, and every route above them are
indifferent to where a user came from.

Then: drop the `INTERNAL_ADMIN_*` variables, map real group membership onto
roles in `getActingFinanceUser` and `lib/forms/roles.ts` (whose `DEMO_USERS`
constants exist only because one account cannot represent several roles), and
consider moving to database-backed sessions for revocation.
