---
description: Backend conventions for the Fastify services (users, game) and services/shared — structure, validation, errors, Prisma, data access, service-to-service calls, logging. Apply when adding or changing any route, controller, schema, or shared type.
paths:
  - "services/users/**"
  - "services/game/**"
  - "services/shared/**"
---

# Backend rule (Fastify services)

## 1) Stack and layout

- Fastify 5, ESM (`"type": "module"`), TypeScript, Node LTS. Imports use the `.ts`
  extension today (`ts-node-esm` / `tsx`); keep the style of the file you edit.
- `services/users/src`: `routes.ts` registers everything; each feature is
  `modules/<feature>/routes.ts` (schema + handlers, plus `service.ts` when logic is shared) → Prisma.
  Better Auth is mounted by `auth/routes.ts` (next to `auth.ts`). `schemas/index.ts` holds shared
  JSON schemas registered with `app.addSchema`. `middleware/` holds hooks (`rateLimiter.ts`).
- `services/game/src`: `websocket/` (MessageHandler, RoomService, GameService,
  TournamentService, TickSystem, Broadcaster), `rooms/` (roomManager, GameServer), `users-api/`
  (every call to the users service: `client.ts` session/profile lookups, `results.ts` match results).
- Logic that both browser and server run (physics, protocol types) lives in
  `services/shared` and must stay free of Node-only and DOM-only APIs.

## 2) Routes and validation

- Every route declares a Fastify `schema` with `body` / `querystring` / `params` **and**
  `response` (Fastify serialises by response schema, which also stops field leaks such as
  `password` or `twoFASecret`). Set `additionalProperties: false` on bodies.
- Validate on the server even when the client validates; `utils/validation.ts` is the
  current helper for auth inputs. New shared validation goes into `services/shared` as Zod
  (planned) so the Next.js app reuses the same schema.
- Never trust identity fields from the body or the WS payload (`userId`, `playerId`,
  `id`). Identity comes from the verified token (`req.user`) or the authenticated socket.
- Errors: `reply.code(n).send({ error: "<message>" })`, with stable messages. Never send
  `error.message` from an exception, stack traces or Prisma errors to the client; log them
  with `req.log.error({ err }, "...")` instead.

## 3) Prisma and data access

- One `PrismaClient` per process: `import { prisma } from "../db/client.ts"` (the same
  instance is decorated as `app.db` by `db/plugin.ts`). Never `new PrismaClient()`.
- Schema: `services/users/src/db/prisma/schema.prisma`. SQLite now, Postgres planned. Any
  schema change: `npx prisma validate`, then `npx prisma db push` against the **local** dev DB
  only (init.sh does this in Docker), and regenerate. Never point at a non-local DB.
- Every new FK or column used in a `where`/`orderBy` gets `@@index`; don't duplicate an
  index on a `@unique` field.
- Lists are bounded (`take` + stable `orderBy` with an `id` tie-break). No `findMany` over a
  whole table followed by a JS loop. In particular, never scan a table and compare each row
  with bcrypt (the old API-key/blacklist pattern); look up by a deterministic hash instead.
- Multi-step writes that must agree (match result + stats, friendship accept) use
  `prisma.$transaction`. Concurrent users are a first-class requirement.
- Select only the columns you return (`select`), especially on `User`.

## 4) Service-to-service calls

- game → users calls carry the shared internal credential (see `security-hardening.md` §4)
  and an idempotency key per match so a retry can't record a result twice.
- Every outbound `fetch` has a timeout (`AbortSignal.timeout(ms)`) and logs failures
  without the request body.
- Base URLs come from env (`USERS_API_URL`); the Docker DNS name is only the default
  in dev.

## 5) Config and logging

- Read env once at startup into the typed config object (`src/config.ts` in each service);
  **fail fast** if a required secret is missing. Never `process.env.X ?? "dev_…"` for a secret.
- Use Fastify's logger (`req.log` / `app.log`). No `console.log` in new code, and no ad-hoc
  file logging (the old `#region agent log` blocks wrote to a hardcoded path; they are banned).
- Never log tokens, passwords, TOTP secrets, API keys or full cookies.

## 6) Verify before done

- `npx tsc --noEmit` in each touched service (after `npm ci`), and paste the result.
- `npx prisma validate` if the schema changed.
- If Docker is available: `make up` and hit the touched endpoint through the gateway
  (`curl -k https://localhost/...`). Otherwise give the user exact manual steps.
