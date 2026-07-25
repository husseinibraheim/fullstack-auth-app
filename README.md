# fullstack-auth-app

User authentication module — sign up, sign in, and a protected application page.

NestJS + MongoDB on the back end, React + TypeScript on the front end.

## Overview

Three screens and four endpoints:

| Screen | Route |
| --- | --- |
| Sign up | `/signup` |
| Sign in | `/signin` |
| Application page | `/app` (protected) |

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `POST /api/auth/signup` | public | Create an account, return a token |
| `POST /api/auth/signin` | public | Exchange credentials for a token |
| `GET /api/auth/me` | **bearer** | Current user — the protected endpoint |
| `GET /health` | public | Readiness probe (pings MongoDB) |

Authentication is a stateless HS256 JWT valid for one hour, sent as
`Authorization: Bearer <token>`.

## Tech Stack

**Back end** — NestJS 11, MongoDB 7 via Mongoose 9, Passport JWT, bcrypt,
class-validator, `@nestjs/throttler`, helmet, Swagger.

**Front end** — React 19, TypeScript, Vite, React Router 7, react-hook-form +
zod, axios.

## Prerequisites

- Node.js 20 (see `.nvmrc`)
- Docker, for MongoDB

## Getting Started

The two projects are independent — separate `package.json` files, separate
installs, no workspace tooling. Run each in its own terminal.

### 1. Database

From the repository root:

```bash
docker compose up -d --wait
```

MongoDB 7 on `localhost:27017`, with a named volume so data survives restarts.
`--wait` blocks until the container is genuinely accepting connections, not
merely started.

### 2. Back end

```bash
cd server
npm install
cp .env.example .env
# Generate a secret and paste it into JWT_SECRET:
openssl rand -base64 48
npm run start:dev
```

Runs on `http://localhost:3000`. Swagger UI at
[http://localhost:3000/docs](http://localhost:3000/docs).

The app **refuses to start** if `JWT_SECRET` is missing or shorter than 32
characters. That is deliberate — see Accepted trade-offs.

### 3. Front end

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Runs on `http://localhost:5173`.

## Environment Variables

### `server/.env`

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | |
| `PORT` | no | `3000` | |
| `MONGO_URI` | **yes** | — | Matches `docker-compose.yml` |
| `JWT_SECRET` | **yes** | — | Minimum 32 characters, no fallback |
| `JWT_EXPIRES_IN` | no | `1h` | The only revocation mechanism |
| `CORS_ORIGIN` | **yes** | — | Exact origin, never `*` |
| `BCRYPT_ROUNDS` | no | `12` | Lower in tests for speed |

Validated by a zod schema at boot. A missing or malformed value aborts startup
with a message naming the variable — never its value, so secrets cannot reach
the logs.

### `client/.env`

| Variable | Notes |
| --- | --- |
| `VITE_API_URL` | Defaults to `http://localhost:3000/api` |

`VITE_*` variables are inlined into the production bundle at build time and are
therefore **public**. Never put a secret behind that prefix.

## API Reference

Swagger UI at `/docs`, machine-readable spec at `/docs-json`. Every endpoint
documents its request DTO, success shape, and every status code it can return.

All failures share one envelope:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": { "password": ["password must contain at least one number"] },
  "requestId": "e88edb65-1be5-4257-9f76-388ddbb42d7c",
  "timestamp": "2026-07-24T15:56:49.506Z",
  "path": "/api/auth/signup"
}
```

`errors` appears **only** on 400s and maps each field to every unmet rule, so
the client renders them against the offending input. A 500 returns a generic
message with no stack or driver details; the `requestId` correlates it with the
full error in the server log.

## Project Structure

```
server/src/
  auth/          DTOs, service, controller, JWT strategy, guard
  users/         schema, service (owns bcrypt), normalisation
  common/        error filter, decorators, password rules, error DTO
  config/        env schema, validated at boot
  health/        readiness probe
