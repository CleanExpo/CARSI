# Implementation Plan

**Session:** 1372962e4322  
**Confidence:** 28%

**Risk notes:** The brief specifies 'BUG — Bug Fix' but provides no description of the actual bug, affected feature, error message, or reproduction steps. The plan is structured around the Bug Fix workflow and the known repo topology (Next.js 16, Prisma 7, middleware-based auth, Stripe webhooks, LMS API routes). Key assumptions: (1) bug is likely in middleware auth/session handling or an API route, as these are highest-churn areas; (2) no unit test framework detected (only Playwright e2e), so verification relies on e2e tests and runtime inspection; (3) Prisma schema changes are NOT assumed — migration units omitted to stay minimal. Confidence is low due to total ambiguity of the actual bug. Once the bug is described, units 1–4 should be narrowed to 1–2 files.

## Unit 1: Reproduce & Diagnose: Identify failure condition and trace root cause
**Files:** `middleware.ts`, `app/api`, `prisma/schema.prisma`, `next.config.ts`
**Test scenarios:**
  - happy path: reproduce the exact failing request/action that triggers the bug
  - edge case: check if failure is environment-specific (dev vs prod, authenticated vs unauthenticated user)

## Unit 2: Inspect middleware and auth flow for session/routing bugs
**Files:** `middleware.ts`, `app/(auth)`, `src/lib/api/middleware.ts`
**Test scenarios:**
  - happy path: authenticated user can access protected routes without redirect loop
  - edge case: unauthenticated user is correctly redirected to login without 500 error

## Unit 3: Inspect API routes and Prisma data layer for data integrity or query bugs
**Files:** `app/api`, `prisma/schema.prisma`, `packages/schema`
**Test scenarios:**
  - happy path: API endpoint returns correct 200 response with expected payload
  - edge case: invalid or missing input returns proper 400/404 rather than unhandled 500

## Unit 4: Apply minimal targeted fix to the identified root cause file(s)
**Files:** `middleware.ts`, `app/api`, `packages/shared`, `src/lib/api/middleware.ts`
**Test scenarios:**
  - happy path: previously failing scenario now succeeds end-to-end
  - edge case: fix does not break adjacent features or introduce regressions in related routes

## Unit 5: Verify fix via E2E tests and manual spot-check
**Files:** `e2e/carsi-journeys.spec.ts`, `e2e/pre-production.spec.ts`, `e2e/prd-generation.spec.ts`
**Test scenarios:**
  - happy path: relevant Playwright spec passes without failures
  - edge case: no previously-passing tests are broken by the change

## Unit 6: Commit with conventional commit message (fix: ...)
