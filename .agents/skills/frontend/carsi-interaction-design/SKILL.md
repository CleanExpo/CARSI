---
name: carsi-interaction-design
description: Defines navigation, affordances, states, and usability for CARSI controls. Use for forms, wizards, dashboards, and lesson navigation.
---

# CARSI Interaction Design

## When to use

Trigger terms: `UX`, `navigation`, `states`, `empty state`, `loading`, `error state`.

## Engineering principle

See `../../references/engineering-principle.md`.

## Workflow

1. Read `../../references/engineering-principle.md`.
2. Load authoritative docs from `../../references/authoritative-docs.md` for this task.
3. Inspect existing implementation before adding patterns or dependencies (`../../references/approved-libraries.md`).
4. Define acceptance criteria and which quality gates apply (`../../references/quality-gates.md`).
5. Implement minimal diff; verify before marking done.

## Focus for this discipline

- Every control needs default, loading, error, and success where relevant.
- Radix primitives for complex widgets; keyboard operable.

## Acceptance criteria

- Outcome stated for restoration professionals and business metrics.
- No new dependencies without `approved-libraries.md` checklist.
- Applicable gates from `../../references/quality-gates.md` executed or explicitly deferred with reason.
