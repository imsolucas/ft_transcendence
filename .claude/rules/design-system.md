---
description: Visual direction and design-system rules — retro CRT / synthwave. Tokens, typography, components, motion, accessibility guard-rails. Apply for any UI, styling or component work.
paths:
  - "services/frontend/src/**"
  - "apps/web/**"
---

# Design system — retro CRT / synthwave

The user picked **retro CRT / synthwave**. The goal is "an arcade cabinet you can read":
the atmosphere comes from the frame (scanlines, glow, grid horizon), and the content
surfaces stay calm and legible. The old UI failed because everything glowed at once.

## Principles

1. **One loud thing per screen.** Usually the primary CTA or the live score. Everything
   else is quiet.
2. **Neon is for meaning.** Magenta = primary action / you. Cyan = info / opponent /
   links. Amber = warning / timers. Green = online / success. Red = danger / loss. Don't use
   glow decoratively on body text.
3. **Dark, deep surfaces.** Night-purple to near-black backgrounds with 3 elevation steps.
   No full-page multi-stop gradients behind content.
4. **CRT effects live in the frame.** Scanlines, vignette, slight curvature and noise sit on
   a fixed overlay (`pointer-events: none`) and stay at low opacity. They never sit behind
   form text, and `prefers-reduced-motion` (plus a user toggle) turns them off.

## Tokens (CSS variables; Tailwind reads them)

Exact values are finalised in Phase 1 from the chosen Claude Design mock. Names are fixed:

- Surfaces: `--bg` (page), `--surface-1`, `--surface-2`, `--surface-3`, `--border`, `--border-strong`
- Text: `--fg`, `--fg-muted`, `--fg-subtle`
- Accents: `--neon-magenta`, `--neon-cyan`, `--neon-amber`, `--neon-green`, `--neon-red`, each
  with a `-glow` variant (rgba for shadows)
- Effects: `--scanline-opacity`, `--glow-sm`, `--glow-md`, `--radius-sm|md|lg`
- Typography: `--font-display` (pixel/arcade display face for logo, headings and scores),
  `--font-body` (clean sans for UI text), `--font-mono` (timers, stats, codes)

All colours come from tokens; raw hex values in components are a review finding.
Text/background pairs must meet WCAG AA (4.5:1 body, 3:1 large text and UI). The display
face is never used below 14 px or for paragraphs.

## Component inventory (minimum)

Button (primary/secondary/ghost/danger, sizes, loading), IconButton, Input, Label,
FormField (label + input + error), Select/Dropdown, Checkbox/Switch, Card/Panel, Dialog/Modal,
Toast, Tabs, Tooltip, Avatar (+ presence dot), Badge, Skeleton, Spinner, EmptyState,
plus game-specific: ScoreBoard, PlayerChip, MatchCard, BracketView, CountdownOverlay,
ReconnectingOverlay, CRTFrame (the overlay).

Each component has every state: default, hover, focus-visible, active, disabled,
loading and error where they apply. Focus rings are a solid 2 px accent outline,
never glow alone.

## Implementation

shadcn/ui provides the accessible primitives (Radix under the hood). Restyle every one
with the tokens above; a component that still looks like default shadcn is a review
finding. Framer Motion handles animation, and every animated component reads
`useReducedMotion()`.

## Motion

- 150–250 ms ease-out for UI transitions. A short "power-on" flicker on the first
  landing render is fine; a looping flicker on content is not.
- Game feedback (score pop, hit flash) can be punchier, but stays under 400 ms.
- Everything respects `prefers-reduced-motion`.

## Review greps (UI diffs)

```bash
git diff | grep -nE '^\+.*#[0-9a-fA-F]{3,8}\b'          # raw hex in components → token
git diff | grep -nE '^\+.*innerHTML'                     # banned with dynamic values
git diff | grep -nE '^\+.*(animate-pulse|animate-ping)'  # check reduced-motion handling
git diff | grep -nE '^\+.*bg-gradient-to-[a-z]+ from-.* via-.* via-'  # multi-stop page gradients
```
