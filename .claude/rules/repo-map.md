---
description: Repo map for ft_transcendence — what each service is, how they talk, key commands, which rule file applies. Always on.
---

# Repo map (read before choosing files)

ft_transcendence is a real-time Pong platform (accounts, friends, chat, 1v1 + tournaments)
being **revamped as a personal project**. It is no longer graded at 42, but the subject's
baseline still holds as a quality bar: HTTPS/wss everywhere, one-command Docker deploy,
Privacy Policy + Terms pages, EN/ES/FR i18n, validation on both client and server, and
**no errors or warnings in the browser console**.

## Layout

| Path | What | Stack | Port (internal) |
|---|---|---|---|
| `apps/web` | The frontend: landing, auth, lobby, play (online/local/tournament), profile, friends, chat (placeholder), settings, legal, 404 | Next.js 16 (App Router, cacheComponents, `/[lang]` en/es/fr), React 19, Tailwind 4, radix-ui + cva, motion, swr, Better Auth client, socket.io-client | 3000 |
| `services/users` | Accounts and data: Better Auth (`/api/auth/*`), our API (`/api/*`), public API (`/api/public/*`, API keys), internal routes for the game (`/internal/*`) | Fastify 5, Better Auth 1.7, Prisma 6 on Postgres 17, Node 24 runs TS natively | 4000 |
| `services/game` | Authoritative Pong server: rooms, matchmaking, tournaments, tick loop; results → users | Fastify 5 + Socket.IO 4 (`/ws`), tsx | 3001 |
| `services/shared` | Imported by web and game: game engine (`game-engine/`), WS protocol + pong types, the HTTP API contract (`types/api.types.ts`) | plain TS with explicit `.ts` imports | — |
| `infra/` | `docker-compose.yml` (postgres, users, game, web, caddy), `caddy/Caddyfile`, `.env.example` | Docker Compose, Caddy 2.11 | 8443 → host |

Routing (Caddy): `/api/*` → users · `/ws*` → game · everything else → web. `/internal/*` and
`/docs` are answered 404 at the gateway; only the game service calls `/internal/*` (service
token). One origin, so no CORS; Origin checks on every write and on the socket handshake.

API contract: `services/shared/types/api.types.ts` (source of truth for web ↔ users).

## Revamp roadmap (the agreed plan)

- **Phase 0 — security fixes** (backend only): fail-fast secrets, short access token + rotating
  refresh in httpOnly cookies, WS identity from the server, service-to-service auth,
  hash-lookup for API keys/blacklist, remove debug logging, prod/dev compose split.
- **Phase 1 — auth + `apps/web`**: first move authentication to **Better Auth** inside the
  `users` service (Prisma adapter; email+password, Google, `twoFactor` plugin). It
  replaces the hand-written Phase 0 session code in `services/users/src/auth/tokens.ts`;
  the internal service token, WS hardening and idempotency stay. Then Next.js (App
  Router) + Tailwind + shadcn/ui + Framer Motion with the design system (retro CRT /
  synthwave, see `design-system.md`). Read the installed Better Auth version's docs first.
  Decisions (2026-11-18):
  - **Cutover:** Phases 1 and 2 ship together. nginx keeps `/` on the legacy app until
    `apps/web` has caught up with it (auth, lobby, profile, friends, game), then switches
    in one commit. Keep `main` playable the whole time.
  - **Local origin:** `https://localhost:8443` (`BETTER_AUTH_URL`, `ALLOWED_ORIGINS`).
  - **Google:** server-side OAuth with `GOOGLE_CLIENT_SECRET`; redirect URI
    `https://localhost:8443/api/auth/callback/google`.
  - **Database:** Postgres container (Prisma migrate), dev data reseeded.
  - **Better Auth setup:** `generateId: "serial"` keeps integer user ids; `username` and
    `twoFactor` plugins; mounted at `/api/auth/*`.
  - **Game WS auth:** at upgrade the game forwards the cookie once to an internal users
    route that calls `auth.api.getSession`.
  - **Connections (user, 2026-11-18): "use the new modern way".**
    - **Caddy** replaces nginx: automatic HTTPS with `tls internal` locally and
      Let's Encrypt on a real domain, so there are no cert files.
    - **One origin:** `/` → Next.js, `/api/*` → users, `/ws` → game, so no CORS.
    - **Better Auth** owns cookies, sessions and CSRF.
    - **Socket.IO** replaces raw WebSockets on the game service (built-in
      reconnection, heartbeat and rooms).
  - **Design source:** the Design System artifact
    https://claude.ai/artifact/BMeufmTDn4KNsRPaXkvAov (`project/tokens.json`,
    `project/components/bundle.css`, 13 screens); read its `project/README.md` first.
- **Phase 2** — port pages · **Phase 3** — realtime (real chat, reconnection, heartbeat) ·
  **Phase 4** — infra, health/status page, README.
- **Phase 5 — every subject module** (after the revamp is finished): the user wants all
  modules from `ft_transcendence.pdf` (subject v21.2, chapter IV) implemented. Known
  conflict: the subject says the ICP-blockchain-backend minor is incompatible with SSR, and
  `apps/web` uses Next.js SSR, so that minor needs its own decision before Phase 5 starts.
  Design earlier phases so the modules fit later. For example, keep the game engine
  pluggable for a 2nd game, 3+ players and an AI opponent; keep logs structured for ELK
  and metrics; keep the schema ready for roles and organizations.
- Fastify stays as the auth authority and the game server; Next.js never re-implements auth.

## Commands

```bash
make               # creates infra/.env with generated secrets (first run), then builds + starts
make logs SERVICE=users
make down / make re / make clean-volumes
cd apps/web && npm run lint && npx tsc --noEmit
cd services/users && npm run typecheck      # DATABASE_URL needed for prisma commands
cd services/game && npm run typecheck
```

Never claim a gate passed without running it.

## Rules architecture

Only this file and `git-workflow.md` are always on. The rest attach by path:
- `backend-rule.md` → `services/users/**`, `services/game/**`, `services/shared/**`
- `security-hardening.md` → any auth, token, cookie, API key, WS, secret, nginx or compose change
- `realtime-rule.md` → game server, WS protocol types, game/WS client code
- `frontend-rule.md` → `apps/web/**`
- `design-system.md` → any UI work (tokens, components, the CRT/synthwave look)

## Workflow

Multi-step feature, refactor or phase: follow `.claude/skills/build-feature/SKILL.md`
(clarify → plan → implement → review loop → handoff). Only when the work is large enough
to justify subagents (the user wants them sparingly) use `.claude/skills/orchestrate/`.
Ask the user about *intent* in one batch; read the code for *facts*.
