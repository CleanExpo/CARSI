# CARSI — Whole-App QA Inspection Audit

**Date:** 2026-06-22
**Method:** Read-only audit of the real codebase against a 5-pillar inspection checklist. No code was changed.
**Auditor role:** Lead Systems Architect (for a non-engineer owner)
**Scope:** Entire application (auth, payments, data flow, error handling, edge cases, navigation), including the in-progress CCW roadshow registry on branch `feat/ccw-roadshow-registry-caps`.

> How to read this: each item has **Status** (PASSED / FAILED / MISSING / NEEDS-VERIFY), **Evidence** (`file:line`), and **Systemic Impact** (what a real user/business feels). The "Fix-first" ranking at the top is the honest priority order.

---

## Executive summary — fix these in order

| # | Severity | Finding | Where | Pillar |
|---|----------|---------|-------|--------|
| 1 | 🔴 Critical | Stripe webhook returns **HTTP 200 even when the enrolment write fails** → Stripe never retries → paid customer permanently loses access, silently | `app/api/lms/webhooks/stripe/route.ts:95–127` | 3 |
| 2 | 🔴 Critical | `JWT_SECRET` falls back to a **known public string**; if unset in prod, anyone can forge a session for any user (incl. admin) | `src/lib/auth/session-jwt.ts:5`, `src/lib/config.ts:14` | 3/4 |
| 3 | 🟠 High | **Roadshow can overbook past the venue cap** under simultaneous sign-ups (transaction runs at READ COMMITTED, no row lock) | `src/lib/server/ccw-roadshow-registry.ts:60–92` | 4 |
| 4 | 🟠 High | **Waitlisted registrant is shown "Free Entry Confirmed"** — success page ignores the `status` param | `app/(public)/events/ccw-roadshow/success/page.tsx:58–75` | 2/5 |
| 5 | 🟠 High | **No rate limit on LMS login/register**, and register doubles as a brute-force login path (`same password = sign in`) | `app/api/auth/login/route.ts`, `src/lib/server/lms-auth.ts:131–136` | 1 |
| 6 | 🟠 High | **Free-entry roadshow sends no confirmation email** — if the redirect fails the attendee has no token and no recovery | `app/api/events/ccw-roadshow/checkout/route.ts` | 2 |
| 7 | 🟡 Medium | **Admin roadshow registry page is orphaned** — not linked in the admin nav; only reachable by typing the URL | `src/components/admin/AdminShell.tsx:82–109` | 5 |
| 8 | 🟡 Medium | `carsi_token` cookie is `httpOnly: false` — the full session JWT is readable by any script; XSS = account takeover | `app/api/auth/login/route.ts:64–67` | 1 |
| 9 | 🟡 Medium | Some admin routes do **raw DB calls with no try/catch** → 500s / possible stack traces | `app/api/admin/contacts/route.ts:65,113`; `app/api/admin/ccw-roadshow/route.ts:19,31` | 3/5 |
| 10 | 🟡 Medium | **No duplicate-registration guard** (`eventSlug + contactEmail`) → one person can take many seats and distort the cap | `prisma/schema.prisma` (roadshow models), checkout route | 2/4 |
| 11 | 🟢 Low | User enumeration on forgot-password (404 "no account"); whitespace-only passwords accepted at register; silent truncation of long names/goals | several | 1/4 |

**The five most dangerous are #1–#5.** #1 and #2 are pre-existing platform risks that affect real paying customers right now. #3, #4, #6, #7 are in the roadshow feature we just built — see "Roadshow build gaps" at the end.

---

## Pillar 1 — User Authentication

- **Signup creates exactly one record** — **PASSED.** Multi-layered dedup (pre-check + `P2002` catch) at `src/lib/server/lms-auth.ts:108–138`. Note: re-registering with the correct password silently signs you in (intentional, slightly confusing).
- **Login issues valid cookie; bad creds rejected** — **PASSED.** `app/api/auth/login/route.ts:34`; inactive accounts rejected the same way (no side-channel).
- **Passwords hashed; reset works** — **PASSED (bcryptjs cost 12).** Two gaps: register has **no server-side min length** (`register/route.ts:17` only checks non-empty — a 1-char password is accepted via direct API), and forgot-password **enumerates users** (`forgot-password/route.ts` returns 404 "No account found"). Reset tokens are stateless JWTs with **no single-use tracking** — reusable within the 1-hour window.
- **Admin auth separate & enforced** — **PASSED.** Distinct admin cookie + LMS-role/allowlist elevation; every `/api/admin/*` route calls `getAdminSessionOrNull()`; RSC layout guards `/admin` pages (`app/(admin)/admin/layout.tsx:13–29`).
- **Middleware protects all routes** — **PASSED, with notes.** Middleware excludes `/api/*` by design, so API auth relies on per-route guards (present where checked). **NEEDS-VERIFY:** `app/api/analytics/metrics/overview` and `app/api/workflows/[id]/execute` have **no local auth guard** — confirm the upstream they proxy enforces auth.
- **Session expiry/logout** — **PASSED.** 7-day JWT, `jose` validates `exp`/signature; logout clears cookies. Stateless tokens can't be force-revoked before expiry (standard JWT trade-off).
- **Rate limiting** — **FAILED for LMS login/register** (none); **PASSED for admin login** (`admin/login/route.ts:70`). The in-process limiter resets on serverless cold-starts (`src/lib/rate-limit.ts`).

