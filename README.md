# ft_transcendence

*This project has been created as part of the 42 curriculum by djin, tjun-yu, amaligno, ghwa.*

Real-time Pong in the browser: accounts, friends, direct messages, online 1v1, private rooms,
king-of-the-hill tournaments, local two-player games, a computer opponent, a leaderboard and
achievements, and a retro CRT / synthwave look. Originally the 42 Common
Core final project; since rebuilt as a personal project (2026) on a modern stack.

---

## Quick start

Requirements: Docker with Compose v2, `make`, `openssl`.

```bash
make            # first run creates infra/.env with generated secrets, then builds and starts
```

Open **https://localhost:8443**. Caddy serves a certificate from its own local CA, so the browser
shows a warning the first time. Accept it, or trust Caddy's root certificate:
`docker compose -f infra/docker-compose.yml cp caddy:/data/caddy/pki/authorities/local/root.crt .`
and import `root.crt` into your OS or browser trust store.

`make` sets `SEED_DEV_DATA=true` in the generated `infra/.env` (`.env.example` keeps it `false`
for deployments), so an empty database gets four dev accounts:

| Username | Password |
|---|---|
| alice | alice-dev-1 |
| bob | bob-dev-22 |
| charlie | charlie-dev-3 |
| donald | donald-dev-4 |

Other commands: `make logs SERVICE=users`, `make down`, `make re`, `make clean-volumes` (deletes
the database), `make ps`.

### Email

Sign-up verification, password reset ("Forgot password?") and GDPR confirmations are sent
over SMTP. `make env` points it at a local **Mailpit** (compose profile `mail`): open
**http://localhost:8025** to read every email the app sends. On a real domain, set `SMTP_HOST`,
`SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` in `infra/.env` and clear
`COMPOSE_PROFILES`. Without `SMTP_HOST` the app still works; emails are skipped and logged.

### Google sign-in (optional)

Create an OAuth client in Google Cloud Console with the redirect URI
`https://localhost:8443/api/auth/callback/google`, then set `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` in `infra/.env` and run `make re`.

### Deploying on a real domain

