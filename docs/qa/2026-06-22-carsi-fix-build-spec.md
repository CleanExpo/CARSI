# CARSI — Technical Build Specification (Fix Blueprint)

**Date:** 2026-06-22
**Source:** Derived from the FAILED / MISSING items in `docs/qa/2026-06-22-carsi-whole-app-qa-audit.md`.
**Status:** BLUEPRINT FOR REVIEW — no code written yet. Each step lists the files to touch, the engineering logic, and how we verify it works before moving to the next step.

## Owner decisions locked
1. **Free roadshow registration emails the token AND shows it on screen** ("both").
2. **Duplicate registrations allowed** — no `(eventSlug, contactEmail)` uniqueness; the duplicate-email finding is **closed as by-design**.
3. **Waitlist comms (recommended):** waitlisted → screen + email "you're on the waitlist, no token yet"; confirmed → "you're confirmed" email with token; admin promote → "you're in!" email with token.
4. **Security criticals are scheduled first** (Phase A).

## Execution order & rationale
- **Phase A — Security criticals** first: largest blast radius, affects live paying customers, smallest changes.
- **Phase B — Roadshow branch gaps** next: finish what's already in flight on `feat/ccw-roadshow-registry-caps` before it ships.
- **Phase C — Data-flow robustness**: payment/enrolment race + idempotency hardening.
- **Phase D — Lower severity & verification**: polish and the runtime NEEDS-VERIFY checks.

Each step is independently testable. Do them in order; do not start a step until the previous one's verification passes.

---

# Phase A — Security criticals

### Step A1 — Make `JWT_SECRET` fail loudly instead of using a public fallback
- **Files:** `src/lib/auth/session-jwt.ts:5`, `src/lib/config.ts` (validation), possibly a shared `getJwtSecret()` helper.
- **Logic:** Remove the hardcoded `'development-only-…'` fallback from the signing path. Introduce a single `getJwtSecret()` that: returns `process.env.JWT_SECRET` when set and ≥32 chars; in **development** only, allows an explicit dev default but logs a loud warning; in **production** (`NODE_ENV==='production'`) **throws at startup / first use** if unset or too short, so the app refuses to sign forgeable tokens. Apply the same helper to the admin token and password-reset token signers so no signer keeps the literal.
- **Verify:** Unit test `getJwtSecret()` — throws in prod-without-secret, returns the env value when set. Build passes. Manually grep that the literal string no longer appears in any signer. (Runtime: deploy with the var set; confirm login still works.)

### Step A2 — Stripe webhook must retry on real failures (stop silently dropping paid enrolments)
- **Files:** `app/api/lms/webhooks/stripe/route.ts:95–127`.
- **Logic:** In the enrolment `catch`, classify the error. `ALREADY_ON_TEAM` and already-enrolled (idempotent) → keep returning `200`. **Any other error** (DB/transient) → return a `5xx` (e.g. 500) so Stripe queues a retry for up to 3 days. Keep the structured `console.error`. Optionally add a breadcrumb (log the Stripe event id) for reconciliation.
- **Verify:** Unit-test the classifier (idempotent reasons → 200; unknown error → 5xx). Add an integration check (when a DB is available) that a thrown enrolment error yields a non-2xx. Confirm the happy path still returns `{ received: true }` 200.

### Step A3 — Rate-limit LMS login & register; close the register-as-login brute-force path
- **Files:** `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`, reuse `src/lib/rate-limit.ts` (and note its serverless cold-start caveat). `src/lib/server/lms-auth.ts:131–136` (the "correct password on register → sign in" branch).
- **Logic:** Apply `applyRateLimit(`auth:${ip}`, N, window)` at the top of both routes (mirror the admin-login pattern). For register specifically, either (a) remove the silent "existing email + correct password = signed in" behavior and instead return a neutral "account already exists, please log in" without confirming the password, or (b) gate that branch behind the same rate limit. Preference: (a) — register should not behave like a login oracle. Document the serverless limitation and, if a shared store (Redis/Upstash) is available, note it as the durable follow-up.
- **Verify:** Unit/integration: N+1 rapid attempts return 429; a normal single attempt passes. Confirm register no longer reveals whether a password is correct for an existing email.

### Step A4 — Stop exposing the full session JWT to JavaScript (`carsi_token`)
- **Files:** `app/api/auth/login/route.ts:64–67`, `app/api/auth/register/route.ts:70`, `src/lib/api/client.ts:36` (reads the token), logout route.
- **Logic:** Make the session cookie `httpOnly: true`. The browser API client currently reads `carsi_token` to send a Bearer header; switch it to rely on the `httpOnly` cookie being sent automatically (same-origin) OR introduce a separate, non-sensitive CSRF token if a header is required. Net goal: the signing-grade JWT is never readable by page scripts, so an XSS can't lift a full session. Keep `sameSite: 'lax'`, `secure` in prod.
- **Verify:** Confirm authenticated API calls still succeed with the cookie alone (manual, running app). Confirm `document.cookie` no longer contains the session JWT. Regression-test login/logout.

