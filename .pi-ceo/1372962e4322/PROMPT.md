# Task Brief

[HIGH] [UI/UX] CARSI discipline-token namespace + 4-PR polish sequence

Description:
## Context

Re-run research agent 2026-04-18 corrected the previous hallucinated [DESIGN.md](<http://DESIGN.md>) spec. Actual state verified:

* Flat Next.js 16 App Router (NOT monorepo — routes live at `app/(public)/courses/`).
* Outfit + DM_Sans already wired via `next/font` — **reject** [DESIGN.md](<http://DESIGN.md>)'s Inter proposal.
* shadcn at `src/components/ui/` with no `components.json` (CLI won't work — manual edits only).
* Existing `--primary` is brand-critical — do NOT overwrite.

## Scope (4-PR sequence)

### PR 1 — Discipline-token namespace

* Add new CSS vars under `--discipline-*` prefix (water/fire/mould/microbial/biohazard).
* HSL only. No `--primary` reassignment.
* Export as Tailwind utility via `tailwind.config` `extend.colors.discipline`.

### PR 2 — Glass utilities

* Ship `.glass-sm`, `.glass-md`, `.glass-lg` backdrop-filter classes.
* Tokenise blur radius + surface opacity.

### PR 3 — shadcn drift fixes

* Audit all `src/components/ui/` files for manual divergence from canonical shadcn.
* Document intentional diffs in `src/components/ui/README.md`.
* Add `components.json` to lock config for future CLI use.

### PR 4 — Course-card polish

* Lift discipline accent to card border (2px `--discipline-{slug}`).
* Tabular-nums on lesson counts and duration.
* Skeleton loaders on `(public)/courses/` route.

## Acceptance

* `npm run typecheck` (or `tsc --noEmit`) clean
* `npm run build` succeeds
* Existing Outfit/DM_Sans stack untouched
* No `--primary` mutation

## Source

Corrected research output 2026-04-18 — supersedes prior hallucinated spec.

Linear ticket: GP-335 — https://linear.app/unite-group/issue/GP-335/uiux-carsi-discipline-token-namespace-4-pr-polish-sequence
Triggered automatically by Pi-CEO autonomous poller.


## Session: 1372962e4322
