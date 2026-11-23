---
name: carsi-visual-qa
description: Runs browser-based visual inspection and SDA-style evidence for CARSI customer surfaces. Use before shipping marketing or major UI changes.
---

# CARSI Visual QA

## When to use

Trigger terms: `visual qa`, `screenshot`, `SDA`, `playwright visual`, `check-visuals`.

## Engineering principle

See `../../references/engineering-principle.md`.

## Workflow

1. Read `../../references/engineering-principle.md`.
2. Load authoritative docs from `../../references/authoritative-docs.md` for this task.
3. Inspect existing implementation before adding patterns or dependencies (`../../references/approved-libraries.md`).
4. Define acceptance criteria and which quality gates apply (`../../references/quality-gates.md`).
5. Implement minimal diff; verify before marking done.

## Focus for this discipline

- node scripts/premium-visuals/check-visuals.mjs
- See `../../references/premium-visuals-triage.md`.
- npm run media:manifest:sync
- npm run quality:sda-gate
- npm run quality:sda-capture (with dev server)
- Playwright at 390/768/1440; reduced-motion check.
- Owner review still required; scanner is heuristic.

## Acceptance criteria

- Outcome stated for restoration professionals and business metrics.
- No new dependencies without `approved-libraries.md` checklist.
- Applicable gates from `../../references/quality-gates.md` executed or explicitly deferred with reason.
