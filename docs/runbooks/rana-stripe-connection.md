# Runbook — Connect Stripe for CARSI Yearly Membership (WS1-E1 / GP-441)

**Audience:** Rana (Technical Lead & Manager)
**Goal:** Turn on the individual annual membership (`pro_annual`, **A$795.00/year, GST inclusive**) that the WS1-E1 code already ships behind a flag. Nothing in this runbook is destructive; every step is reversible.

**Australian English throughout. Prices in AUD. GST is included in the A$795.00 price (tax behaviour = inclusive), not added on top.**

The code is already merged and deployed **dark**. It does nothing user-visible until you (a) create the Stripe Price, (b) set the environment variables, and (c) turn the feature flag on. If anything goes wrong, turning the flag off restores the current "coming soon" behaviour exactly.

---

## Overview of what the code expects

| Thing | Value the code looks for |
|---|---|
| Stripe Price lookup key | `carsi_pro_annual` |
| Optional explicit Price env var | `STRIPE_PRICE_PRO_ANNUAL` (a `price_...` id) |
| Feature flag env var | `SUBSCRIPTIONS_ENABLED=true` |
| Webhook endpoint (already exists) | `https://carsi.com.au/api/lms/webhooks/stripe` |

Price resolution order in code: **`STRIPE_PRICE_PRO_ANNUAL` if set, otherwise look up the active Price whose `lookup_key` is `carsi_pro_annual`.** So you can do either — setting the env var is optional if the lookup key is in place. If neither resolves, checkout fails **closed** with an honest "Membership purchasing is not yet available" message. It never charges against a wrong Price.

---

## Step A — Create the Stripe Product and Price

Do this in **Test mode first**, verify (Step D), then repeat in **Live mode**.

### Option 1 — Stripe Dashboard (recommended)

1. Sign in to the Stripe Dashboard. Confirm the mode toggle (top-right) is **Test mode** for the first pass.
2. **Products → Add product.**
   - **Name:** `CARSI Pro Annual Membership`
   - **Description (optional):** `100% access to all published CARSI courses for one learner for 12 months. Includes IICRC CEC courses where stated.`
3. Under **Pricing**:
   - **Pricing model:** Standard pricing
   - **Price:** `795.00`
   - **Currency:** `AUD`
   - **Billing period:** `Yearly` (recurring)
   - **Tax behaviour:** **Inclusive** (GST is included in the A$795.00; do **not** add tax on top).
4. Save the product. Open the Price you just created → **Edit price** (or the "..." menu) → set the **Lookup key** to exactly:

   ```
   carsi_pro_annual
   ```

   (Lower case, underscores, no spaces. The code matches this string exactly.)
5. Copy the Price id (`price_...`). You will optionally use it as `STRIPE_PRICE_PRO_ANNUAL` in Step B.

### Option 2 — Stripe API (equivalent, read-only-safe to paraphrase)

If you prefer the API/console, create the product then the price. The one-liner intent is: **`POST /v1/products` then `POST /v1/prices` with `lookup_key=carsi_pro_annual`, recurring yearly, AUD, unit amount 79500, tax behaviour inclusive.** For example with the Stripe CLI:

```bash
# 1) Create the product, capture its id
stripe products create \
  --name="CARSI Pro Annual Membership" \
  --description="100% access to all published CARSI courses for one learner for 12 months."

# 2) Create the recurring yearly price (A$795.00 = 79500 cents), GST inclusive,
#    tagged with the lookup key the code resolves.
stripe prices create \
  --product="prod_XXXXXXXX" \
  --currency=aud \
  --unit-amount=79500 \
  --lookup-key="carsi_pro_annual" \
  --tax-behavior=inclusive \
  -d "recurring[interval]=year"
```

Replace `prod_XXXXXXXX` with the id from step 1. Run in Test mode first (test-mode keys), then Live.

---

## Step B — Set the DigitalOcean app environment variables

In the DigitalOcean App Platform console for the CARSI app → **Settings → App-Level Environment Variables**:

