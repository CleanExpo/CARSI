---
name: carsi-api-contracts
description: Designs and implements API routes and server contracts with Zod validation and clear errors. Use for `app/api/**`, webhooks, and integration endpoints.
---

# CARSI API Contracts

## When to use

Trigger terms: `api`, `route.ts`, `webhook`, `zod`, `validation`.

## Engineering principle

See `../../references/engineering-principle.md`.

## Workflow

1. Read `../../references/engineering-principle.md`.
2. Load authoritative docs from `../../references/authoritative-docs.md` for this task.
3. Inspect existing implementation before adding patterns or dependencies (`../../references/approved-libraries.md`).
4. Define acceptance criteria and which quality gates apply (`../../references/quality-gates.md`).
5. Implement minimal diff; verify before marking done.

## Focus for this discipline

- Validate inputs; fail fast with safe, non-leaky error messages.
- Protected routes: session/admin guards before work (verification gate §1).
- Prefer existing error shapes used in neighbouring routes.

## Acceptance criteria

- Outcome stated for restoration professionals and business metrics.
- No new dependencies without `approved-libraries.md` checklist.
- Applicable gates from `../../references/quality-gates.md` executed or explicitly deferred with reason.
