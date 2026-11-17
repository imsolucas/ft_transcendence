---
description: Security rules for auth, sessions, tokens, cookies, API keys, WebSockets, service-to-service calls, secrets, nginx and Docker. Apply before adding or changing any of those. Lists the known Phase 0 findings so they are not reintroduced.
paths:
  - "services/users/src/**"
  - "services/game/src/**"
  - "services/api-gateway/**"
  - "infra/**"
  - "services/frontend/src/utils/**"
  - "services/frontend/src/router/**"
  - "apps/web/**"
---

# Security hardening

## 1) Secrets

- Secrets (`JWT_SECRET`, `COOKIE_SECRET`, `INTERNAL_SERVICE_TOKEN`) are read once in
  `src/config.ts`, and the process **refuses to boot** if one is missing or shorter than
  32 bytes. Required non-secret config (`DATABASE_URL`, `ALLOWED_ORIGINS`) also fails fast.
  `GOOGLE_CLIENT_ID` is optional: Google sign-in answers 503 without it. No fallback
  values in code, ever.
- New secret → add it to `infra/.env.example` with a placeholder and a generation hint
  (`openssl rand -base64 48`). Never put a real value in code, tests, docs or the README.
- Compare secrets with `crypto.timingSafeEqual` on equal-length buffers, never `===`.
- Random tokens come from `crypto.randomBytes` / `randomUUID`, never `Math.random`.

## 2) Sessions and tokens

- Access token: JWT, **≤ 15 min**, signed HS256 with `JWT_SECRET`, verified with an explicit
  `algorithms: ["HS256"]`. Claims: `sub` (user id), `jti`, `iat`, `exp`, plus `id` and
  `username`, which stay only while the legacy frontend decodes them (drop in Phase 1).
  Email and other PII stay out of it. Challenge tokens carry `purpose` and are refused as
  access tokens. Helpers: `services/users/src/auth/tokens.ts`; the game verifies with
  `services/game/src/auth/accessToken.ts`.
- Refresh token: opaque random value, stored as **SHA-256 hash** in `RefreshToken`, rotated on
  every use. A reused (already-rotated) refresh token revokes that user's whole token family.
- Browser transport: `httpOnly; Secure; SameSite=Lax; Path=/` cookies. Refresh cookie
  `Path=/auth`. Tokens are **never** stored in `localStorage`/`sessionStorage` and never put in
  a URL.
- Cookie-authenticated state-changing routes need CSRF protection: `SameSite=Lax` plus an
  `Origin` check against the configured origin (or a double-submit token).
- Logout revokes the refresh token and blacklists the access `jti` until its `exp`. Look the
  blacklist up by `jti` (or SHA-256 of the token) with a unique index. **Never bcrypt-scan.**