1. `SUBSCRIPTIONS_ENABLED` = `true`  — **leave this OFF/unset until Steps A + D are done and verified.** This is the go/no-go switch.
2. `STRIPE_PRICE_PRO_ANNUAL` = `price_...` — **optional.** Set it to the Price id from Step A if you want an explicit binding; otherwise the code resolves by lookup key `carsi_pro_annual` at runtime and caches it.
3. Confirm the already-present Stripe vars are correct for the target mode: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

Saving env vars triggers a redeploy. The additive database migration (`lms_subscriptions`) runs automatically in the existing **PRE_DEPLOY `prisma migrate deploy`** job — you do **not** run migrations by hand.

**Rollback at any time:** set `SUBSCRIPTIONS_ENABLED=false` (or remove it). The site returns to the current coming-soon behaviour immediately; the `lms_subscriptions` table stays but is simply not consulted for gating.

---

## Step C — Configure the Stripe webhook endpoint

The webhook route already exists and is signature-verified + idempotent. You only need to ensure the **new event types** are enabled on the endpoint.

1. Stripe Dashboard → **Developers → Webhooks**.
2. Open (or add) the endpoint URL: `https://carsi.com.au/api/lms/webhooks/stripe`
3. Ensure these events are selected (in addition to any already enabled for one-off purchases such as `checkout.session.completed`, `charge.refunded`, `charge.dispute.created`):
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `charge.dispute.closed` — **required for the dispute-won re-grant**: when a chargeback is resolved in your favour (`status = won`), the route restores the one-off enrolment that `charge.dispute.created` revoked. The handler is inert until this event is enabled on the endpoint.

   > **Testing the dispute-won re-grant.** Unlike `charge.dispute.created` (which the test card `4000 0000 0000 0259` fires directly), `charge.dispute.closed` with `status = won` is **not** a built-in `stripe trigger` event and **cannot** be produced by a test card — you have to close a dispute. Two ways, in Test mode:
   > 1. **Dashboard (simplest):** create a test dispute with card `4000 0000 0000 0259`, then in **Payments → the disputed charge → dispute**, submit/close it **in your favour** so Stripe emits `charge.dispute.closed` with `status = won`.
   > 2. **Custom fixture:** replay a hand-written `charge.dispute.closed` event (`status: won`, the original `payment_intent`) via the Stripe CLI's *Create and use fixtures* flow.
   >
   > Do **not** use `stripe-mock` for this — per Stripe's own guidance it returns hardcoded, behaviour-less responses and won't exercise the route. The re-grant + out-of-order-ordering logic is already unit-covered in `src/lib/server/stripe-revocation.test.ts`; this checklist is only for the end-to-end webhook wiring.
4. Copy the endpoint's **Signing secret** (`whsec_...`) and confirm it matches `STRIPE_WEBHOOK_SECRET` in DigitalOcean for that mode. Test mode and Live mode have **different** signing secrets — use the right one per environment.

---

## Step D — Test-mode verification checklist (do this before going Live)

Use Stripe **Test mode** keys and a **Stripe Test Clock** to prove the lapse behaviour without waiting a year.

1. **Subscribe → access granted.**
   - With `SUBSCRIPTIONS_ENABLED=true` (test app or preview), sign in as a test learner, go to `/subscribe`, click **Start membership — $795/year**.
   - Complete checkout with test card `4242 4242 4242 4242`, any future expiry, any CVC.
   - After redirect, `GET /api/lms/subscription/status` should return `has_subscription: true`, `status: "active"`.
   - Open any published paid course → **Access Course — Included in Pro** → it enrols with **no charge** and lands on the first lesson.

