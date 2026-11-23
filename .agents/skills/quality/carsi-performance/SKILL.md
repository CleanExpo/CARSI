---
name: carsi-performance
description: Optimises Core Web Vitals, bundles, and media loading for CARSI. Use when adding client JS, images, video, or heavy components.
---

# CARSI Performance

## When to use

Trigger terms: `performance`, `LCP`, `bundle`, `lazy load`, `CWV`.

## Engineering principle

See `../../references/engineering-principle.md`.

## Workflow

1. Read `../../references/engineering-principle.md`.
2. Load authoritative docs from `../../references/authoritative-docs.md` for this task.
3. Inspect existing implementation before adding patterns or dependencies (`../../references/approved-libraries.md`).
4. Define acceptance criteria and which quality gates apply (`../../references/quality-gates.md`).
5. Implement minimal diff; verify before marking done.

## Focus for this discipline

- Media budgets in AGENTS.md; avoid unnecessary client bundles.

## Acceptance criteria

- Outcome stated for restoration professionals and business metrics.
- No new dependencies without `approved-libraries.md` checklist.
- Applicable gates from `../../references/quality-gates.md` executed or explicitly deferred with reason.