**Most dangerous (P1):** No rate limit on `/api/auth/login` **or** `/api/auth/register`, and register's "same password = sign in" makes it a second brute-force vector against any account (including admin-elevated LMS users).

---

## Pillar 2 — Core Data Flow

- **Stripe checkout → enrolment agree** — **FAILED (race).** `src/lib/server/enrollment-service.ts:20–35` is check-then-act, not atomic. Webhook + success-page confirm can race; the DB unique constraint prevents a double row but throws `P2002`, surfacing a **500 on the success page** while the other path actually enrolled them. User thinks they have no access.
- **Enrolment & progress persist** — **PASSED.** `upsert` everywhere; progress recomputed from DB (`enrollment-service.ts`).
- **Roadshow persists + CRM + token** — **PASSED.** DB write inside `$transaction`; token `@unique`; CRM logged to `CrmEventLog` before the HTTP call (recoverable). **Observation:** no `(contactEmail, eventSlug)` uniqueness → repeat registrations inflate seats.
- **Idempotency (money/records)** — **FAILED.** (a) enrolment race above; (b) team purchase dedup is **skipped when `paymentReference` is null/blank** (`team-course-purchase.ts:51–58`); (c) CCW success page calls `sendBookingConfirmationIfNeeded` on **every render** — in non-prod email modes the "sent" flag is never set, so refreshes resend.
- **IICRC/CEC saved & retrievable** — **PASSED.** `@@unique([enrollmentId])`, idempotent, admin list/retry behind auth.
- **No critical data transient-only** — **FAILED.** Free-entry roadshow returns the token **only** in the HTTP response/URL; **no confirmation email is sent on the free path**, and the success page does not look the registration up by token. If the redirect is lost, the attendee has no token and no self-service recovery (admin can recover from `CrmEventLog`).

**Most dangerous (P2):** Free-entry roadshow sends the registrant **no email** — token delivery depends entirely on the browser redirect succeeding.

---

## Pillar 3 — Error Handling

- **Clean 4xx/5xx, no stack traces** — **FAILED in spots.** `login/route.ts:72–79` and `register/route.ts:77` return `error.message` to the browser (a Prisma failure leaks the **DB host/port**). `admin/contacts/route.ts:65,113` do bare `await prisma.*` with no catch.
- **Stripe webhook logged & retryable** — **FAILED (top business risk).** `webhooks/stripe/route.ts:95–127` catches enrolment errors, logs, and **still returns 200**, so Stripe won't retry a transient DB failure → paid enrolment lost permanently. Only `ALREADY_ON_TEAM`/already-enrolled should return 200; everything else should be 5xx.
- **External-service failures non-fatal** — **PASSED (Calendar).** `ccw-roadshow-calendar.ts:20–59` catches all and returns false; promote route isolates it. **NEEDS-VERIFY (CRM latency):** `emitCrmEvent` is awaited in the checkout route, so a slow CRM URL delays the success response up to its 12s timeout (the LMS path correctly fire-and-forgets).
- **Missing env vars fail safe** — **FAILED (`JWT_SECRET`).** Falls back to a public literal (`session-jwt.ts:5`); only a `console.warn`, no hard fail. Stripe keys/webhook secret/DATABASE_URL are guarded (return 503) — good.
- **DB errors graceful** — **FAILED (2 routes):** `admin/contacts` and `admin/ccw-roadshow` GET have no try/catch and no `DATABASE_URL` guard. Most other routes wrap errors correctly.