2. **Lapse via Test Clock → new enrolment blocked, progress retained.**
   - Create the customer/subscription against a **Test Clock** (Dashboard → Billing → Test Clocks, or via the API `test_clock` param).
   - Advance the clock **past the period end + 7 days** and let the invoice fail (do not pay it, or attach a failing test card `4000 0000 0000 0341`). Stripe moves the subscription to `past_due`, then beyond grace it is treated as **lapsed** by the code.
   - Re-check `GET /api/lms/subscription/status`: within 7 days of period end it shows `reason: "grace"` and access still works; **after** 7 days it shows `has_subscription: false`, `reason: "lapsed"`.
   - Attempt a **new** enrolment (`POST /api/lms/subscription/enroll`): expect **403** with a renew hint.
   - Confirm the learner's **existing** enrolments, lesson progress, and any issued certificate are **still present** (open the dashboard and the credentials wallet). Lapse must never remove an earned certificate.

3. **Replay protection.** Re-send a `customer.subscription.created` event from the Dashboard (Webhooks → the event → **Resend**). Confirm only **one** `lms_subscriptions` row exists for that user (idempotent upsert).

4. **Non-member direct hit.** As a signed-in learner **without** a membership, call `POST /api/lms/subscription/enroll` directly. Expect **403** and **no course content** in the response.

5. **Refund / chargeback → access revoked, progress + certificate retained (GP-441).**
   - With an **active** test membership (from step 1), confirm `GET /api/lms/subscription/status` shows `status: "active"` and a paid course opens via **Access Course — Included in Pro**.
   - In the Stripe Dashboard (Test mode) → **Payments**, open the membership's most recent **subscription invoice** payment and issue a **full Refund** (or simulate a dispute with test card `4000 0000 0000 0259`, which triggers `charge.dispute.created`).
   - Stripe delivers `charge.refunded` (or `charge.dispute.created`) to the webhook. The route follows the charge's payment intent → invoice → subscription and marks the membership **`canceled`**.
   - Re-check `GET /api/lms/subscription/status`: expect `has_subscription: false` (or `status: "canceled"`), `reason: "lapsed"`.
   - Attempt a **new** enrolment (`POST /api/lms/subscription/enroll`): expect **403** with a renew hint.
   - Confirm the learner's **existing** enrolments, lesson progress, and any issued certificate are **still present** — a refund stops NEW catalogue access but never removes an earned certificate (parity with the one-off lapse policy).
   - **Idempotency:** re-send the same `charge.refunded` event (Webhooks → the event → **Resend**). The membership stays `canceled`; no error, no second effect.

Only once all five pass in Test mode, repeat Step A (create the Live Price with the same lookup key + inclusive tax) and set the Live env vars, then flip `SUBSCRIPTIONS_ENABLED=true` in the Live app.

---

## Step E — Two-minute zero-historical-charges check (GP-439 item 6)

Before go-live, confirm no yearly/Teams subscription was ever charged in the past (the subscription checkout was never wired, so the expected answer is **zero**):

1. Stripe Dashboard (**Live mode**) → **Payments** → filter by **Recurring / Subscriptions**.
2. Also check **Billing → Subscriptions** for any active or past subscriptions.
3. Expected result: **no historical yearly/Teams subscription charges**. If any exist, pause and raise with Phill (founder) before enabling — they would predate this feature and need explanation.

---

## What to hand back to the founder

- Confirmation that the **Live** Price exists with lookup key `carsi_pro_annual`, A$795.00/year, **GST inclusive**.
- Confirmation the five subscription webhook events are enabled on the live endpoint.
- The Step D test-mode evidence (subscribe works; test-clock lapse blocks new enrolment; progress + certificate retained; replay = single grant; non-member = 403; **refund/chargeback revokes catalogue access while retaining progress + certificate**).
- The Step E zero-historical-charges result.
- The moment `SUBSCRIPTIONS_ENABLED=true` is set live (the membership goes on sale at that instant).

---

# WS1-E2 / E3 — Teams seat plans + Organisation monthly (GP-442 / GP-443)

E2 (Teams seats) and E3 (organisation monthly) ship behind the **same**
`SUBSCRIPTIONS_ENABLED` flag and the **same** webhook endpoint as E1. Nothing is
user-visible until (a) the Prices exist, and (b) the flag is on. The webhook
routes each subscription to the right record by its `plan` metadata, so no new
webhook or new events are needed — the same five events from Step C cover E2/E3.

