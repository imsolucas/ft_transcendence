# Handoff template

End every feature task with this report. The user commits manually, didn't watch the
work, and reads this to write the commit and decide what's next, so it has to stand alone.

```markdown
## What was built
One paragraph in plain language: what exists now that didn't before.

## Changes
- `path/to/file` — what and why (grouped by service)

## Run before using
New env vars (and where to put them), `npm ci` needed, dev DB reset needed, certs, etc.

## Verified
- services/users: npx tsc --noEmit ✅/❌ (paste failures verbatim)
- services/game:  npx tsc --noEmit ✅/❌
- prisma (if touched): validate ✅/❌, client regenerated
- Gateway / browser: <what you exercised and saw, or "not run: <why>">
- Manual steps for the user: <exact commands / clicks>

## Assumptions made
- <assumption> — chosen because <reason>; revisit if wrong

## Things I'm unsure about
- <decision> — <why it might be wrong> — see `path/to/file`

## Remaining gaps
- Escalated review findings (survived cycle 3): <file:line — finding — severity>
- Deferred scope: <what, and why>
- Not verified: <anything in the verify strategy that could not run>

## Next steps
1. ...

## Suggested commit message
<type>(<scope>): <summary>

<Merge verdict line>
```

## Merge verdict

- `Ready to commit.`: gates clean, zero open findings, flow verified or clearly described.
- `Ready to commit with caveats.`: gates clean, only style findings or unverified manual steps remain.
- `Do not merge yet.`: a correctness or security finding survived, or a gate fails. Say which.

## Rules

- Never mark something verified on hope. A ❌ with pasted output beats a false ✅.
- "Remaining gaps: none" has to be earned by the review loop, not assumed.
- Don't stage, commit or push.
