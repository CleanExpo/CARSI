---
name: carsi-accessibility
description: Validates WCAG-oriented keyboard, focus, semantics, and screen reader support for CARSI UI. Use when changing markup, components, or flows.
---

# CARSI Accessibility

## When to use

Trigger terms: `accessibility`, `a11y`, `WCAG`, `keyboard`, `axe`.

## Engineering principle

See `../../references/engineering-principle.md`.

## Workflow

1. Read `../../references/engineering-principle.md`.
2. Load authoritative docs from `../../references/authoritative-docs.md` for this task.
3. Inspect existing implementation before adding patterns or dependencies (`../../references/approved-libraries.md`).
4. Define acceptance criteria and which quality gates apply (`../../references/quality-gates.md`).
5. Implement minimal diff; verify before marking done.

## Focus for this discipline

- npm run test:a11y
- @axe-core/playwright

## Acceptance criteria

- Outcome stated for restoration professionals and business metrics.
- No new dependencies without `approved-libraries.md` checklist.
- Applicable gates from `../../references/quality-gates.md` executed or explicitly deferred with reason.
