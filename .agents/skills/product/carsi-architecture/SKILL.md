---
name: carsi-architecture
description: Enforces CARSI system boundaries, module layout, and data flow using the actual repository structure. Use when adding modules, refactoring, or designing cross-cutting features in the Next.js monolith.
---

# CARSI Architecture

## When to use

Trigger terms: `architecture`, `module`, `refactor`, `boundary`, `monolith`.

## Engineering principle

See `../../references/engineering-principle.md`.

## Workflow

1. Read `../../references/engineering-principle.md`.
2. Load authoritative docs from `../../references/authoritative-docs.md` for this task.
3. Inspect existing implementation before adding patterns or dependencies (`../../references/approved-libraries.md`).
4. Define acceptance criteria and which quality gates apply (`../../references/quality-gates.md`).
5. Implement minimal diff; verify before marking done.

## Focus for this discipline

- Default stack: Next.js App Router, Server Components, Prisma, PostgreSQL, Stripe.
- Place code where similar concerns already live (`app/`, `src/lib/`, `packages/`).
- No new services (FastAPI/LangGraph) unless explicitly in scope and present in repo.

## Acceptance criteria

- Outcome stated for restoration professionals and business metrics.
- No new dependencies without `approved-libraries.md` checklist.
- Applicable gates from `../../references/quality-gates.md` executed or explicitly deferred with reason.