Set in `infra/.env` (the comments in `infra/.env.example` list them too):
`SITE_ADDRESS=pong.example.com`, `PUBLIC_ORIGIN=https://pong.example.com`,
`TLS_MODE=you@example.com` (Caddy then gets a Let's Encrypt certificate for that address),
`CADDY_HTTPS_PORT=443`, `HTTPS_PORT=443`, `HTTP_PORT=80` and `SEED_DEV_DATA=false`. Once the
domain works, enable HSTS with
`HSTS_HEADER='Strict-Transport-Security "max-age=31536000; includeSubDomains"'`.

---

## Architecture

```
browser ── https://localhost:8443 ──► Caddy (automatic HTTPS, security headers)
                                        ├─ /api/*  ► users  (Fastify, Better Auth, Prisma) ──► Postgres
                                        ├─ /ws     ► game   (Fastify, Socket.IO, game engine) ──► users /internal/*
                                        └─ /*      ► web    (Next.js)
```

| Path | Role | Stack |
|---|---|---|
| `apps/web` | Frontend: landing, sign-in/up (2FA, Google), lobby, online/local/tournament/vs-AI play, profile with achievements, friends, chat, leaderboard, settings (incl. data export and account deletion), status, legal pages; EN/ES/FR | Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4, Radix UI, SWR, Motion, Socket.IO client |
| `services/users` | Accounts and data. Better Auth at `/api/auth/*`, our API at `/api/*`, the public API at `/api/public/*` (API keys), internal routes for the game | Fastify 5, Better Auth 1.7, Prisma 6, Postgres 17, Node 24 (runs TypeScript natively) |
| `services/game` | Authoritative Pong server: matchmaking, rooms, tournaments, 60 Hz simulation, result reporting | Fastify 5, Socket.IO 4 |
| `services/shared` | Game engine, WebSocket protocol types and the HTTP API contract, imported by web and game | TypeScript |
| `infra` | `docker-compose.yml`, `caddy/Caddyfile`, `backup/` scripts, `.env.example` | Docker Compose, Caddy 2.11 |

**One origin.** The browser only ever talks to `https://localhost:8443`, so there is no CORS
configuration. Every state-changing request and the game's socket handshake must carry that
origin.

**Authentication.** Better Auth owns sign-up, sign-in (username or email), Google OAuth, TOTP
two-factor with backup codes, sessions and their httpOnly cookie. Session tokens never appear
in JSON responses. The game service resolves a socket's session through the users service at
handshake and re-checks it every minute, so revoking a session also ends its game connection.

**Game.** Clients send inputs only. The server runs the simulation and streams state. Match
results are posted to the users service with a service token and an idempotency key, so a
retry never records a match twice. Presence (online, in game, offline) comes from live sockets.

**Design.** The CRT / synthwave design system (tokens, components and all screens) lives in a
Claude Design artifact; `apps/web/src/styles/` holds its tokens and component CSS.

### Database

Postgres via Prisma (`services/users/src/db/prisma/schema.prisma`, migrations alongside):

- `Users` — handle (`username`, lowercase), `displayUsername`, email, avatar, presence `status`
- `session`, `account`, `verification`, `twoFactor` — Better Auth (passwords live in `account`)
- `Friendships` (pending/accepted, one row per pair), `Blocks`
- `Matches` (players, display names, scores, winner, timestamps, `externalId` idempotency key),
  `Tournaments`, `TournamentPlayers`
- `ApiKeys` — prefix plus SHA-256 hash; the key itself is shown once
- `Messages` — direct messages (text, game invite, or a server-posted match/tournament notice), read receipts
- `UserAchievements` — achievements, stored the first time they unlock; `Users.xp` / `level`

### HTTP API

The contract between web and users is `services/shared/types/api.types.ts`:
`/api/me` (profile, avatar upload, `/export`, `/delete`), `/api/users/:username` (profile, stats,
achievements), `/api/users/:username/matches` (paginated), `/api/users/search`, `/api/friends…`,
`/api/blocks`, `/api/chat…`, `/api/leaderboard`, `/api/api-keys`, `/api/sessions`, `/api/status`.

**Public API.** Create a key in Settings → API keys and send it as `X-API-Key`. Documentation:
`https://localhost:8443/api/public/docs`. Read endpoints (users, matches, tournaments,
leaderboard, stats) plus endpoints that act as the key's owner: `GET`/`PUT /api/public/me`,
`GET`/`POST /api/public/friends`, `DELETE /api/public/friends/:username`. Limit: 120 requests
per minute per key.

---

## Operations

**Status page.** `https://localhost:8443/en/status` shows the API, database and game server
state and latency (from `GET /api/status`, cached for 5 seconds). The users container's health
check also fails when the database is unreachable, so `make ps` reflects real health.

**Backups.** The `backup` service dumps Postgres (`pg_dump`, custom format) and archives the
uploaded avatars into `./backups/` when it starts and then every `BACKUP_INTERVAL_HOURS`
(default 24, minimum 1), deleting files older than `BACKUP_KEEP_DAYS` (default 7). Files are
written as root with mode 0600 (the dump contains password hashes and 2FA secrets), so copy
them off the machine with `sudo`. A run that fails leaves only a `*.tmp` file, never a
valid-looking backup.

```bash
make backup                         # take one now
make backups                        # list them, newest first
make restore DB=db-<stamp>.dump UPLOADS=uploads-<stamp>.tar.gz
```

**Disaster recovery.**
1. Lost data but the stack runs: `make restore DB=…` stops users and game, drops the schema
   and replays the dump in one transaction (a failure leaves the current data untouched),
   swaps in the avatars if `UPLOADS=` is given, and restarts both services, even when the
   restore fails. A dump older than the newest migration works: the users service re-applies
   the newer migrations on start.
2. Lost the machine: install Docker, clone the repo, put back `infra/.env` (keep a copy of it
   somewhere safe; the secrets in it can't be regenerated without logging everyone out),
   copy the `backups/` folder, run `make`, then `make restore DB=… UPLOADS=…`.
3. Copy `backups/` off the machine regularly (another disk or cloud storage); backups on the
   same disk don't survive that disk.

Restore drills on 2026-11-18: a deleted match row came back (10 → 9 → 10 rows); a dump from
before the achievements migration restored cleanly (the migration was re-applied on start),
then the latest dump brought the current data back (18 matches, 8 achievements).

---

## Development

```bash
# backing services only, then run the apps on the host with hot reload
docker compose -f infra/docker-compose.yml up -d postgres
cd services/users && npm ci && DATABASE_URL=... PUBLIC_ORIGIN=https://localhost:8443 \
  BETTER_AUTH_SECRET=... INTERNAL_SERVICE_TOKEN=... npm run dev
cd services/game  && npm ci && PUBLIC_ORIGIN=... INTERNAL_SERVICE_TOKEN=... USERS_API_URL=http://localhost:4000 npm run dev
cd apps/web       && npm ci && npm run dev
```

Point a Caddy at the host services with `WEB_UPSTREAM`, `USERS_UPSTREAM` and `GAME_UPSTREAM`
(see `infra/caddy/Caddyfile`).

Checks: `cd apps/web && npm run lint && npx tsc --noEmit`, `cd services/users && npm run typecheck`,
`cd services/game && npm run typecheck`. `./test.sh` exercises the public API (`API_KEY=ft_… ./test.sh`).

### Browser support

Tested end to end (pages at 1440 and 375 px, online match, local play, chat, reconnection) with
a clean console in **Chromium** (Chrome, Edge) and **Firefox**. Safari/WebKit has not been tested
yet. Fonts are loaded without preload links because Firefox fetched preloaded fonts twice and
warned about unused preloads.

---

## Status and roadmap

| Phase | Scope | State |
|---|---|---|
| 0 | Security hardening of the original services | Done |
| 1 + 2 | Better Auth, Postgres, Caddy, Socket.IO, the Next.js app and all core screens | Done |
| 3 | Direct messages (typing, read receipts, game invites, blocks), reconnection with a held slot, forfeit, rematch, ready-check deadline | Done |
| 4 | Status page, database-aware health checks, scheduled backups, restore and disaster recovery | Done |
| 5 | Modules of the 42 subject (see below) | In progress |

Known limitations: tournaments are king-of-the-hill rather than a bracket; the court stays
landscape on phones; chat has no docked panel yet (full page only); email verification is sent but
not required to play.

### Subject modules (v21, chapter IV)

| Module | Type | State |
|---|---|---|
| Framework for frontend and backend (Next.js + Fastify) | Major | Done |
| Real-time features (Socket.IO: game, chat, presence, notifications) | Major | Done |
| User interaction (chat, profiles, friends) | Major | Done |
| Public API (API key, rate limit, docs, GET/POST/PUT/DELETE) | Major | Done |
| Standard user management and authentication | Major | Done |
| Web-based game (Pong) | Major | Done |
| Remote players (reconnection, latency display) | Major | Done |
| AI opponent (easy/normal/hard, human-like, uses the game settings) | Major | Done |
| ORM (Prisma) · SSR · design system · 3 languages · 2FA | Minor ×5 | Done |
| OAuth 2.0 (Google) | Minor | Implemented; not tested end to end until `GOOGLE_CLIENT_SECRET` is set |
| Game statistics and match history (with leaderboard and achievements) | Minor | Done |
| Gamification (stored achievements, XP and levels, leaderboard; progress bars, unlock and level-up toasts; rules shown on the profile) | Minor | Done |
| Advanced chat (blocks, invites, game and tournament notifications, profile links, history, typing, read receipts) | Minor | Done |
| Health check, status page, backups and disaster recovery | Minor | Done |
| GDPR (export, deletion with confirmation, confirmation emails) | Minor | Done |
| Additional browsers | Minor | Partial: Firefox done, Safari untested |
| Tournament system | Minor | Partial: king-of-the-hill, no bracket |
| Game customization (speeds, points, 4 court themes, defaults) | Minor | Partial: no power-ups yet |
| Advanced search (name, status and friendship filters, sorting, pagination) | Minor | Done |
| Spectator mode (live public matches, read-only view, live spectator count) | Minor | Done |

Not started; each needs a decision first: blockchain / ICP (ICP conflicts with SSR), LLM, RAG,
recommendations and other AI-service modules (need a provider and API spend), ELK, Prometheus +
Grafana, WAF + Vault, a second game, 3+ players, 3D, organizations, a permissions system, RTL,
full WCAG audit, analytics dashboards, PWA, file management,
data import, a notification centre, collaborative features.

---

## Team (original 42 project)

- **tjun-yu** — technical lead, backend, users service, Docker
- **djin** — frontend lead, design system, i18n
- **amaligno, ghwa** — WebSockets, game logic, chat, friends, tournaments

## Resources

- [Next.js docs](https://nextjs.org/docs) · [Better Auth](https://www.better-auth.com/docs) ·
  [Fastify](https://fastify.dev/docs/latest/) · [Prisma](https://www.prisma.io/docs) ·
  [Socket.IO](https://socket.io/docs/v4/) · [Caddy](https://caddyserver.com/docs/)
- **AI usage:** the 2026 rebuild (security hardening, auth migration, Next.js app, Docker stack,
  translations, Phase 5 modules) was developed with Claude Code, with independent model reviews
  of each stage.
  The design system was produced with Claude Design.
