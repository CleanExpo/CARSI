---
name: carsi-design-system
description: Applies token-driven typography, colour, spacing, and themes for CARSI. Use when styling components or extending the design system — separate from marketing art direction.
---

# CARSI Design System

## When to use

Trigger terms: `design tokens`, `theme`, `typography`, `colour`, `spacing`, `tailwind`.

## Engineering principle

See `../../references/engineering-principle.md`.

## Workflow

1. Read `../../references/engineering-principle.md`.
2. Load authoritative docs from `../../references/authoritative-docs.md` for this task.
3. Inspect existing implementation before adding patterns or dependencies (`../../references/approved-libraries.md`).
4. Define acceptance criteria and which quality gates apply (`../../references/quality-gates.md`).
5. Implement minimal diff; verify before marking done.

## Focus for this discipline

- Surfaces B and C: token-driven UI via Tailwind + CSS variables in `app/globals.css`.
- Fraunces / Manrope / JetBrains Mono per `visual-surfaces.md`.
- Extend `src/components/ui/` — no parallel design systems.

## Additional references

- `../../references/visual-surfaces.md`
## Acceptance criteria

- Outcome stated for restoration professionals and business metrics.
- No new dependencies without `approved-libraries.md` checklist.
- Applicable gates from `../../references/quality-gates.md` executed or explicitly deferred with reason.
