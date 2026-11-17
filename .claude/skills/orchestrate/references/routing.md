# Routing — effort tier and model per unit

Two independent choices go in the plan for every unit, each with a one-line reason.

## Effort tier → agent type

| Tier | Use when | Agent type |
|---|---|---|
| **high** | Auth, sessions, cookies, tokens, API keys, WS authentication, internal-service auth, schema-adjacent code, concurrency (matchmaking queue, tournaments, result reporting, friendship races), game-server authority / tick loop, anything in `security-hardening.md` | `implementer-opus-high` |
| **medium** | Several files in one service with some judgement but no auth or concurrency: a CRUD route + controller, a new page against an existing endpoint, a form with validation | `implementer-opus` |
| **low, with judgement or UI** | Small, but a reviewer would have opinions (any visual change, copy) | `implementer-opus` |
| **low/medium, mechanical** | Passes every Sonnet rule below | `implementer-sonnet` |

When in doubt, go one tier up. Fixers take the tier of their most severe finding.

### Effort blocks (paste into the packet's `## Effort`)

**low**
```
- Mirror the analog file(s) exactly; do not explore beyond the listed files and rules.
- Run the type gate before reporting. Report in under 10 lines.
```

**medium**
```
- Read the analog end to end and the named rules before writing.
- List the edge cases first (empty, loading, error, unauthorised, disconnect) and handle all.
- Re-read your diff once against build-feature references/review-checklist.md §2–§4.
- Run the type gate. Report files, decisions with reasons, edge cases, unsure items.
```

**high**
```
- Read security-hardening.md and the named rules in full, then the analog end to end.
- Before coding, write down the invariants (identity source, secret handling, idempotency,
  race conditions, cleanup on disconnect), the edge cases and the failure paths.
- Exercise refusal paths, not only the happy path, and say what you saw.
- Review your diff against checklist §1–§5 as a hostile reviewer; fix and list what you fixed.
- Run the type gate. Report invariants and how each is enforced, plus unsure items.
```

## Model

**Opus is the default.** Never route to Fable as an implementer: the frozen contract has
already removed the judgement it would add.

**Always Opus:** any UI/UX work however small (spacing, hierarchy and colour are
judgement); the high tier; a medium unit with a loose analog ("like X but…"); a fixer
with a correctness or security finding or an "investigate/decide" finding.

**Sonnet only when all of these hold:**
1. The packet names the exact analog, and the mirror is one-to-one.
2. Every file has a bullet saying exactly what changes in it.
3. No judgement calls are left: names, copy, translations (glossary included), field lists
   are all in the packet.
4. A wrong result is caught mechanically (type gate, i18n key-parity check, grep, diff vs bullets).
5. Low or medium tier, with no backend logic beyond CRUD mirroring.

Typical Sonnet units here: ES/FR catalog fills from an EN source + glossary; README /
openapi.yaml sections from a spec you wrote; renames and import rewiring with a full file
list; tests against an explicit case list; a fixer whose findings are all convention or
style with the fix stated.

**Never Sonnet even if it looks mechanical:** "copy this page for Y" where Y has different
states; any WS protocol change; any query on `User`, `Match` or `RefreshToken`; the first
implementation of a pattern.

## Escalation

- A Sonnet unit gets one correction for a missed instruction, never a second.
- A judgement gap means re-spawning on Opus with the prior report attached. Log it.
- Two escalations in one run means this rule is wrong for that feature class. Say so in the handoff.
