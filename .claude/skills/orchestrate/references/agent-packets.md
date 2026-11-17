# Agent packets

Subagents share nothing with you. Build packets from these templates and paste real
content (paths, types, schemas), never "see the plan".

Spawn with `Agent`: `subagent_type` = the assigned `implementer-*` type, `description` =
unit + model (e.g. `Unit A users refresh rotation (opus-high)`). Spawn every
parallel-safe unit in one message. Never predict or paraphrase a result you have not
received.

## Implementer packet

Start from build-feature `references/delegation.md` → "The unit packet" (Task, Contract,
Files, Conventions, Verify), then add:

```
## Role
You are one implementer in a multi-agent build. An orchestrator owns the contract and will
validate your work before a separate code review. Other agents work in parallel — stay
inside your file set.

## Effort: <low|medium|high>
<paste the block from references/routing.md>

## Hard limits
- Do not modify services/shared/types/**, schema.prisma, or any file not under Files.
- No git state changes. No prisma db push / migrate.
- Do not "improve" neighbouring code.

## Report format
Files changed (path — what)
Decisions made (each with the reason)
Edge cases covered
Unsure about (specific; empty only if genuinely nothing)
Gate result (command + last lines of output)
```

### Sonnet addendum

```
## Per-file instructions (follow literally)
- <path> — mirror <analog> (sections …); rename <A>→<B>; add keys <list>

## Stop conditions (report instead of guessing)
- The analog and these instructions disagree.
- A file you need is not listed.
- You would have to choose a name, label, colour, layout, copy string or translation not written here.
- The gate fails for a reason outside the listed files.
Finish the unaffected files, then report the exact question.

## What done looks like
- `git diff --stat` touches only the listed files.
- <mechanical check: tsc exit 0 / key-parity "ok" for es and fr / grep X returns N>
```

If you can't write the per-file bullets without hand-waving, the unit isn't Sonnet-eligible.

## Fixer packet

```
## Task
Apply the findings below. Fix only what is listed; don't change behaviour that wasn't flagged.

## Findings (verbatim, in order)
1. <file:line> — <finding> — expected fix: <one clause>

## Contract (frozen)
<paste>

## Files you may touch
<set; a finding that needs another file → stop and report>

## Conventions
Read the .claude/rules files for this service. Use the same helpers the checklist demands;
don't introduce a new pattern to fix an old one.

## Effort: <tier of the most severe finding>
<block>

## Report format
Per finding: fixed (how) | not fixed (why)
Gate result (pasted)
New issues noticed but not fixed
```

## Corrections

Send corrections with `SendMessage` to the same agent, so it keeps its context. Give the
exact gap and the expected result, then wait for the new report.

## When not to spawn

A one- or two-line unambiguous fix: do it yourself and log it.
