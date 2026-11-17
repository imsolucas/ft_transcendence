---
description: Frontend conventions — legacy Vite/Stimulus app (maintenance only) and the Next.js App Router app that replaces it (apps/web). Data fetching, auth, forms, i18n, accessibility, verification. Apply for any UI code.
paths:
  - "services/frontend/**"
  - "apps/web/**"
---

# Frontend rule

## Legacy app (`services/frontend`)

Maintenance only. It is being replaced in Phase 1, so change it only to keep it working
with Phase 0 backend changes (cookie auth, WS auth). Don't add features or redesign it.
When you touch it: no new `innerHTML` with dynamic values, and no new `localStorage` for
anything auth-related.

## Next.js app (`apps/web`, Phase 1+)

**Before writing Next.js code, read the installed version's docs** in
`node_modules/next/dist/docs/` (or the official docs for the exact version in
`package.json`). Don't rely on remembered APIs; App Router conventions change between
majors.

0. **Stack (agreed with the user).** Next.js App Router + React + TypeScript,
   **Tailwind CSS**, **shadcn/ui** (components copied into `components/ui` and restyled
   with the design tokens, never used with their default look), and **Framer Motion**
   (`motion`) for animation. Read each library's docs for the installed version before
   using it. Don't add any of them to the legacy `services/frontend`.
1. **Structure.** App Router. Server Components by default; `"use client"` only for
   interactivity (forms, the game canvas, sockets). Route groups: `(marketing)` for
   landing/legal, `(auth)` for login/signup/2FA, `(app)` for authenticated screens.
2. **Auth.** The Fastify `users` service is the only auth authority. The browser holds
   httpOnly cookies; Next server code forwards them to the API. No token in JS memory or
   storage. Route protection checks the session server-side, and the API still enforces it.
3. **Data fetching.** One typed API client (`lib/api.ts`) for server and client use. Every
   fetch handles loading, empty, error and unauthorised (redirect to `/login` once, no
   loops). Independent requests run in `Promise.all`.
4. **Forms.** Zod schemas from `services/shared` (or `packages/shared`), with inline field
   errors, a disabled submit while pending, and server errors shown in a toast or under
   the field. Server-side validation still applies.
5. **i18n.** EN, ES and FR ship together: every user-facing string goes through the i18n
   layer, and new keys are added to all three catalogs in the same change. Reuse the
   existing JSON catalogs from `services/frontend/src/i18n/locales/`.
6. **Game.** The canvas client is a client component that renders from server snapshots
   (see `realtime-rule.md`). It is `dynamic(..., { ssr: false })` when it touches `window`.
7. **Accessibility.** Keyboard-reachable everything, visible focus rings, labelled inputs,
   `aria-live` for toasts and match state, AA contrast (glow effects never carry meaning on
   their own), and `prefers-reduced-motion` turns off scanlines, flicker and parallax.
8. **No console noise.** No `console.log`; zero errors or warnings in the browser console,
   hydration warnings included.
9. **Components.** Reuse the design system in `components/ui` (see `design-system.md`). A new
   widget that duplicates an existing primitive is a review finding.

## Verify before done

- `npm run lint` and `npx tsc --noEmit` in the app; paste the results.
- Open every changed screen in the browser at desktop and 375 px width, with the console
  open, and say what you saw. If you couldn't open it, say so and list the exact steps.
