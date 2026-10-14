# Done contract — Wave 1 revenue-readiness (CARSI)

- Status: LOCKED (scope fixed by founder "go", 2026-10-14)
- Branch: `wave1/revenue-readiness`, base `origin/main` @ `b6e4bf3b`
- Builder: Claude (this session). Release, review and merge belong to the orchestrator and a human.
- Out of scope: push, PR, deploy, migrations, live Stripe, sending email, new dependencies,
  new pricing, new CEC/IICRC claims, any copy that states a fact we do not hold.

Every item is proved by a test that fails on the old behaviour. Shared gate for all items:
`npm run type-check && npm run lint && npx vitest run --maxWorkers=2 && npm run check:iicrc-terminology
&& npm run check:iicrc-compliance && npm run check:cec-surfaces && npm run check:cec && npm run test:cec
&& CIRCLE_NODE_TOTAL=2 npm run build` — all exit 0.

## 1. Logged-out "Start membership" does not dead-end at /login
- A 401 from `/api/lms/subscription/checkout` sends the visitor to `/register?next=%2Fsubscribe`.
- After registering with `next=/subscribe`, the register form starts the membership checkout
  itself (POST `/api/lms/subscription/checkout`, authenticated by the new session cookie, so the
  Stripe session carries the new user's id) and redirects to Stripe. If checkout cannot start,
  the buyer lands on `/subscribe`.
- Existing customers: the register page "Sign in" link keeps `next`, so login returns to `/subscribe`.
- Proof: `npx vitest run src/lib/membership-signup-path.test.ts`.

## 2. Abandoned-checkout recovery, flag default OFF
- `CHECKOUT_RECOVERY_ENABLED` unset/false: per-course and membership Checkout Session params are
  byte-identical to today (no `after_expiration`), and `checkout.session.expired` sends nothing.
- Flag on: both session types carry `after_expiration.recovery.enabled = true`; an expired CARSI
  session with a recovery URL and a buyer email gets one recovery email; opted-out users get none.
- Proof: `npx vitest run src/lib/server/checkout-recovery.test.ts`.

## 3. Team purchase: "Buy seats", no invented pricing
- Teams subscriptions off: no team CTA reads "Coming soon"; one "Buy seats" card links to
  `/courses` (per-course seat quantity checkout already exists). No team price shown on it.
  Teams on: existing tier cards unchanged. `scripts/verify-go-live-readiness.mjs` updated to match.
- Proof: `npx vitest run src/components/pricing/PricingTiers.test.tsx src/lib/go-live-readiness.test.ts`.

## 4. Course-page CEC contradiction
- No CEC approval (or approval expired): no "CEC hours —" stat, no CEC pill, no "Technicians earning
  IICRC CECs" audience line, no CEC outcome/JSON-LD.
- Current approval: "Earns N IICRC CEC hour(s)" shown, from the registry only.
- Proof: `npx vitest run src/lib/seed/cec-approvals.test.ts src/components/lms/CoursePublicDetail.test.tsx`.

## 5. No "| CARSI | CARSI" titles
- Course-card seoTitles ending "| CARSI" are stripped before the root template appends it; the
  static page titles carrying the suffix are fixed.
- Proof: `npx vitest run src/lib/seo/title-suffix.test.ts`.

## 6. `/iicrc-cec-courses` hub
- Lists published courses that have a current (approved, unexpired) registry entry, with price,
  CEC hours and expiry; ItemList + Course JSON-LD; in the sitemap. States no IICRC renewal requirement.
- Proof: `npx vitest run src/lib/seed/cec-approvals.test.ts` (selection) + build route list.

## 7. llms.txt refreshed
- No `/credentials/{id}`; credential path is `/verify/credential/{id}`; no "Australia's leading";
  every site path listed exists as an app route.
- Proof: `npx vitest run src/lib/seo/llms-txt.test.ts`.

## 8. Homepage testimonials + coming-soon pages
- Homepage testimonials render nothing while no attributed review exists (composite quotes removed).
- `/professional-directory` is `noindex` and absent from the sitemap unless the directory is live.
- Proof: `npx vitest run src/components/landing/HomeTestimonialsSection.test.tsx src/lib/server/professional-directory.test.ts`.

## 9. CEC approvals expiring within 90 days → non-blocking warning
- `npm run check:cec` prints a `::warning::` line per approval expiring within 90 days (or expired)
  and still exits 0 when the registry is otherwise valid.
- Proof: `npm run test:cec` (cases include an expiring entry that must warn and not fail).

## Revision 2026-10-15 (append-only; the criteria above are unchanged except as stated here)

- **Item 2 — Abandoned-checkout recovery: DESCOPED from Wave 1** (orchestrator decision within
  the founder-approved scope, after independent review rounds 1–3). Reason: the feature is
  flag-off by default, and it cannot reach new buyers safely until CARSI has a real
  inbox-challenge email verification. `LmsUser.isVerified` is not proof that the buyer controls
  the recipient address (a paid guest can claim an account under a third-party email), and new
  registrations are unverified, so the register-then-membership path could never receive it.
  All recovery code, the `CHECKOUT_RECOVERY_ENABLED` flag and its tests are removed from the
  branch (commit `07028f97`); `base...head` carries no recovery code.
  **Founder follow-up:** build inbox-challenge email verification first (a distinct
  email-verified-at proof), then re-propose recovery gated on it, with server-side abuse
  throttles on guest checkout.
- **Item 1 — proof strengthened, criterion unchanged:** besides
  `src/lib/membership-signup-path.test.ts`, `src/components/pricing/SubscribeCta.test.tsx` drives
  the rendered CTA (401 → `/register?next=%2Fsubscribe`; signed in → Stripe URL), and
  `src/components/pricing/PricingTiers.test.tsx` asserts the live yearly CTA has
  `href="/subscribe"`.
