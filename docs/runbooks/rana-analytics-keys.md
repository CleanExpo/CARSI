# Rana — analytics + error-tracking env vars (WS3 / GP-447 / GitHub #128)

Config-only runbook for the DigitalOcean (DO) App Platform env. No code changes needed to
deploy WS3 — every piece (GA4 Measurement Protocol, PostHog, Sentry) no-ops cleanly when
its env var is unset, so this can ship dark and be turned on var-by-var.

## What ships in this PR

| Instrumentation | Where | Fires |
|---|---|---|
| GA4 client events | `GoogleAnalytics.tsx`'s existing `gtag` | `course_view` (course detail page), `enrol_click` (Enrol button), `checkout_started` (redirect to Stripe) |
| GA4 server `purchase` event | Stripe webhook (`checkout.session.completed`, one-off course purchase only) | via Measurement Protocol, course slug + AUD value |
| PostHog client events | same three funnel events | mirrors the GA4 client events |
| Sentry | payment (`/api/lms/checkout`, Stripe webhook), enrolment (`/api/lms/enrollments/*`), CEC-certificate routes | server-side exceptions only |

**Boundary note:** the GA4 Measurement Protocol utility (`src/lib/server/ga4-measurement-protocol.ts`)
is intentionally generic so the parallel E1 annual-entitlement branch
(`feat/gp-441-e1-annual-entitlement`) can reuse it for `subscription_started`/`renewed`/`lapsed`
events later. This PR does not add or fire any `subscription_*` event.

## Env vars to set in DO

Set these in the DO App Platform dashboard (App → Settings → App-Level Environment Variables),
or via `doctl apps update <app-id> --spec app.yaml` if they get added to `app.yaml` — check with
whoever owns the DO deploy before adding secrets there, since `app.yaml` is committed to the repo.

| Var | Secret? | Purpose | Where to get it |
|---|---|---|---|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | No (public) | Already set — GA4 property `G-LF86765F5C`. No action unless rotating. | Existing. |
| `GA4_MEASUREMENT_PROTOCOL_API_SECRET` | **Yes** | Server-side GA4 `purchase` event auth. | GA4 Admin → Data Streams → (the web stream) → Measurement Protocol API secrets → Create. |
| `NEXT_PUBLIC_POSTHOG_KEY` | No (public, but treat as sensitive-ish — it's a write-only project key) | PostHog client init. | PostHog → Project Settings → Project API Key. |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | Optional. Defaults to `https://us.i.posthog.com` if unset. Only set if the PostHog project is EU-hosted (`https://eu.i.posthog.com`) or self-hosted. | PostHog → Project Settings → Project details. |
| `SENTRY_DSN` | **Yes** (DSNs are not truly secret but treat as config, not public) | Server-side error capture. | Sentry → Project Settings → Client Keys (DSN). Create a new project (platform: Next.js) if one doesn't exist for CARSI. |

None of these are required for the app to build or run — every helper (`ga4-measurement-protocol.ts`,
`posthog-client.ts`, `sentry.ts`) checks its own env var and returns/no-ops instead of throwing when
unset. Unit tests cover the no-op path for each.

## CSP note (why nothing else needs to change)

The app serves a strict nonce-based CSP on the authenticated app surface and a relaxed
(`unsafe-inline`) CSP on public/marketing pages (`src/lib/security/csp.ts`,
`src/lib/api/middleware.ts`). This PR adds `https://us.i.posthog.com` and `https://eu.i.posthog.com`
to `connect-src` — PostHog ships as an npm package (`posthog-js`) bundled into our own JS, not an
external `<script src>`, so it runs under the existing `script-src 'self'` and only needs a
`connect-src` allowance for its network calls. GA4's existing `googletagmanager.com` /
`google-analytics.com` allowlist entries already cover both the client script and the client-side
`gtag` calls; the server-side Measurement Protocol call happens from the Next.js server (webhook
handler), which is not subject to browser CSP at all. Sentry in this PR is server-only (no browser
SDK/script), so it also needs no CSP change.

## How to verify each, once the env vars are set

### 1. GA4 realtime (client events)

1. Deploy with `NEXT_PUBLIC_GA_MEASUREMENT_ID` set (already is).
2. Open GA4 → Reports → Realtime.
3. Visit a course detail page on the live site (e.g. `/courses/<any-published-slug>`) →
   confirm `course_view` appears in the realtime event list within ~30s.
4. Click "Enrol" on that course → confirm `enrol_click` appears.
5. If the course is paid, continue to checkout → confirm `checkout_started` appears just before
   the redirect to Stripe.

### 2. GA4 server `purchase` event (Measurement Protocol)

1. Set `GA4_MEASUREMENT_PROTOCOL_API_SECRET`.
2. Run a **Stripe test-mode** checkout end-to-end against a sandbox/staging deploy (Stripe test
   card `4242 4242 4242 4242`) for a paid course.
3. Once the webhook processes `checkout.session.completed`, check GA4 realtime (or DebugView with
   `debug_mode`) for a `purchase` event carrying `course_slug` and `value` (AUD). Allow up to 60s
   (GA4 realtime latency) — this is the §14/§15 AC8 proof point.
4. If it does not appear: check server logs for `[ga4-measurement-protocol] failed to send event`
   (network/auth failure — the call never throws, so fulfilment still succeeds even if this fails).

### 3. PostHog live events

1. Set `NEXT_PUBLIC_POSTHOG_KEY` (and `NEXT_PUBLIC_POSTHOG_HOST` if not US-hosted).
2. Deploy, then open PostHog → Activity → Live events (or the project's event explorer).
3. Repeat the course-view / enrol-click / checkout-started flow from step 1 above.
4. Confirm all three events appear in PostHog with the same `course_slug` property.

### 4. Sentry forced test error

1. Set `SENTRY_DSN`.
2. Deploy, then trigger a real failure on one of the instrumented routes — the simplest is to
   POST to `/api/lms/checkout` with `STRIPE_SECRET_KEY` temporarily unset in a throwaway/staging
   env (returns the existing 503, not a 500 — not a Sentry-worthy path) **or** more reliably,
   temporarily point `DATABASE_URL` at an unreachable host in staging and hit
   `/api/lms/enrollments/[enrollmentId]/certificate` to force the existing catch block.
   Alternatively add a temporary `throw new Error('sentry test')` behind a query flag, deploy to
   staging only, trigger it once, then revert — do not leave a manual crash trigger in production
   code.
3. Confirm the error appears in Sentry → Issues within a couple of minutes, tagged with the
   `route` value (e.g. `/api/lms/webhooks/stripe`, `/api/lms/checkout`,
   `/api/lms/enrollments/[enrollmentId]/certificate`).
4. Revert whatever forced the test error before leaving staging.

## What this PR could NOT verify without live keys

This PR ships with `npm run test:unit` covering the no-op behaviour and payload shape of every
new utility (GA4 Measurement Protocol, Sentry wrapper) against mocked `fetch`/no DSN. It could
**not** verify, and Rana (or whoever holds the real keys) must confirm per the steps above:

- A real GA4 realtime pageview/event actually rendering in the GA4 UI.
- A real PostHog live event actually rendering in the PostHog UI.
- A real Sentry issue actually appearing in the Sentry UI from a forced production-shaped error.
- End-to-end Stripe test-mode checkout → webhook → GA4 `purchase` event latency (the spec's ≤60s
  window) under real network conditions.

These require the actual `GA4_MEASUREMENT_PROTOCOL_API_SECRET`, `NEXT_PUBLIC_POSTHOG_KEY`, and
`SENTRY_DSN` values plus a deployed environment — none of which exist in the authoring sandbox.
