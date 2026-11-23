---
name: carsi-e2e-testing
description: Authors and runs Playwright journeys for CARSI user flows. Use when adding or changing end-to-end behaviour.
---

# CARSI E2E Testing

## When to use

Trigger terms: `e2e`, `playwright`, `user journey`.

## Engineering principle

See `../../references/engineering-principle.md`.

## Workflow

1. Read `../../references/engineering-principle.md`.
2. Load authoritative docs from `../../references/authoritative-docs.md` for this task.
3. Inspect existing implementation before adding patterns or dependencies (`../../references/approved-libraries.md`).
4. Define acceptance criteria and which quality gates apply (`../../references/quality-gates.md`).
5. Implement minimal diff; verify before marking done.

## Focus for this discipline

- config/playwright.config.ts
- e2e/
- npm run test:e2e

## Acceptance criteria

- Outcome stated for restoration professionals and business metrics.
- No new dependencies without `approved-libraries.md` checklist.
- Applicable gates from `../../references/quality-gates.md` executed or explicitly deferred with reason.
