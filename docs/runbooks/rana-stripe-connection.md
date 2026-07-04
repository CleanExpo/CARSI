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

Only once all four pass in Test mode, repeat Step A (create the Live Price with the same lookup key + inclusive tax) and set the Live env vars, then flip `SUBSCRIPTIONS_ENABLED=true` in the Live app.

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
- The Step D test-mode evidence (subscribe works; test-clock lapse blocks new enrolment; progress + certificate retained; replay = single grant; non-member = 403).
- The Step E zero-historical-charges result.
- The moment `SUBSCRIPTIONS_ENABLED=true` is set live (the membership goes on sale at that instant).
