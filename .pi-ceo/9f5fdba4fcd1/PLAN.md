# Implementation Plan

**Session:** 9f5fdba4fcd1  
**Confidence:** 38%

**Risk notes:** ASSUMPTION: No specific bug was described in the brief — plan assumes the most likely failure area is session/auth middleware (updateSession in app/lib/api/middleware.ts) based on (a) the only recent commit being a dependency security sweep that could introduce regressions in jose JWT handling and (b) middleware.ts delegating all session logic to a single updateSession call. Secondary hypothesis is a Prisma adapter-pg issue post-dependency bump. Actual file paths under app/lib/ are inferred from the middleware.ts import pattern and standard Next.js conventions — they must be verified during Unit 1 reproduction. E2e spec filenames are guessed from the e2e/ directory listing; actual names may differ. Confidence is low until the actual bug report or error output is surfaced.

## Unit 1: Reproduce & Locate Failure
**Files:** `middleware.ts`, `app/api/auth/route.ts`, `app/(auth)/login/page.tsx`
**Test scenarios:**
  - happy path: unauthenticated request to protected route redirects to /login
  - edge case: session token present but expired triggers re-auth rather than 500
  - edge case: malformed Authorization header does not crash middleware

## Unit 2: Diagnose Session Middleware Root Cause
**Files:** `app/lib/api/middleware.ts`, `app/api/auth/route.ts`, `packages/shared/src/index.ts`
**Test scenarios:**
  - happy path: updateSession() refreshes valid JWT and passes request downstream
  - edge case: updateSession() with null session cookie returns early without throwing
  - edge case: jose JWT verify failure is caught and session cleared rather than propagated

## Unit 3: Diagnose Prisma / Database Query Failure
**Files:** `prisma/schema.prisma`, `prisma.config.ts`, `app/api/lms/route.ts`
**Test scenarios:**
  - happy path: LmsEnrollment unique constraint correctly rejects duplicate enrollment
  - edge case: Prisma adapter-pg connection pool exhaustion returns 503 not unhandled rejection
  - edge case: cascading delete on LmsCourse removes child Modules and Lessons atomically

## Unit 4: Apply Minimal Targeted Fix
**Files:** `app/lib/api/middleware.ts`, `app/api/auth/route.ts`, `middleware.ts`
**Test scenarios:**
  - happy path: fixed code path resolves the reproduced failure condition end-to-end
  - edge case: fix does not introduce new redirect loops or token refresh storms
  - edge case: API routes excluded from middleware matcher remain unaffected

## Unit 5: Verify Fix & Run E2E Regression Suite
**Files:** `e2e/auth.spec.ts`, `e2e/enrollment.spec.ts`, `e2e/dashboard.spec.ts`
**Test scenarios:**
  - happy path: all Playwright e2e specs pass with no new failures
  - edge case: previously failing scenario now passes without skipping
  - edge case: unrelated test paths (courses, pathways, credentials) are green

## Unit 6: Conventional Commit — fix: ...
**Files:** `middleware.ts`, `app/lib/api/middleware.ts`
