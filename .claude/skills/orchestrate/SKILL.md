---
name: orchestrate
description: Multi-agent build workflow for ft_transcendence. The session model orchestrates (plan mode, questions, frozen contract, validation, review loop, handoff) and implementer-* subagents (Opus for judgement and all UI/UX, Sonnet for mechanical fully specified units) build the units. Wraps plan mode + build-feature + /code-review. Use ONLY when the user says "orchestrate", "spawn agents" or "use subagents", or when a revamp phase spans several services with three or more parallel-safe units; the user wants subagents used sparingly, so default to build-feature otherwise.
---

# Orchestrate — lead + implementer subagents

You are the **orchestrator**. Beyond the data contract and one-line fixes, you don't
write implementation code. You plan, decide, route each unit, delegate, validate what
comes back, run the review loop and hand off.

**Cost check first.** Subagents are expensive and the user wants them used sparingly. If
the work fits one agent's context, or has fewer than three parallel-safe units, use
`build-feature` instead and say why in one line.

This skill wraps:

| Wrapped | How | Source of truth |
|---|---|---|
| Plan mode | `EnterPlanMode` at the start, `ExitPlanMode` as the single approval gate | harness |
| build-feature | Its phases, context list, questions, packet, checklist and handoff | `.claude/skills/build-feature/` |
| code-review | Invoked each review cycle; its findings feed the fixers | built-in skill |

Open the reference files and paste from them. Never copy them from memory.

**Repo rules throughout:** no `git add`/`commit`/`push`; schema changes go to the local dev DB
only; never claim a gate passed without running it.

## Roles

| Role | Agent type | Owns | Never does |
|---|---|---|---|
| Orchestrator | you | Context, questions, plan, contract, routing, validation, review, handoff | Implementation units |
| Explorers | `Explore` | Read-only fan-out during plan mode (only when one read won't do) | Edits |
| Implementers | `implementer-opus-high` / `implementer-opus` / `implementer-sonnet` | One unit each, against the frozen contract | Touching `services/shared/types/**`, `schema.prisma` or another unit's files |
| Fixers | same three types, chosen by the most severe finding | Applying a verbatim findings list | Widening scope |

Routing and tiers: `references/routing.md`. If the session doesn't list the `implementer-*`
types, fall back to `general-purpose` with `model: "opus"` or `"sonnet"`, and log it.

**Reviewer ≠ author.** The user's rule is that code is never reviewed by the same model
that wrote it. Implementers are Opus or Sonnet, so run `code-review` from a session or
agent on a different model than the unit's author, and note in the log which model
reviewed which unit.

## Run state

Keep `run-state.md` in the scratchpad from Phase A on: baseline, plan path, the Units table
(agent type, model, ID, status), unsure items and their resolutions, findings per cycle,
escalations. Re-read it after any context compaction and never reconstruct state from
memory.

## Phase A — Plan mode (read-only until approved)

1. Save `git status --porcelain` + `git diff --stat` to the scratchpad.
2. `EnterPlanMode`.
3. build-feature Phase 0 yourself: `repo-map.md`, the applicable rules, the analog read end
   to end (the contract depends on it, so you can't delegate it).
4. build-feature Phase 1: ask open intent questions in **one** `AskUserQuestion` batch.
5. Write the plan: **Goal** (two sentences), **Frozen contract** (Prisma models, shared
   types, routes with auth level and schemas, pasted), **Units** (name, service, files,
   tier + reason, agent type + reason, depends-on, parallel group), **Orchestrator-owned
   work**, **Verify strategy**, **Assumptions**. Size each unit to one service and a file
   list you can write out in full.
   Re-check every fact in the contract against raw output, and every Sonnet route
   against the eligibility list, before you freeze it.
6. `ExitPlanMode`. This is the only approval gate; after it, run to the handoff.

## Phase B — Contract (you)

Implement the contract exactly: schema (`prisma validate`, local `db push`, `generate`),
`services/shared` types, route signatures. If it must change, change it now and update the
plan, *before* spawning anything.

## Phase C — Implement

Build each packet from `references/agent-packets.md`. Spawn all parallel-safe units in
**one message**. Don't poll, and don't implement while you wait. When a unit reports:

- Sonnet: check the report and `git diff --stat` against the per-file bullets. A missed
  instruction gets **one** `SendMessage` correction. A judgement gap gets re-spawned on
  `implementer-opus` with the prior report under `## Prior attempt (do not trust)`.
- Any agent: resolve its "unsure" items yourself. Send contract or file-set misses back
  to the **same** agent with `SendMessage`.

## Phase D — Validate (you)

Paths, shapes and auth levels match the contract. Only planned files changed (compare
against the baseline). Every unsure item is resolved. Gates and checklist §1 greps pass.
For UI units, open the screens (`.claude/launch.json`) at desktop and 375 px with the
console open.

## Phase E — Review loop

1. `code-review` at `high` on this run's paths (no `--fix`), run on a model that didn't
   write the unit.
2. Add checklist §2–§5 findings the generic review can't know about.
3. Merge into one numbered `file:line` list ordered correctness → security → convention →
   style, with the expected fix in one clause each. Drop verified false positives, with a
   reason.
4. Zero findings → exit. Otherwise spawn one fixer per service (routing per
   `references/routing.md`), in parallel when the file sets are disjoint.
5. Re-run the gates and re-review only the changed lines.

Cap at **3 cycles**. Escalate whatever survives in the handoff. A surviving security
finding means "Do not merge yet".

## Phase F — Hand off

Gates per touched service (pasted), the flow exercised or exact steps, no git. Use
build-feature `references/handoff.md` plus this log before the commit message:

```markdown
## Orchestration log
| Unit | Agent type | Tier | Reviewed by | Cycles | Notes |
|---|---|---|---|---|---|
Review: N findings cycle 1, M cycle 2, …
Routing: N sonnet, M opus, K escalations (why).
Orchestrator did directly: contract, <one-line fixes>.
Fallback used: none | general-purpose + model
```

## Anti-patterns

- Orchestrating work that `build-feature` could do alone.
- Writing implementation before `ExitPlanMode`, or delegating the contract.
- Spawning parallel-safe units one at a time.
- Routing to Sonnet because a unit is *small*. The test is mechanical + fully specified +
  fails loudly. UI is never Sonnet.
- Reviewing a unit with the model that wrote it.
- A fourth review cycle, a ✅ for a gate you didn't run, or acting after compaction without
  re-reading `run-state.md`.
