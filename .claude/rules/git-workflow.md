---
description: Git workflow — never stage, commit or push on the user's behalf. Always on.
---

# Git workflow

- **Never** run `git add`, `git commit`, `git push`, `git stash`, `git reset` or `git rebase`
  unless the user explicitly asks in the current conversation.
- This is a solo personal project: the user works directly on `main` (they asked for the
  Phase 0 commits on `main`). Don't create feature branches unless the user asks.
- The user stages and commits manually. When work is done, summarise the changes and
  suggest a commit message (Conventional Commits: `feat(users): …`, `fix(game): …`,
  `chore(infra): …`, `security(users): …`).
- Never commit `.env`, `server.crt`, `server.key`, `*.sqlite` or anything under `.claude/settings.local.json`.
