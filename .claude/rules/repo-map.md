---
description: Repo map for ft_transcendence — what each service is, how they talk, key commands, which rule file applies. Always on.
---

# Repo map (read before choosing files)

ft_transcendence is a real-time Pong platform (accounts, friends, chat, 1v1 + tournaments)
being **revamped as a personal project**. It is no longer graded at 42, but the subject's
baseline still holds as a quality bar: HTTPS/wss everywhere, one-command Docker deploy,
Privacy Policy + Terms pages, EN/ES/FR i18n, validation on both client and server, and
**no errors or warnings in the browser console**.

## Services (`services/`)

| Path | What | Stack | Port (internal) |
|---|---|---|---|
| `services/users` | Accounts, auth (password, Google OAuth, TOTP 2FA), friends, profiles, match history, public API (API keys) | Fastify 5, Prisma 6 (SQLite today → Postgres planned), `jsonwebtoken`, `bcrypt` | 4000 |
| `services/game` | Authoritative Pong server: rooms, matchmaking queue, tournaments, tick loop; reports results to `users` | Fastify 5 + `@fastify/websocket` | 3001 |
| `services/shared` | Code both sides import: game engine (`game-engine/`), WS protocol types (`types/protocol.types.ts`), player/pong types | plain TS, mounted at `/usr/src/shared` in containers | — |
| `services/frontend` | **Legacy** SPA: Vite + Stimulus + Tailwind 3, pages built as HTML strings (`innerHTML`). Being replaced by Next.js in Phase 1 — fix only what blocks Phase 0 | Vite 7, TS | 3000 |
| `services/api-gateway` | nginx: TLS termination, path routing, WS upgrade | nginx | 443 → host |
| `infra/` | `docker-compose.yml`, `.env.example` | Docker Compose | — |

Routing (nginx `services/api-gateway/nginx.conf`): `/auth/*`, `/user/*`, `/api/public/*` → users ·
`/ws/game` → game · `/users/health`, `/game/health` → health · everything else → frontend.
Internal calls (game → users `POST /game/match-result`, `/game/tournament-result`) go over the
Docker network and are **not** exposed by nginx — keep it that way.

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
make up            # docker compose -f infra/docker-compose.yml up -d --build
make logs SERVICE=users
make down / make re / make clean-volumes
# per service (after `npm ci` in that dir)
cd services/<svc> && npx tsc --noEmit      # type gate until a `typecheck` script exists
cd services/users && npx prisma validate && npx prisma generate
```

No lint or test scripts exist yet. Never claim a gate passed without running it, and
when a gate does not exist say so instead of inventing one.

## Rules architecture

Only this file and `git-workflow.md` are always on. The rest attach by path:
- `backend-rule.md` → `services/users/**`, `services/game/**`, `services/shared/**`
- `security-hardening.md` → any auth, token, cookie, API key, WS, secret, nginx or compose change
- `realtime-rule.md` → game server, WS protocol types, game/WS client code
- `frontend-rule.md` → `services/frontend/**` and the future `apps/web/**`
- `design-system.md` → any UI work (tokens, components, the CRT/synthwave look)

## Workflow

Multi-step feature, refactor or phase: follow `.claude/skills/build-feature/SKILL.md`
(clarify → plan → implement → review loop → handoff). Only when the work is large enough
to justify subagents (the user wants them sparingly) use `.claude/skills/orchestrate/`.
Ask the user about *intent* in one batch; read the code for *facts*.
