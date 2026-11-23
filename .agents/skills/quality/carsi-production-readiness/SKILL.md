---
name: carsi-production-readiness
description: Collects preflight evidence before CARSI release or deploy. Use when preparing production pushes or sign-off.
---

# CARSI Production Readiness

## When to use

Trigger terms: `production`, `release`, `deploy`, `readiness`.

## Engineering principle

See `../../references/engineering-principle.md`.

## Workflow

1. Read `../../references/engineering-principle.md`.
2. Load authoritative docs from `../../references/authoritative-docs.md` for this task.
3. Inspect existing implementation before adding patterns or dependencies (`../../references/approved-libraries.md`).
4. Define acceptance criteria and which quality gates apply (`../../references/quality-gates.md`).
5. Implement minimal diff; verify before marking done.

## Focus for this discipline

- docs/agent-framework/CARSI_VERIFICATION_GATE.md
- npm run audit:verify

## Acceptance criteria

- Outcome stated for restoration professionals and business metrics.
- No new dependencies without `approved-libraries.md` checklist.
- Applicable gates from `../../references/quality-gates.md` executed or explicitly deferred with reason.
