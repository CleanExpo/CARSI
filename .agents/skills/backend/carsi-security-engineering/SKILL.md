---
name: carsi-security-engineering
description: Applies authentication, authorization, payment security, and audit patterns for CARSI. Use for auth, admin, Stripe, cron, and PII-touching changes.
---

# CARSI Security Engineering

## When to use

Trigger terms: `auth`, `security`, `stripe`, `session`, `admin`, `cron`, `PII`.

## Engineering principle

See `../../references/engineering-principle.md`.

## Workflow

1. Read `../../references/engineering-principle.md`.
2. Load authoritative docs from `../../references/authoritative-docs.md` for this task.
3. Inspect existing implementation before adding patterns or dependencies (`../../references/approved-libraries.md`).
4. Define acceptance criteria and which quality gates apply (`../../references/quality-gates.md`).
5. Implement minimal diff; verify before marking done.

## Focus for this discipline

- Follow `docs/agents/CLAUDE.md` and security specs under `docs/specs/`.
- Run `npm run check:secrets` when touching env or CI.
- Entitlements: purchase must map to course access correctly.

## Acceptance criteria

- Outcome stated for restoration professionals and business metrics.
- No new dependencies without `approved-libraries.md` checklist.
- Applicable gates from `../../references/quality-gates.md` executed or explicitly deferred with reason.