### Step A5 — Server-side password rules + remove user enumeration
- **Files:** `app/api/auth/register/route.ts:13–17`, `app/api/auth/forgot-password/route.ts`.
- **Logic:** Register: `trim` the password and enforce a server-side minimum length (match the client's 8) and reject whitespace-only. Forgot-password: always return the same neutral success response ("If an account exists, we've sent a reset link") with a 200 regardless of whether the email exists — no 404 "no account found". (Optional: track reset tokens as single-use in the DB so a captured link can't be replayed within the hour.)
- **Verify:** Unit-test: 1-char / whitespace passwords rejected at the API; forgot-password returns identical body/status for known vs unknown email.

### Step A6 — Stop leaking internal error messages to clients
- **Files:** `app/api/auth/login/route.ts:72–79`, `app/api/auth/register/route.ts:77`, `app/api/cron/daily-report/route.ts:60–63`.
- **Logic:** Return a generic client message (e.g. `{ error: 'Login service unavailable' }`) and move `error.message` to a server-side `console.error` only. No DB host/port or driver text in the HTTP body.
- **Verify:** Unit/integration: a simulated DB error yields a generic body with no infrastructure detail; the detail still appears in server logs.

---

# Phase B — Roadshow branch gaps (`feat/ccw-roadshow-registry-caps`)

### Step B1 — Prevent overbooking under concurrent sign-ups
- **Files:** `src/lib/server/ccw-roadshow-registry.ts:60–92` (`createRoadshowRegistration`), same pattern in `promoteRegistration`.
- **Logic:** Run the count→decide→insert `$transaction` at a stronger isolation level — `isolationLevel: Prisma.TransactionIsolationLevel.Serializable` — OR take an explicit lock before the aggregate (e.g. a `SELECT … FOR UPDATE` on a per-event sentinel row, or a Postgres advisory lock keyed by event slug). Wrap the transaction in a small retry (e.g. up to 3 attempts) to handle serialization failures gracefully. The single-threaded decision logic is already correct and unit-tested; this only closes the race.
- **Verify:** Add a concurrency integration test (needs a DB): fire N parallel registrations against a cap and assert confirmed seats never exceed capacity, with the overflow waitlisted. Existing single-threaded unit tests must still pass.

### Step B2 — Show waitlisted registrants a waitlist screen (not "confirmed")
- **Files:** `app/(public)/events/ccw-roadshow/success/page.tsx:58–75`.
- **Logic:** Add `status?: 'confirmed' | 'waitlisted'` to the `searchParams` type and read it. Branch the UI: `confirmed` → existing "Free Entry Confirmed — show this token at check-in"; `waitlisted` → a distinct "You're on the waitlist for [City]" state that does **not** instruct them to show a token and explains they'll be emailed if a seat opens. Token may still be shown as a reference but clearly labelled "not yet valid for entry."
- **Verify:** Manual render with `?status=waitlisted` vs `?status=confirmed`. (Optional Playwright assertion once a DB is available.)

### Step B3 — Link the admin registry page into the admin nav
- **Files:** `src/components/admin/AdminShell.tsx:82–109` (and the active-state logic ~line 48).
- **Logic:** Add a `NavButton` for `/admin/ccw-roadshow` (label e.g. "CCW Roadshow") alongside the existing items, plus an `active` check for that path. No other change — the page, API, CSV and promote already work.
- **Verify:** Manual: the item appears, routes to the registry, highlights when active. Build passes.

### Step B4 — Registration emails: confirmed, waitlisted, and promotion (decisions #1 & #3)
- **Files:** new `src/lib/server/ccw-roadshow-registration-email.ts` (templates + send), `app/api/events/ccw-roadshow/checkout/route.ts` (call after persist), `app/api/admin/ccw-roadshow/promote/route.ts` (send on promote). Reuse the existing transactional-email sender (`src/lib/server/transactional-email.ts`) and the email-template patterns already used by `ccw-roadshow-booking-email.ts`.
- **Logic:** After a successful registration, send to `contactEmail`: if `confirmed` → "You're confirmed" with the entry token + event details; if `waitlisted` → "You're on the waitlist, no token yet." On admin promote success, send "You're in!" with the token. All sends are **best-effort and non-fatal** (wrapped so a mail failure never breaks the registration/promote response, matching the calendar-sync pattern). Keep showing the token on the success screen too (decision #1 = both).
- **Verify:** Unit-test template selection by status. Manual/dev-console send for each of the three emails. Confirm a mail-send failure does not change the API status code.

### Step B5 — Harden the admin registry GET route
- **Files:** `app/api/admin/ccw-roadshow/route.ts:19,31`.
- **Logic:** Wrap the `listRoadshowRegistry()` + `getRoadshowAvailability()` work in try/catch returning a clean `{ detail }` 500, matching the rest of the codebase. (Auth gate already present.)
- **Verify:** Unit/integration: a simulated DB error returns a clean JSON 500, not an unhandled rejection.

### Step B6 — Client double-submit guard (minor)
- **Files:** `src/components/marketing/CcwRoadshowBooking.tsx:122`.
- **Logic:** Add an early `if (status === 'loading') return;` at the top of `submitBooking` so a fast double-click can't fire two fetches before the disabled state renders. (With "allow repeats," this is convenience, not correctness — but it avoids accidental same-click duplicates.)
- **Verify:** Manual rapid double-click fires a single request (network panel). Build passes.

---

# Phase C — Data-flow robustness

### Step C1 — Make enrolment idempotent so the success page never 500s on a race
- **Files:** `src/lib/server/enrollment-service.ts:20–35`, callers `app/api/lms/enrollments/confirm/route.ts` and the Stripe webhook.
- **Logic:** Replace check-then-act with an atomic write: either `upsert` on the `@@unique([studentId, courseId])` key, or `create` inside try/catch that maps Prisma `P2002` → treat as `already_enrolled` (success), not a 500. Ensures the webhook + success-page race both resolve to "enrolled."
- **Verify:** Unit-test: concurrent/duplicate enrol calls both return `already_enrolled`/success, never throw to the caller. Confirm the success page shows access in the race scenario.

### Step C2 — Team purchase idempotency when payment reference is blank
- **Files:** `src/lib/server/team-course-purchase.ts:51–58`, webhook ref derivation (`webhooks/stripe/route.ts:96`).
- **Logic:** Ensure a stable, non-empty idempotency key always exists (use the Stripe `session.id`; never fall back to a shared literal like `'stripe_webhook'` that collapses all purchases to one key). Skip-dedup-when-null must not happen — derive a deterministic key or reject.
- **Verify:** Unit-test: two webhooks for the same session don't double-provision; two distinct sessions do provision separately.

### Step C3 — CCW success-page confirmation email idempotency
- **Files:** `app/(public)/events/ccw-roadshow/success/page.tsx:42–53`, `src/lib/server/ccw-roadshow-booking-email.ts:94–103`.
- **Logic:** Ensure the "already sent" flag is set whenever a send is attempted-and-not-retryable (not only when a live provider confirms delivery), so page refreshes in dev/staging don't resend. Coordinate with Step B4 so the paid-checkout path and free path don't both email. (If B4 centralizes registration email, retire the per-render trigger.)
- **Verify:** Reload the success page repeatedly in a dev email mode and confirm only one send attempt is logged.

### Step C4 — Wrap remaining unguarded admin DB calls
- **Files:** `app/api/admin/contacts/route.ts:65,113` (GET + PATCH), add `DATABASE_URL` guard to PATCH.
- **Logic:** Add try/catch returning clean JSON errors; add the same `DATABASE_URL` presence guard the GET path uses.
- **Verify:** Unit/integration: simulated DB error → clean 500; missing DATABASE_URL → graceful 503-style response, no stack trace.

---

# Phase D — Lower severity & verification

### Step D1 — Long-field handling
- **Files:** roadshow checkout `clean()` usage; any other silently-truncating inputs.
- **Logic (decision needed):** Either reject over-length names/goals with a 400 + message, or keep silent truncation. Recommend reject-with-message so users aren't surprised. Small change.
- **Verify:** Unit-test the chosen behavior.

### Step D2 — Confirm proxy-route auth (NEEDS-VERIFY)
- **Files:** `app/api/analytics/metrics/overview/route.ts`, `app/api/workflows/[id]/execute/route.ts`.
- **Logic:** Confirm the upstream services these proxy enforce their own auth; if not, add `getAdminSessionOrNull()`/session checks. This is an investigation step first, fix only if exposed.
- **Verify:** Trace the upstream; add a guard + test only if the endpoint returns sensitive data or performs actions unauthenticated.

### Step D3 — Runtime verification pass (needs a database + deploy)
- Re-run the NEEDS-VERIFY items from the audit against a running environment: admin-session behaviour under DB outage, CRM webhook latency on the registration response, admin-login pre-hydration render. Capture results.

---

## Definition of done for this spec
- Phase A complete and verified → the two 🔴 criticals and the brute-force/cookie/enumeration risks are closed.
- Phase B complete → the roadshow branch is safe to ship (no overbook, correct waitlist UX, discoverable admin page, registrants emailed).
- Phase C complete → no paid action silently lost; no double-provision.
- Phase D → polish + runtime confirmations.

Only after Phases A–C verify can a "production-ready" claim be made honestly.
