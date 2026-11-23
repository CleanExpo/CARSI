---
name: carsi-coaching-experience
description: Implements Ask Coach and coaching workflows for CARSI. Use when changing AI coach UI, prompts, or coaching-related APIs.
---

# CARSI Coaching Experience

## When to use

Trigger terms: `coach`, `coaching`, `ask coach`, `AI tutor`.

## Engineering principle

See `../../references/engineering-principle.md`.

## Workflow

1. Read `../../references/engineering-principle.md`.
2. Load authoritative docs from `../../references/authoritative-docs.md` for this task.
3. Inspect existing implementation before adding patterns or dependencies (`../../references/approved-libraries.md`).
4. Define acceptance criteria and which quality gates apply (`../../references/quality-gates.md`).
5. Implement minimal diff; verify before marking done.

## Focus for this discipline

- Bounded AI; auth; no PII leakage in logs.

## Acceptance criteria

- Outcome stated for restoration professionals and business metrics.
- No new dependencies without `approved-libraries.md` checklist.
- Applicable gates from `../../references/quality-gates.md` executed or explicitly deferred with reason.
