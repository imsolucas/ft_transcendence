---
description: Git workflow — never stage, commit or push on the user's behalf. Always on.
---

# Git workflow

- **Never** run `git add`, `git commit`, `git push`, `git stash`, `git reset` or `git rebase`
  unless the user explicitly asks in the current conversation.
- Creating or switching to a feature branch before editing is fine when `main` is checked out
  (say so in the reply). Never work directly on `main`.
- The user stages and commits manually. When work is done, summarise the changes and
  suggest a commit message (Conventional Commits: `feat(users): …`, `fix(game): …`,
  `chore(infra): …`, `security(users): …`).
- Never commit `.env`, `server.crt`, `server.key`, `*.sqlite` or anything under `.claude/settings.local.json`.
