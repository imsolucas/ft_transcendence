# Delegation — the unit packet and the parallel-safety rule

Shared by both skills:

- `build-feature` (single agent): you execute every unit yourself and write the packet as
  working notes, so the review has something objective to check against.
- `orchestrate`: the orchestrator writes the packet and spawns an `implementer-*` agent per
  unit. Agent type, model and tier come from `.claude/skills/orchestrate/references/`.

## Why delegation fails

Subagents share **nothing** with you: no conversation, no rules you read, no decisions you
made. Every delegation failure comes down to a missing sentence in the packet. Write
packets as if you were onboarding a competent contractor on day one.

## Parallel-safety rule

Two units may run in parallel **only if** their file sets are disjoint and both depend only
on the frozen contract. `services/users/**`, `services/game/**` and `apps/web/**` qualify
once the shared types, the Prisma schema and route signatures are written. Two units that
both edit `services/shared/**` never qualify. Trailing ES/FR catalog units run after every
UI unit.

## The unit packet (required sections)

```
## Task
One paragraph: what to build and the definition of done.

## Contract (frozen — do not change)
- Routes: METHOD /path — auth (anon | user cookie | API key | internal token) — body schema — response schema
- WS messages: paste the union members from services/shared/types/protocol.types.ts
- Schema: paste the relevant Prisma models

## Files
- Modify: exact paths
- Create: exact paths
- Do NOT touch: anything else (especially services/shared/**, schema.prisma)

## Conventions (do not rediscover — obey)
- Read .claude/rules/<backend-rule|security-hardening|realtime-rule|frontend-rule|design-system>.md first
- Mirror this analog: <path>
- Backend: route schema incl. response; identity from req.user / authenticated socket;
  errors as { error } with a stable message; app.prisma from db/plugin.ts; app.log, never console
- Frontend: lib/api.ts client; components/ui primitives; tokens only; EN/ES/FR keys together

## Verify before reporting done
- npx tsc --noEmit (and npm run lint where it exists) in each touched service
- Report: files changed, decisions made, anything you were unsure about
```

## After a unit is done

Don't trust "done", whether it's yours or an agent's. The unit goes into the review loop
as an untrusted diff checked against this packet. Resolve every flagged uncertainty
explicitly before the review.