- Passwords: bcrypt cost ≥ 12 (or argon2id). Login errors stay generic ("Invalid username or
  password") and run in constant-ish time even for unknown users.
- 2FA and Google "set a password": the step after the first factor is bound to the browser
  by a short-lived signed httpOnly challenge cookie (`twofa_challenge`, `setpw_challenge`,
  `Path=/auth`). A body `userId` is never trusted on its own, and both steps are rate limited.
- Logout chooses whose session to end from a **signature-verified** token (expiry
  tolerated), never from `jwt.decode`.
- Rate limits key on `req.ip`, which is only the real client because Fastify runs with
  `trustProxy: 1` behind nginx. Don't remove it, and don't add a second proxy hop
  without raising it.

## 3) API keys (public API)

- Format `ft_<prefix>_<secret>`. Store `prefix` (indexed) + SHA-256 of the full key. Look up by
  prefix, compare hashes in constant time. Show the key once, on creation.
- Rate limits per key and per IP. `lastUsedAt` updates are throttled (not on every request).

## 4) Service-to-service

- Internal routes (`/game/match-result`, `/game/tournament-result`, anything only the game
  service calls) require `Authorization: Bearer <INTERNAL_SERVICE_TOKEN>`, compared in
  constant time, and are refused if the header is missing, even inside the Docker network.
- Never route internal paths through nginx. If you add one, add an explicit `location`
  that returns 404 for it at the gateway.
- Writes from the game service carry an idempotency key (`matchId`); the users service
  ignores duplicates.

## 5) WebSockets

- Authenticate **at upgrade** (cookie or a short-lived single-use WS ticket from
  `POST /auth/ws-ticket`). The server sets player identity from the verified token. Client
  fields such as `playerId`/`playerName`/`picture` in the connection message are ignored or
  only used as display hints after a server-side lookup.
- Check `Origin` on upgrade against the allowed origin.
- Every inbound message: size cap (e.g. 4 KB), JSON parse in try/catch, schema-validated
  `type` + payload, per-connection rate limit. Unknown types are dropped and logged at debug.
- Debug or introspection endpoints (room dumps etc.) are removed or require an admin
  credential, and are never routed by nginx.

## 6) HTTP surface

- CORS: an explicit allow-list from env (`ALLOWED_ORIGINS`), `credentials: true` only
  with a concrete origin. `origin: true` (reflect any origin) is banned.
- Rate limit auth routes (login, signup, 2FA verify, refresh) per IP and per account.
- Body size limits (`bodyLimit`) on Fastify; avatar uploads check magic bytes and size.
- Swagger UI (`/docs`) is not exposed through nginx in production.
- Outputs never include `password`, `twoFASecret`, token hashes or key hashes. Response
  schemas enforce it.

## 7) Gateway and containers

- nginx: TLS 1.2+/1.3 only, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), a CSP once the Next app exists,
  `server_tokens off`, `limit_req` on `/auth/`, `client_max_body_size`.
- Production compose: built images, no source bind-mounts, no dev servers, containers run as
  a non-root user, only the gateway publishes a port. Dev tooling lives in a separate
  compose override.

## 8) Browser

- No `innerHTML` with any value that came from a user or the API; use `textContent` or the
  framework's escaping. (`utils/sanitize.ts` exists in the legacy app; React removes the need.)
- No secrets in client bundles. `NEXT_PUBLIC_*` / `VITE_*` values are public by definition.

## Known findings (fixed in Phase 0 — do not reintroduce)

1. WS identity trusted from the client `playerId` (`game/src/websocket/MessageHandler.ts`).
2. `JWT_SECRET ?? "dev_secret"` / `COOKIE_SECRET ||` fallbacks (`users/src/app.ts`, `authControllers.ts`).
3. 30-day JWT as the only session, kept in `localStorage`. Now a 15-minute access token +
   rotating refresh in httpOnly cookies. The legacy app still mirrors the access token in
   `localStorage` until Phase 1 deletes it.
4. bcrypt scan over all blacklist rows / API keys (`users/src/app.ts`, `middleware/apiKeyAuth.ts`).
5. `POST /game/match-result` / `tournament-result` unauthenticated.
6. `#region agent log` blocks writing to a hardcoded host path (`users/src/app.ts`).
7. Room-dump debug endpoint in `game/src/index.ts`.
8. CORS `origin: true` with credentials (`users/src/app.ts`, `game/src/index.ts`).
9. `POST /auth/set-password` took a bare `userId` and returned a session: account
   takeover of any Google account that had no password yet.
10. `POST /auth/verify-2fa` took a bare `userId` with no throttle.
11. `POST /auth/logout` used unverified `jwt.decode` to pick whose status to set OFFLINE.
12. Controllers returned `error.message` from exceptions to the client.

Still open: the single dev-mode compose is the only deploy path (moved to Phase 4, with
the production Dockerfiles for `apps/web`). A Content-Security-Policy arrives with
`apps/web`. HSTS waits for a real domain.

## Before a security change ships

- Re-read the diff against every section above.
- `grep -rn "dev_secret\|origin: true\|localStorage\|Math.random\|agent log" services/` on touched dirs.
- Exercise the refusal path, not just the happy path (missing cookie, expired token, wrong
  internal token, reused refresh token, oversized WS frame) and say what you saw.
