# Review checklist — ft_transcendence

Run the mechanical checks first (cheap and objective), then read the diff. Report findings
as a numbered list with `file:line`, fix them, then re-review only the fixes.

## 1) Mechanical checks

```bash
# Type gates (run `npm ci` in the service first if node_modules is missing)
(cd services/users && npx tsc --noEmit)
(cd services/game  && npx tsc --noEmit)
(cd services/shared && npx tsc --noEmit)
(cd apps/web && npm run lint && npx tsc --noEmit)        # Phase 1+
(cd services/users && npx prisma validate)               # schema touched

# Security regressions (each hit must be fixed or justified)
git diff | grep -nE '^\+.*(\?\?|\|\|) *"[^"]*(secret|dev_)'          # secret fallback
git diff | grep -nE '^\+.*origin: *true'                             # reflect-any CORS
git diff | grep -nE '^\+.*(localStorage|sessionStorage)'             # token storage
git diff | grep -nE '^\+.*Math\.random'                              # tokens / ids
git diff | grep -nE '^\+.*bcrypt\.compare' | grep -v password        # bcrypt used for lookups
git diff | grep -nE '^\+.*(===|!==) *(process\.env|config)\.[A-Za-z_]*(SECRET|TOKEN|KEY)'  # non-constant-time compare
git diff | grep -nE '^\+.*(appendFileSync|agent log|console\.log)'   # debug leftovers
git diff | grep -nE '^\+.*(playerId|userId).*(data|body|message)\.'  # identity from client
git diff | grep -nE '^\+.*fetch\(' -A3 | grep -L AbortSignal         # outbound call without timeout (read hits manually)

# UI (see design-system.md)
git diff | grep -nE '^\+.*innerHTML'
git diff | grep -nE '^\+.*#[0-9a-fA-F]{3,8}\b' -- 'apps/web/**' 'services/frontend/src/**'

# i18n key parity (EN/ES/FR must have identical key sets)
node -e 'const f=p=>Object.keys(require(p)).sort().join();const d="./services/frontend/src/i18n/locales/";const e=f(d+"en.json");for(const l of["es","fr"])console.log(l,f(d+l+".json")===e?"ok":"MISMATCH")'
```

## 2) Backend review (users, game)

- [ ] Every route has a schema for its inputs **and** its `response`; bodies use `additionalProperties: false`.
- [ ] Identity comes from `req.user` / the authenticated socket, never from body, params or WS payload.
- [ ] Auth level is correct: anonymous, user cookie, API key, or internal service token.
- [ ] No secret fallbacks; secrets compared in constant time.
- [ ] Errors return `{ error }` with stable text; no `err.message` or stack sent to the client.
- [ ] `findMany` is bounded with a stable `orderBy`; multi-row writes that must agree use `$transaction`.
- [ ] Responses never include `password`, `twoFASecret` or hashes.
- [ ] Outbound fetch has a timeout and an idempotency key where retried.
- [ ] Shared `PrismaClient` from `db/plugin.ts` in new code.

## 3) Realtime review

- [ ] New message types are added to `protocol.types.ts` first and validated on the server.
- [ ] The server stays authoritative; clients send inputs only.
- [ ] No I/O inside the tick; results are reported after the match with retry + idempotency.
- [ ] Disconnect/reconnect paths are handled and cleanup is idempotent.
- [ ] Broadcast is per room and skips closed sockets.

## 4) Frontend review

- [ ] Loading, empty, error and unauthorised states exist for every fetch.
- [ ] No token in JS; cookies only. No redirect loops on 401.
- [ ] Forms: Zod schema, inline errors, disabled submit while pending.
- [ ] EN/ES/FR keys added together; no bare user-facing strings.
- [ ] Tokens only (no raw hex); components reuse `components/ui`.
- [ ] Keyboard focus visible; labels; `prefers-reduced-motion` respected; AA contrast.
- [ ] Browser console clean (no errors, warnings or hydration mismatches).

## 5) Cross-cutting

- [ ] Matches the plan's contract exactly (paths, shapes, auth levels).
- [ ] No leftover debug code, commented-out blocks or unused imports.
- [ ] `infra/.env.example` updated for every new env var.
- [ ] README / openapi.yaml updated if documented behaviour changed.
- [ ] Every "unsure" item has been resolved explicitly.

## Severity discipline

Order: correctness → security → convention → style. A style nit never blocks the handoff
on cycle 3; a security finding always does.