client/src/
  api/           axios instance + typed endpoints
  auth/          context, provider, token storage
  components/    ProtectedRoute
  pages/         SignUpPage, SignInPage, AppPage
  validation/    password rules (twin of the server's copy)
  forms/         server-error → form-field mapping
```

`UsersModule` has no controller by design: the only user-facing read is
`/auth/me`, which belongs to `AuthModule` alongside the guard and strategy.

## Architecture Decisions

**Feature-based modules, not Clean/Hexagonal.** With one domain entity and four
endpoints, a repository interface wrapping two Mongoose calls plus one-line
use-case classes would be ceremony with no payoff. Nest's own module boundaries
already give feature separation. Hexagonal architecture earns its keep when the
persistence choice is deferrable — here MongoDB is a fixed requirement, so the
indirection would insure against a change the spec excludes.

**Password rules are checked separately, not as one combined regex.** A single
lookahead gives one message ("password is invalid"); four separate checks let a
rejection name every unmet requirement at once, which is also what makes the
signup checklist possible.

**Email uniqueness is a database index, not an application check.** A
find-then-insert races; the unique index cannot. The resulting `E11000` driver
error is translated to a clean `409` at the service boundary.

**The password hash has two independent guards.** `select: false` keeps it out
of query results, and a `toJSON` transform strips it during serialisation —
because the login path *deliberately* re-selects it, so the first guard is
knowingly bypassed on a live code path.

**The JWT guard is global with an explicit `@Public()` opt-out.** A new endpoint
that nobody thought about fails closed rather than open.

**The rate-limit guard is registered before the auth guard.** A flood is
rejected before it costs signature verification. Both are declared in one array
in `AppModule` so the order is explicit rather than an artefact of module
resolution.

**The JWT strategy performs no database lookup.** The guard stays stateless;
`/auth/me` is the single handler that reads the database, and it answers `401`
rather than `404` when the account is gone — the credential is what is invalid,
not the resource that is missing.

## Accepted Trade-offs

These are decisions, not oversights. Each has a cost, stated plainly.

### Stateless JWT with a sliding session — no revocation

Nothing about a session is stored server-side. A token is valid until its `exp`
regardless of what happens to the account afterwards: delete the user and their
token still passes the guard until it expires.

**Sliding expiration.** A near-expiry token is re-issued on an active request
(when less than `SESSION_RENEW_WITHIN` of life remains) and returned in the
`X-Renewed-Token` response header; the client swaps it into storage. An active
user is therefore never logged out mid-session, while an idle one is dropped
after `JWT_EXPIRES_IN`. The re-issued token carries the original login time
(`sessionStart`), so renewal stops at `SESSION_ABSOLUTE_MAX` after login — a
session cannot slide forever.

**The security cost, stated plainly:** this is still stateless, so there is
still no revocation. Sliding *widens* the exposure of a stolen token — as long
as an attacker keeps using it, it renews — but only up to the absolute cap,
which is exactly what that cap exists to bound. Logout remains client-side and
cannot invalidate a token server-side before it expires.

**What production would add:** refresh tokens with rotation and reuse detection,
plus revocation on logout and password change. That was deliberately out of
scope — done properly it reintroduces exactly the server-side state the
stateless design avoids, and done improperly (a long-lived refresh token nobody
can revoke) it is strictly worse than what is here. The `User` schema carries a
one-line comment marking `tokenVersion` as the insertion point.

### Token in `localStorage`, not an httpOnly cookie

The token is readable by any script on the origin, so a cross-site scripting
flaw becomes token theft — and a stolen token works from anywhere until it
expires.

**Why it is tolerable at this surface area:** XSS risk is a function of what the
application renders. This one is three forms with no `dangerouslySetInnerHTML`,
no user-generated content rendered as markup, no third-party script tags, and a
short dependency list, with React escaping by default. The one-hour lifetime
bounds the damage window.

**What it buys:** no CSRF surface at all — an `Authorization` header must be set
deliberately by JavaScript, and a cross-site form post cannot add one. An
httpOnly cookie would have forced CSRF defence, `SameSite` configuration, and
cross-origin cookie handling between two origins in development. It is also
worth being precise about what httpOnly actually buys: it prevents a script from
*reading* the token, but not from *using* the session, since the cookie attaches
automatically to requests the injected script makes.

**Note:** the strongest additional mitigation would be a Content-Security-Policy,
which must be served with the SPA's HTML by whatever hosts the static build —
not by this API. Helmet on a JSON API does not cover the front end.

### Per-IP rate limiting does not stop distributed attacks

Limits are 5/60s on sign-in, 10/hour on sign-up, and 100/60s globally, tracked
per IP. An attacker rotating IP addresses gets the full allowance from each one,
so this does not stop distributed credential stuffing against a single account.

**What production would add:** a per-account attempt counter with progressive
backoff, in addition to the per-IP limit.

**Two deployment caveats.** The throttler's storage is in-memory, so limits are
per process — three replicas means three times the effective limit, and a real
deployment needs Redis-backed storage. And behind a load balancer, Express must
be configured to trust the proxy, or every user shares one bucket and the first
five failed logins lock out everyone.

### Sign-up's 409 is a user-enumeration channel

Sign-in gives nothing away: unknown email and wrong password return the same
`401` with the same message, never a `404`. Sign-up cannot do the same — a
duplicate email must be reported, and its `409` confirms that an address is
registered to anyone who asks.

This is accepted rather than mitigated. Closing it properly requires an
email-verification flow — accept every sign-up optimistically and disclose
nothing until the address is confirmed — which is well outside this scope.

Worth recording: an earlier draft added a dummy bcrypt comparison on the
unknown-email path to close the *timing* side channel on sign-in. It was
removed, because defending a covert channel while the overt one stays open is
inconsistent rather than defence in depth. See `AI.md`.

### There is no `POST /auth/logout`

Logging out clears the token from `localStorage` and resets client state. No
request is sent, because there is nothing a server endpoint could do: no session
is stored, so the token remains cryptographically valid until it expires.

An endpoint returning `204` was deliberately **not** shipped. It would advertise
server-side invalidation that does not happen — anyone reading the route list or
the Swagger page would reasonably conclude sessions are revoked. Under this
design, "clear the token and redirect" is the complete and correct
implementation, not a stub.

## Testing

Not yet implemented — the highest-value cases would be: sign-up returns a token
with no `passwordHash` in the response, duplicate email yields `409`, wrong
password yields `401`, and one end-to-end chain of sign-up → use token → `/me`
`200` → `/me` without a token `401`.

Behaviour was verified manually against a running stack, including the full
browser flow (sign-up, refresh persistence, wrong-password handling, logout, and
the protected-route redirect).

`npm test` currently exits non-zero with "no tests found".

## Scripts

### `server/`

| Command | Purpose |
| --- | --- |
| `npm run start:dev` | Watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled build |
| `npm run lint` | ESLint (type-checked) |
| `npm test` | Jest unit tests |
| `npm run test:e2e` | Jest end-to-end tests |

### `client/`

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check and build |
| `npm run preview` | Serve the production build |
| `npm run lint` | oxlint |
