# ft_transcendence

*This project has been created as part of the 42 curriculum by djin, tjun-yu, amaligno, ghwa.*

Real-time Pong in the browser: accounts, friends, online 1v1, private rooms, king-of-the-hill
tournaments, local two-player games, and a retro CRT / synthwave look. Originally the 42 Common
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

With `SEED_DEV_DATA=true` (the default in `.env.example`), an empty database gets four dev accounts:

| Username | Password |
|---|---|
| alice | alice-dev-1 |
| bob | bob-dev-22 |
| charlie | charlie-dev-3 |
| donald | donald-dev-4 |

Other commands: `make logs SERVICE=users`, `make down`, `make re`, `make clean-volumes` (deletes
the database), `make ps`.

### Google sign-in (optional)

Create an OAuth client in Google Cloud Console with the redirect URI
`https://localhost:8443/api/auth/callback/google`, then set `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` in `infra/.env` and run `make re`.

### Deploying on a real domain

Set in `infra/.env`: `SITE_ADDRESS=pong.example.com`, `PUBLIC_ORIGIN=https://pong.example.com`,
`HTTPS_PORT=443`, `TLS_MODE=` (empty, so Caddy gets a Let's Encrypt certificate) and
`SEED_DEV_DATA=false`. Enable HSTS in `infra/caddy/Caddyfile` once the domain works.

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
| `apps/web` | Frontend: landing, sign-in/up (2FA, Google), lobby, online/local/tournament play, profile, friends, settings, legal pages; EN/ES/FR | Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4, Radix UI, SWR, Motion, Socket.IO client |
| `services/users` | Accounts and data. Better Auth at `/api/auth/*`, our API at `/api/*`, the public API at `/api/public/*` (API keys), internal routes for the game | Fastify 5, Better Auth 1.7, Prisma 6, Postgres 17, Node 24 (runs TypeScript natively) |
| `services/game` | Authoritative Pong server: matchmaking, rooms, tournaments, 60 Hz simulation, result reporting | Fastify 5, Socket.IO 4 |
| `services/shared` | Game engine, WebSocket protocol types and the HTTP API contract, imported by web and game | TypeScript |
| `infra` | `docker-compose.yml`, `caddy/Caddyfile`, `.env.example` | Docker Compose, Caddy 2.11 |

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

### HTTP API

The contract between web and users is `services/shared/types/api.types.ts`:
`/api/me` (profile, avatar upload), `/api/users/:username` (profile + stats),
`/api/users/:username/matches` (paginated), `/api/users/search`, `/api/friends…`, `/api/blocks`,
`/api/api-keys`, `/api/sessions`. The public API (`X-API-Key`) is under `/api/public/*`.

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

---

## Status and roadmap

| Phase | Scope | State |
|---|---|---|
| 0 | Security hardening of the original services | Done |
| 1 + 2 | Better Auth, Postgres, Caddy, Socket.IO, the Next.js app and all core screens | Done |
| 3 | Realtime extras: chat, reconnection with a held slot, rematch, ready-check deadline | Planned |
| 4 | Ops: status page, backups, production compose profile | Planned |
| 5 | Remaining modules of the 42 subject | Planned |

Known limitations: chat is a placeholder; tournaments are king-of-the-hill rather than a bracket;
the court stays landscape on phones; "vs AI" is not built yet.

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
  translations) was developed with Claude Code, with independent model reviews of each stage.
  The design system was produced with Claude Design.
