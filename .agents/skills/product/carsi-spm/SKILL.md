---
name: carsi-spm
description: Produces decision-grade specs before customer-facing or high-risk build work on CARSI. Use for new marketing pages, commerce flows, course surfaces, or security-sensitive features. Includes media plan and verification plan.
---

# CARSI SPM (Spec Before Build)

## When to use

Trigger terms: `spec`, `spm`, `/spm`, `plan page`, `media manifest`.

## Engineering principle

See `../../references/engineering-principle.md`.

## Workflow

1. Read `../../references/engineering-principle.md`.
2. Load authoritative docs from `../../references/authoritative-docs.md` for this task.
3. Inspect existing implementation before adding patterns or dependencies (`../../references/approved-libraries.md`).
4. Define acceptance criteria and which quality gates apply (`../../references/quality-gates.md`).
5. Implement minimal diff; verify before marking done.

## Focus for this discipline

- Read-only analysis first; authorise no writes by itself.
- Include media plan, dependencies, risks, and verification plan per `quality-gates.md`.
- Customer pages: align with `docs/agents/AGENTS.md` and `visual-surfaces.md` surface A.

## Additional references

- `docs/specs/`
- `docs/runbooks/spm-carsi-first-run-walk.md`
## Acceptance criteria

- Outcome stated for restoration professionals and business metrics.
- No new dependencies without `approved-libraries.md` checklist.
- Applicable gates from `../../references/quality-gates.md` executed or explicitly deferred with reason.