## Prices Rana must create (Test mode first, then Live)

| Plan | Product name | Amount | Recurring | Lookup key | Optional env override | Metadata `plan` the app sets at checkout |
|---|---|---|---|---|---|---|
| Teams Starter (5 seats) | CARSI Teams Starter | A$299.00 | Yearly | `carsi_teams_starter` | `STRIPE_PRICE_TEAMS_STARTER` | `starter` |
| Teams Growth (15 seats) | CARSI Teams Growth | A$799.00 | Yearly | `carsi_teams_growth` | `STRIPE_PRICE_TEAMS_GROWTH` | `growth` |
| Teams Full Library (25 seats) | CARSI Teams Full Library | A$2,499.00 | Yearly | `carsi_teams_full_library` | `STRIPE_PRICE_TEAMS_FULL_LIBRARY` | `full_library` |
| Organisation monthly (unlimited) | CARSI Organisation Onboarding | A$1,295.00 | **Monthly** | `carsi_org_monthly` | `STRIPE_PRICE_ORG_MONTHLY` | `org_monthly` |

Notes:
- **Teams seat billing = subscription `quantity`.** Create ONE Price per tier as a
  per-unit price; the app sets the `quantity` to the tier's included seats
  (5 / 15 / 25) at checkout. Seat expansion increases the `quantity` with
  proration — no separate per-seat Price is required. So set each Teams Price as
  a **standard per-unit** price (e.g. Starter = A$299 ÷ 5 = A$59.80/seat) OR keep
  it a flat tier price and rely on Stripe's quantity multiplication — confirm the
  per-seat unit amount with Phill before creating, since it multiplies by seats.
- **GST**: match E1's decision. E1's A$795 annual is **inclusive**. Confirm with
  the accountant whether Teams/org Prices are inclusive or use Stripe Tax. The org
  plan is quoted "$1,295/month **+ GST**" in the plan doc — if that means GST is
  added on top, set the org Price tax behaviour to **exclusive** + Stripe Tax, or
  create it as A$1,424.50 inclusive. **This is a founder/accountant decision.**
- Lookup keys are matched exactly (lower case, underscores). If a key/env is
  absent, that plan's checkout fails **closed** ("not yet available") — it never
  charges against a wrong Price.

## Env vars (DigitalOcean App-Level)
Optional explicit bindings (the app resolves by lookup key without them):
`STRIPE_PRICE_TEAMS_STARTER`, `STRIPE_PRICE_TEAMS_GROWTH`,
`STRIPE_PRICE_TEAMS_FULL_LIBRARY`, `STRIPE_PRICE_ORG_MONTHLY`.
The go/no-go flag is the same `SUBSCRIPTIONS_ENABLED=true`.

## E3 — flip the onboarding course off `isFree` (ops, LAST)
Once the org Price exists, the flag is on, and at least one org is provisioned
(or a grace window is agreed), run against the target DB (never in CI):
`DATABASE_URL="..." npm run db:gate-onboarding-off-free -- --dry-run` then without
`--dry-run`. Reversible with `-- --revert`. Direct onboarding enrolment is already
gated to active-org members (402 for everyone else), so this only removes the
"free" affordance — it never strands an entitled org learner.

## Verify (Test mode), per plan
- **Teams**: start a Starter checkout → 5 seats provisioned; invite 5 members →
  all seated; the **6th invite is rejected 409 with a seat-expansion path**;
  `POST /api/lms/subscription/teams/expand-seats {additional_seats:1}` raises the
  quantity (proration) → the 6th can then join. Refund → seats revoked.
- **Org**: start an org checkout with an organisation name → subscription active →
  a member of that org can enrol in an onboarding-brand course; cancel/refund →
  new enrolment blocked, existing progress + certificates retained.
- **No regression**: E1 individual `pro_annual` still behaves exactly as before
  (routing is by `plan` metadata).
