---
name: carsi-security-review
description: Reviews permissions, validation, and vulnerability exposure for CARSI changes. Use before merging auth, admin, payment, or data-export work.
---

# CARSI Security Review

## When to use

Trigger terms: `security review`, `permissions`, `vulnerability`.

## Engineering principle

See `../../references/engineering-principle.md`.

## Workflow

1. Read `../../references/engineering-principle.md`.
2. Load authoritative docs from `../../references/authoritative-docs.md` for this task.
3. Inspect existing implementation before adding patterns or dependencies (`../../references/approved-libraries.md`).
4. Define acceptance criteria and which quality gates apply (`../../references/quality-gates.md`).
5. Implement minimal diff; verify before marking done.

## Focus for this discipline

- CARSI_VERIFICATION_GATE.md
- docs/specs/spm-security-remediation-2026-07-12.md

## Acceptance criteria

- Outcome stated for restoration professionals and business metrics.
- No new dependencies without `approved-libraries.md` checklist.
- Applicable gates from `../../references/quality-gates.md` executed or explicitly deferred with reason.
