---
name: carsi-nextjs-engineering
description: Implements routing, RSC/client boundaries, caching, and server actions for CARSI on Next.js 16+. Use when building pages, layouts, route handlers, or server actions.
---

# CARSI Next.js Engineering

## When to use

Trigger terms: `next.js`, `app router`, `RSC`, `server action`, `route handler`, `page.tsx`.

## Engineering principle

See `../../references/engineering-principle.md`.

## Workflow

1. Read `../../references/engineering-principle.md`.
2. Load authoritative docs from `../../references/authoritative-docs.md` for this task.
3. Inspect existing implementation before adding patterns or dependencies (`../../references/approved-libraries.md`).
4. Define acceptance criteria and which quality gates apply (`../../references/quality-gates.md`).
5. Implement minimal diff; verify before marking done.

## Focus for this discipline

- Read `node_modules/next/dist/docs/` before using unfamiliar Next APIs.
- Server Components by default; client components only for interactivity.
- Match existing patterns in `app/` and `src/lib/server/`.

## Acceptance criteria

- Outcome stated for restoration professionals and business metrics.
- No new dependencies without `approved-libraries.md` checklist.
- Applicable gates from `../../references/quality-gates.md` executed or explicitly deferred with reason.