**Most dangerous (P3):** the Stripe-webhook-returns-200-on-failure bug (#1 overall).

---

## Pillar 4 — Edge Cases

- **Empty/whitespace rejected server-side** — **MOSTLY PASSED.** Roadshow `clean()` + `if(!x)` is solid. Gap: register doesn't trim password, so `"   "` is accepted → user later locked out.
- **Uploads bounded** — **PASSED.** `admin/upload/route.ts:10–45` caps 5 MB + MIME allowlist, admin-only. No public upload route; certificates are server-generated.
- **Double-click / resubmit** — **PARTIAL.** Client disables the button but has no `if (status==='loading') return` early guard (`CcwRoadshowBooking.tsx:122`), so a fast double-click can fire two fetches; **no `(eventSlug,contactEmail)` unique constraint** server-side → duplicate registrations possible. Enrolment race yields a 500 (see P2).
- **Capacity boundaries / overbook** — **FAILED (concurrency).** `ccw-roadshow-registry.ts:60` runs at Postgres default **READ COMMITTED** with no `SELECT … FOR UPDATE`; two requests that each fit can both read the same count and both confirm → **overbooks past 10/12**. Single-threaded logic (whole-party waitlist) is correct; the race is the hole. Fix: `isolationLevel: Serializable` or a row lock.
- **Tokens/slugs/IDOR** — **PASSED.** Reset tokens, event slugs validated; certificate/lesson/quiz routes scope by `claims.sub` (ownership enforced). Public credential endpoint is intentional and UUID-guarded (NEEDS-VERIFY only as policy).
- **Boundary inputs** — **PARTIAL.** Long names/goals **silently truncated** (120/600 chars) with no notice; email regex is minimal but acceptable; team seat counts reject zero/negative. Register whitespace-password gap repeats here.

**Most dangerous (P4):** the overbook race (#3 overall).

---

## Pillar 5 — Page-to-Page Connections

- **Login & checkout landing** — **PASSED.** `getPostLoginRedirectPath` honours a safe `?next=`, blocks `/admin` for non-admins; payment success routes via sanitized `learn_url`.
- **Confirmed vs waitlist reflected** — **FAILED.** Checkout sends `status` in the URL but `success/page.tsx:58–72` doesn't read it; since both states get a token, a **waitlisted user sees "Free Entry Confirmed — show this token at check-in"** and will be turned away at the door.
- **Admin reaches registry; CSV/promote/409** — **CSV + promote + 409 surfacing PASSED**, but the **registry page is orphaned** — no `NavButton` in `AdminShell.tsx:82–109`. Operationally invisible.
- **Dead links / orphans** — **PARTIAL.** Legacy lesson page quiz button points to a non-existent `/courses/[slug]/quiz/[quizId]` (404), but that legacy flow is superseded by `/dashboard/learn/[slug]`. Global `not-found.tsx` is clean.
- **Redirects after auth/payment** — **PASSED.** Unauthorized → `/login?next=` or `/dashboard/student`; intentional admin pass-through to the layout guard.
- **Course → lesson → progress → certificate** — **PASSED on the primary `/dashboard/learn/[slug]` path** end-to-end; the legacy lesson path is broken (dead quiz link, no progress UI) but superseded.

**Most dangerous (P5):** waitlisted user told they're confirmed (#4 overall).

---

## Roadshow build gaps (our current branch)

Being direct: the audit found real gaps in the feature we just built. Four were not covered by the implementation plan and should be folded into finishing the branch:

1. **Overbook race** — add `isolationLevel: Serializable` (or a row lock) to the `$transaction` in `ccw-roadshow-registry.ts`. Our unit tests cover the single-threaded logic but not concurrency.
2. **Waitlist success page** — `success/page.tsx` must read `status` and show a distinct "You're on the waitlist" screen (no "show this token at the door"). The plan set the param but never updated the page.
3. **Orphaned admin page** — add a `NavButton` for `/admin/ccw-roadshow` in `AdminShell.tsx`. The plan created the page but never linked it.
4. **No confirmation email on the free path** — decide whether registrants get an email with their token (recommended) vs token-on-screen only.
5. **Admin GET route hardening** — wrap `admin/ccw-roadshow` GET in try/catch (matches the rest of the codebase).
6. **Duplicate-email policy** — decide whether to add a `(eventSlug, contactEmail)` guard.

These are additive to the existing branch, not rework of it.

---

## Open items only you (the owner) can decide

1. **Email on free roadshow registration?** Send the token by email (recommended) or screen-only?
2. **Duplicate registrations** — one email = one registration per event, or allow repeats?
3. **Waitlist comms** — what should a waitlisted person be told, and who/what promotes them?
4. **Auth hardening priority** — rate limiting + `JWT_SECRET` hard-fail + `carsi_token` httpOnly are security must-dos for a live paid product; confirm we schedule them.
5. **"% complete" honesty** — this is not production-ready until #1 (Stripe retry) and #2 (`JWT_SECRET`) are fixed; everything else is real but lower-blast-radius.

---

*Verification note:* This is a static audit. Items marked NEEDS-VERIFY (CRM latency, analytics/workflow proxy auth, admin-login pre-hydration render) require a running environment with a database to confirm.
