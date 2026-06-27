# Plan — Organisation subscription billing ($1,295/month + GST, unlimited students)

**Status:** scoped plan (not built). **Owner:** [COMPANY TO CONFIRM]. **Prerequisite read:**
`docs/onboarding/HANDOFF.md` §6 and the course's `meta.pricing`.

## Context

The CARSI Maintenance Company Onboarding course is sold as an **organisation subscription — AUD
$1,295/month + GST, unlimited students**. Today that commercial model is **recorded** (in the course's
`meta.pricing` and the docs) but **not enforced in software**: the course is `isFree`/`$0`, so access is
not metered, and there is no recurring billing. This plan scopes the build that makes the subscription
real and enforceable. It is its own piece of work (payments + access control), deliberately kept out of
the content PRs.

## Current state (from the codebase)

- **Course purchases are one-time** Stripe `mode: 'payment'` — `app/api/lms/checkout/route.ts`,
  `src/lib/lms/local-course-checkout.ts`. No recurring billing anywhere.
- **Stripe subscription helpers already exist but are unused** — `createSubscription`,
  `getSubscription`, `cancelSubscription` in `src/lib/api/stripe.ts`.
- **Team/seat model exists but doesn't fit** — `LmsTeam`, `LmsTeamCoursePurchase`
  (`prisma/schema.prisma`), tiers in `src/lib/lms/pricing-tiers.ts` — these are **annual, per-seat**,
  not **monthly, unlimited**.
- **Access today** is via enrolment (`LmsEnrollment`) + the public-visibility filter
  (`src/lib/server/public-courses-list.ts`); quiz/lesson APIs gate on active enrolment.
- **Stripe webhook** handling exists (idempotent events: `StripeWebhookEvent` model;
  `scripts/test-stripe-webhook-idempotency.mjs`).

## Goal

An organisation can subscribe at **$1,295/month + GST**; while the subscription is **active**, **any
number** of that organisation's learners can enrol in (and only in) the brand's course(s); when the
subscription lapses, access is suspended. Billing is recurring and self-serve or ops-provisioned.

## Recommended approach

Model the subscription as an **organisation/account entity** that grants course access, billed by a
**recurring Stripe Price**. Reuse `LmsTeam` as the organisation container (it already links members and
course purchases) with an **"unlimited" seat mode**, rather than inventing a parallel entity.

### 1. Data model (Prisma migration)
- Add an **`LmsOrgSubscription`** record (or extend `LmsTeam`): `organisationName`, `contactEmail`,
  `stripeCustomerId`, `stripeSubscriptionId`, `status` (`active|past_due|canceled`),
  `currentPeriodEnd`, `seatModel: 'unlimited'`, and the set of entitled course slugs/ids (start with
  the `CARSI Maintenance Company Onboarding` category).
- Link learners to the org (reuse `LmsTeamMember`), and entitlement = "member of an org whose
  subscription is active and which entitles this course".

### 2. Stripe
- Create a **recurring monthly Price** (AUD 1,295) on a product; GST handled via Stripe Tax or an
  inclusive/exclusive tax setting per your tax registration. Record the price/product ids in
  `meta.pricing` (placeholders already noted there).
- **Checkout** in `mode: 'subscription'` (new path; do not overload the one-time course checkout), or
  **ops-provisioned** (create the subscription server-side via `createSubscription` for a sales-led
  deal).

### 3. Webhooks (extend the existing handler)
- Handle `customer.subscription.created|updated|deleted` and `invoice.payment_failed|paid`:
  upsert `LmsOrgSubscription.status` + `currentPeriodEnd`; on `active` provision access, on
  `canceled`/`unpaid` suspend it. Keep idempotent via `StripeWebhookEvent`.

### 4. Access gating
- Replace "course is `isFree`" with **entitlement-based access**: enrolment in a brand course requires
  an active org subscription that entitles it (org members enrol freely up to "unlimited"; non-members
  cannot). Flip the course **off `isFree`** once gating exists.
- Update `public-courses-list` / enrolment / quiz APIs to respect entitlement (the course can stay
  publicly *listed* with a "contact for organisation access" CTA, but **enrolment** is gated).

### 5. Admin / ops
- Minimal admin surface to create/inspect an org subscription, see member count, and suspend/resume —
  reuse the admin courses service pattern (`src/lib/admin/`).

## Out of scope (decide later)
- Self-serve org signup UX vs sales-led only. Proration, mid-cycle plan changes, multiple
  brands/bundles, per-seat overage. Dunning emails beyond Stripe's. Start sales-led + unlimited to ship
  the model, add self-serve later.

## Risks / call-outs
- **GST**: confirm tax handling (Stripe Tax vs manual) with the company's accountant before launch.
- **Access regression**: gating changes touch enrolment/visibility used by all courses — guard with
  tests and verify other (one-time/free) courses still work.
- **Don't publish the course as free in the meantime** if the intent is paid — until gating exists,
  provision access per-organisation manually (HANDOFF.md §5 option A).

## Verification
- Unit: webhook state transitions (active→past_due→canceled) flip entitlement; idempotency holds.
- Integration (Stripe test mode): subscription checkout → webhook → org active → a member can enrol →
  cancel → member access suspended.
- Regression: existing one-time/free course purchase + enrolment unaffected.
- Gate: `npm run type-check`, `npm run test:unit`, and the WHS/verification gates as usual.

## Effort
Medium — one migration, one new Stripe path, webhook extension, an entitlement check threaded through
enrolment/visibility, and a small admin surface. Sequence: model + Stripe price → webhooks →
entitlement gating → admin → flip the course off `isFree`.
