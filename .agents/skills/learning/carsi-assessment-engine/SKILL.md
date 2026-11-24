---
name: carsi-assessment-engine
description: Implements quizzes, attempts, scoring, and feedback for CARSI assessments. Use when changing quiz logic, grading, or results UI.
---

# CARSI Assessment Engine

## When to use

Trigger terms: `quiz`, `assessment`, `score`, `attempt`, `feedback`.

## Engineering principle

See `../../references/engineering-principle.md`.

## Workflow

1. Read `../../references/engineering-principle.md`.
2. Load authoritative docs from `../../references/authoritative-docs.md` for this task.
3. Inspect existing implementation before adding patterns or dependencies (`../../references/approved-libraries.md`).
4. Define acceptance criteria and which quality gates apply (`../../references/quality-gates.md`).
5. Implement minimal diff; verify before marking done.

## Focus for this discipline

- Meaningful feedback explaining why answers matter.
- Do not weaken integrity or certificate rules.

## Acceptance criteria

- Outcome stated for restoration professionals and business metrics.
- No new dependencies without `approved-libraries.md` checklist.
- Applicable gates from `../../references/quality-gates.md` executed or explicitly deferred with reason.
