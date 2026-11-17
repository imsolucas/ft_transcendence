---
name: build-feature
description: Lead-developer workflow for ft_transcendence — clarify requirements first, plan, build contract first (protocol types, Prisma schema, route signatures), review and fix in a loop, verify, then hand off. Use for any multi-step feature, refactor, revamp phase or new module done by a single agent. Only switch to the orchestrate skill when the work is large enough to justify subagents (the user wants them used sparingly). Invoke before writing any code.
---

# Build Feature — lead developer workflow

You are the lead developer on this codebase. Your job is to ship the *right* change,
verified, consistent with the repo rules, and cleanly handed off. That matters more than
writing code fast. Follow the five phases in order, and don't pass a gate by assumption.

**Golden rule: facts live in the repo, so go read them. Intent lives with the user, so go ask.**

**Which skill?** This is the default path: you do every unit yourself, in order. The user's
standing preference is to use subagents sparingly. Switch to `orchestrate` only when the
work spans several services *and* has three or more units that could run in parallel, or
when the user asks for agents. The references under `references/` are shared by both
skills; edit them here, never copy them.

## Phase 0 — Context

0. **Record the baseline**: `git status --porcelain` and `git diff --stat` into your notes
   (the scratchpad if you have one), so Phase 4 reviews only this task's diff.
1. Read `.claude/rules/repo-map.md` and work out which service(s) the change touches:
   `users`, `game`, `shared`, the legacy `frontend` or `apps/web`. Getting this wrong wastes
   the whole task.
2. Read the rules that apply: `backend-rule.md`, `security-hardening.md` (any auth, token,
   WS, secret, nginx or compose change), `realtime-rule.md` (game/WS), `frontend-rule.md`
   and `design-system.md` (any UI).
3. Find the closest existing feature and read it end to end (route → controller → Prisma
   for users; message type → MessageHandler → service → Broadcaster for game; page →
   components → API client for UI). Copy its shape unless the rules say it's a known bad
   pattern (see the "Known findings" list in `security-hardening.md`).
4. Check `README.md` and `services/users/api-docs/openapi.yaml` for documented behaviour
   you are about to change.

## Phase 1 — Clarify (gate: requirements are unambiguous)

List every open question, answer what you can from the code, and **ask the rest in one
batch**. Questions usually worth asking here:

- **Scope:** which services and screens? Does the legacy frontend need to keep working
  through this change, or can it break until `apps/web` replaces it?
- **Data:** new tables/fields or reuse? Destructive schema change (dev DB reset OK)?
- **Auth:** who may call this (anonymous, signed-in user, API key, internal service)?
- **Realtime:** what happens on disconnect, reconnect, a duplicate tab, or two users acting
  at once?
- **UX:** which states (empty, loading, error, offline) and what copy, in EN/ES/FR?

If the user is unavailable, choose the most conservative option, write the assumption at
the top of the plan, and repeat it in the handoff.

**Gate:** you can say in two sentences what will exist when you are done and how the user
will confirm it works.

## Phase 2 — Plan (gate: written plan exists)

- Files to create/modify, grouped by service.
- Contract: Prisma model changes, `services/shared` types (WS messages, DTOs), route
  method + path + auth + body + response schema. Paste the shapes; don't describe them.
- Order of work: contract first, then units in dependency order.
- Verify strategy: type gates per service, the manual flow (curl through the gateway, two
  browsers for realtime), and which screens to open.
- Re-check every path, count and version string in the plan against the raw output it came
  from before you freeze it.

Show the plan to the user before implementing when it touches the schema, auth, the WS
protocol or more than one service. Otherwise put it at the top of your response and proceed.

## Phase 3 — Implement

Work in units, contract first:

1. **Contract**: schema (`npx prisma validate`, local `db push`, `generate`), shared types,
   route signatures + JSON schemas.
2. **Backend unit(s)**: `users` and/or `game`, against the frozen contract.
3. **Frontend unit**: API client + pages + components, with EN/ES/FR keys in the same change.
4. **Docs unit** (optional): README / openapi.yaml.

If the contract must change midway, stop, change it, update the plan, and re-check the
units already written. Keep a short packet per unit as working notes (Task / Contract /
Files / Conventions / Verify, from `references/delegation.md`) so the review has something
objective to check against.

## Phase 4 — Review loop (gate: clean review)

Switch roles: you are now the reviewer and the implementation is untrusted.

1. Mechanical checks: type gate per touched service, plus the greps in
   `references/review-checklist.md` §1.
2. Get an independent read. The user's rule is **never review code with the same model that
   wrote it**: invoke the `code-review` skill at `high` on the touched paths, and if this
   session's model wrote the code, make sure the review runs on a different model (or tell
   the user it could not).
3. Walk checklist §2–§5 against the diff (things a generic review can't know).
4. UI touched and a dev server available (`.claude/launch.json`)? Open the changed screens
   at desktop and 375 px with the console open before fixing anything else.
5. Number the findings with `file:line`, ordered correctness → security → convention →
   style. Fix them, then re-review only the fixes.
6. Repeat until a pass finds nothing. **Cap at 3 cycles**, then escalate the rest to the user.
   If a check fails once, escalate one step (more effort or a different approach) rather
   than retrying the same thing.

## Phase 5 — Verify and hand off

- Run each touched service's gate and report the real result. Never claim clean if it isn't.
- Exercise the feature (gateway curl, browser, two users for realtime) or write exact steps.
- Schema touched: `prisma validate` clean and client regenerated.
- **Never** `git add` / `commit` / `push` (`git-workflow.md`).
- Write the handoff from `references/handoff.md`, with the merge verdict line.

## Anti-patterns

- Writing code before the Phase 1 gate, or guessing auth semantics.
- Copying a pattern listed in `security-hardening.md` "Known findings".
- Changing the contract after units are written without re-checking them.
- Reviewing the whole tree instead of this task's diff, or reviewing your own code generously.
- Reporting "done" without running the gates.
- Spawning subagents for work a single agent can finish.
