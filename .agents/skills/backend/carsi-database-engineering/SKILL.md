---
name: carsi-database-engineering
description: Handles Prisma schema changes, migrations, queries, and data integrity for CARSI PostgreSQL. Use for schema updates, new models, or performance-sensitive queries.
---

# CARSI Database Engineering

## When to use

Trigger terms: `prisma`, `migration`, `schema`, `postgresql`, `database`.

## Engineering principle

See `../../references/engineering-principle.md`.

## Workflow

1. Read `../../references/engineering-principle.md`.
2. Load authoritative docs from `../../references/authoritative-docs.md` for this task.
3. Inspect existing implementation before adding patterns or dependencies (`../../references/approved-libraries.md`).
4. Define acceptance criteria and which quality gates apply (`../../references/quality-gates.md`).
5. Implement minimal diff; verify before marking done.

## Focus for this discipline

- Run `npm run check:migrations` for migration work.
- Bounded `findMany`, indexes, and auth-aware access per verification gate.
- No destructive data changes without explicit user approval.

## Acceptance criteria

- Outcome stated for restoration professionals and business metrics.
- No new dependencies without `approved-libraries.md` checklist.
- Applicable gates from `../../references/quality-gates.md` executed or explicitly deferred with reason.
