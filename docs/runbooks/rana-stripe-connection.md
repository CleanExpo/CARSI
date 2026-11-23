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
| Teams + organisation flag (separate, leave off for a yearly-only launch) | `TEAMS_SUBSCRIPTIONS_ENABLED=true` |
| Webhook endpoint (already exists) | `https://carsi.com.au/api/lms/webhooks/stripe` |

**Two switches.** `SUBSCRIPTIONS_ENABLED` turns on the individual yearly membership. Teams seat plans and the organisation monthly plan need **both** `SUBSCRIPTIONS_ENABLED` and `TEAMS_SUBSCRIPTIONS_ENABLED`. So the yearly membership can go on sale by itself while Teams and org stay "coming soon".

| `SUBSCRIPTIONS_ENABLED` | `TEAMS_SUBSCRIPTIONS_ENABLED` | Yearly membership | Teams + org |
|---|---|---|---|
| off | off | coming soon | coming soon |
| off | on | coming soon | coming soon |
| on | off | **on sale** | coming soon (routes return 503) |
| on | on | **on sale** | **on sale** |

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
4. `TEAMS_SUBSCRIPTIONS_ENABLED` — **leave unset (or `false`) for the yearly-only launch.** Setting it has no effect while `SUBSCRIPTIONS_ENABLED` is off.

### Automated check before and after the flip

Run this from a laptop. It only reads (GET requests, plus one unauthenticated checkout POST that is refused before anything is charged):

```bash
# Before the flip: both plans must still look "coming soon".
BASE_URL=https://carsi.com.au npm run verify:go-live-readiness

# After setting SUBSCRIPTIONS_ENABLED=true (yearly only), say what you expect to see.
# STRIPE_PRICE_PRO_ANNUAL must hold the same price_... id you set in DigitalOcean;
# the script checks its shape and never prints it.
EXPECT_SUBSCRIPTIONS_ENABLED=true STRIPE_PRICE_PRO_ANNUAL=price_... \
  BASE_URL=https://carsi.com.au npm run verify:go-live-readiness
```

- `EXPECT_SUBSCRIPTIONS_ENABLED` / `EXPECT_TEAMS_SUBSCRIPTIONS_ENABLED` (default `false`) tell the script which state `/pricing` and the Teams checkout should be in.
- If you chose lookup-key resolution and did not set `STRIPE_PRICE_PRO_ANNUAL`, add `ALLOW_PRICE_LOOKUP_KEY=true`. The script then reports the price as **not checked**, not as passed. Confirm the `carsi_pro_annual` Price in Stripe yourself.
- Exit `0` = every check passed. Exit `1` = at least one check failed. Exit `2` = the site could not be judged, because the gateway answered `502`/`504` (or a `503` with no app message), or the request never connected. **An exit `2` is an infrastructure problem on DigitalOcean, not "the plan is switched off".** Fix it and run again.
- **DigitalOcean rewrites the app's 503.** When a switched-off route answers 503, DigitalOcean App Platform's edge replaces it with its own generic HTML **504** page and keeps the app's real status in the `x-do-orig-status` response header (measured on carsi.com.au, 17/09/2026). The script reads that header, so this shows as `HTTP 503 (edge rewrote to 504) (disabled)` and passes. A 504 without that header, or with `x-do-orig-status: 504`, is still an infrastructure failure.
- **User-experience note, not fixed here:** because of that rewrite, a browser or API client calling a switched-off route (for example `/api/lms/subscription/portal`, Teams checkout or org checkout) sees DigitalOcean's generic error page, not the app's "not yet available" message.

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
   - `invoice.upcoming` — **required for the pre-renewal reminder email** (see Step C2). Without it no subscriber is told before an automatic renewal charges them.
   - `charge.dispute.closed` — **required for the dispute-won re-grant**: when a chargeback is resolved in your favour (`status = won`), the route restores the one-off enrolment that `charge.dispute.created` revoked. The handler is inert until this event is enabled on the endpoint.

   > **Testing the dispute-won re-grant.** Unlike `charge.dispute.created` (which the test card `4000 0000 0000 0259` fires directly), `charge.dispute.closed` with `status = won` is **not** a built-in `stripe trigger` event and **cannot** be produced by a test card — you have to close a dispute. Two ways, in Test mode:
   > 1. **Dashboard (simplest):** create a test dispute with card `4000 0000 0000 0259`, then in **Payments → the disputed charge → dispute**, submit/close it **in your favour** so Stripe emits `charge.dispute.closed` with `status = won`.
   > 2. **Custom fixture:** replay a hand-written `charge.dispute.closed` event (`status: won`, the original `payment_intent`) via the Stripe CLI's *Create and use fixtures* flow.
   >
   > Do **not** use `stripe-mock` for this — per Stripe's own guidance it returns hardcoded, behaviour-less responses and won't exercise the route. The re-grant + out-of-order-ordering logic is already unit-covered in `src/lib/server/stripe-revocation.test.ts`; this checklist is only for the end-to-end webhook wiring.
4. Copy the endpoint's **Signing secret** (`whsec_...`) and confirm it matches `STRIPE_WEBHOOK_SECRET` in DigitalOcean for that mode. Test mode and Live mode have **different** signing secrets — use the right one per environment.

---

## Step C2 — Turn on upcoming-renewal events (founder dashboard setting, REQUIRED before go-live)

Australian Consumer Law practice: a subscriber must be reminded **before** an automatic renewal charges them. The app sends that reminder when Stripe delivers `invoice.upcoming`. Stripe only sends that event when the account is set up to, so this is a **founder dashboard decision**. The code does not and cannot change it, and no env var controls it.

1. Stripe Dashboard → **Settings → Billing → Subscriptions and emails** (the "Manage invoices sent to customers" / **Upcoming renewal events** section; Stripe may rename it).
2. Turn on **Send upcoming renewal events** (Stripe's wording may differ) and set the lead time. Stripe applies **one** lead time to every plan:
   - The yearly membership and all Teams plans are yearly, so **30 days** is the common choice for yearly plans. Do not go below **7 days**.
   - The organisation plan is monthly. The app does **not** send it a reminder today (only the yearly membership and Teams plans are covered), so the lead time does not affect it.
3. Make sure `invoice.upcoming` is ticked on the webhook endpoint (Step C, item 3).
4. **Customer portal cancellation.** The reminder tells yearly members to cancel from **Manage billing & payment method** on `/subscribe`, which opens the Stripe customer portal. In **Settings → Billing → Customer portal**, allow customers to **cancel subscriptions** and set cancellation to **at the end of the billing period**, so the email's promise ("your access continues until the end of the current period") is true.
5. Do this in Test mode first, then Live. Test it with a **Test Clock**: advance to inside the lead time and confirm one email arrives.

What the app does with the event (`src/lib/server/renewal-reminder.ts`):

| Situation | Result |
|---|---|
| Yearly membership or Teams plan, invoice has an AUD amount and a payment date | One email to the billing email on the invoice (fallback: the member, or the team owner), showing plan, renewal date, amount (for example `A$795.00 incl. GST`), the GST in that amount as its own line (total / 11, for example `GST included: A$72.27`), how to cancel, and that no action is needed to continue. A matching bell notification is saved. |
| The same renewal is delivered again (Stripe retry or a second event) | Nothing is sent. Dedupe key: `renewal_reminder:<subscription id>:<renewal date>` in `lms_notifications`. The record is saved as `renewal_reminder_pending` when a delivery claims the renewal, becomes `renewal_reminder_sending` just before the email is sent, and becomes `renewal_reminder` once it has gone. |
| Amount or payment date missing, currency not AUD, or amount is zero | Nothing is sent. A warning is logged with the reason (`missing_amount`, `missing_renewal_date`, `non_aud_currency`, `zero_amount`). |
| Subscription already set to cancel, or it is an organisation plan | Nothing is sent (`not_renewing`, `unsupported_plan`). |
| Two deliveries for the same renewal arrive at the same time | Each tries to save the dedupe record first. Only the one whose save succeeds sends the email. A delivery that finds a pending record less than 5 minutes old sends nothing and returns 500, so Stripe tries again later. |
| The email fails, or Mailtrap is not configured | The saved record is removed, the webhook returns 500, the error goes to Sentry, and Stripe retries, so the retry can send. |

A record left `renewal_reminder_pending` (the server was killed after claiming, before it started the email) does not need a person: the next Stripe delivery for that renewal more than 5 minutes later takes it over and sends the email once (GP-595).

A record left `renewal_reminder_sending` is never sent again automatically, because the app cannot tell whether that email went out. Every later delivery for that renewal returns 500, and once the record is more than 5 minutes old Sentry reports `renewal_reminder_send_unconfirmed`. A person checks the Mailtrap sending log for the subject "Your ... renews on ..." to that member:
- If the email is there, set the record's `type` to `renewal_reminder`. Nothing more is sent.
- If it is not there, delete the record and resend the `invoice.upcoming` event from the Stripe Dashboard. The resent event sends the email once.

This happens when the server is killed while sending, when the email went out but the record could not be marked sent (Sentry `confirm_renewal_reminder_claim`), or when a send failed and the record could not be removed (Sentry `release_renewal_reminder_claim`). Main has the same limit in these cases; the difference is that the reminder is reported instead of silently missing. Two live deliveries never both send.

Known limits: if Mailtrap accepts an email but the reply times out, the app counts it as failed, removes the record and Stripe's retry sends it again (the same as main). If Stripe has stopped retrying the event (after about three days), a pending record is not picked up again; resend the event from the Stripe Dashboard.

**Open items for the founder:**
- **Teams owners have no self-serve cancel button.** The billing portal route only serves individual members. The Teams reminder tells owners to reply or email `support@carsi.com.au`, and someone must then set that subscription to cancel at period end in the Stripe Dashboard. Decide who handles those requests before Teams goes on sale, or add a Teams portal.
- **GST wording.** The email says "incl. GST". That is only true if each Price is GST-inclusive, or if Stripe Tax adds GST. The yearly membership is inclusive (Step A). Teams GST treatment is still an open decision (see the Teams notes below). If any plan ends up charged without GST, change the wording in `formatRenewalAmount` first.

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
- Confirmation the five subscription webhook events, plus `invoice.upcoming`, are enabled on the live endpoint.
- Confirmation that upcoming renewal events are on in Stripe Billing settings, with the lead time chosen (Step C2), and that portal cancellation is set to "at end of billing period".
- The Step D test-mode evidence (subscribe works; test-clock lapse blocks new enrolment; progress + certificate retained; replay = single grant; non-member = 403; **refund/chargeback revokes catalogue access while retaining progress + certificate**).
- The Step E zero-historical-charges result.
- The moment `SUBSCRIPTIONS_ENABLED=true` is set live (the membership goes on sale at that instant).

---

# WS1-E2 / E3 — Teams seat plans + Organisation monthly (GP-442 / GP-443)

E2 (Teams seats) and E3 (organisation monthly) need **both**
`SUBSCRIPTIONS_ENABLED` and their own `TEAMS_SUBSCRIPTIONS_ENABLED` flag, and use
the **same** webhook endpoint as E1. Nothing is user-visible until (a) the
Prices exist, and (b) both flags are on. The webhook
routes each subscription to the right record by its `plan` metadata, so no new
webhook or new events are needed — the same five events from Step C cover E2/E3.

## Prices Rana must create (Test mode first, then Live)

| Plan | Product name | Amount | Recurring | Lookup key | Optional env override | Metadata `plan` the app sets at checkout |
|---|---|---|---|---|---|---|
| Teams Starter (5 seats) | CARSI Teams Starter | A$299.00 | Yearly | `carsi_teams_starter` | `STRIPE_PRICE_TEAMS_STARTER` | `starter` |
| Teams Growth (15 seats) | CARSI Teams Growth | A$799.00 | Yearly | `carsi_teams_growth` | `STRIPE_PRICE_TEAMS_GROWTH` | `growth` |
| Teams Full Library (25 seats) | CARSI Teams Full Library | A$2,499.00 | Yearly | `carsi_teams_full_library` | `STRIPE_PRICE_TEAMS_FULL_LIBRARY` | `full_library` |
| Business owner plan (organisation; GP-773) | CARSI Business Owner Plan | A$1,295.00 GST included | **Yearly** | `carsi_org_annual` | `STRIPE_PRICE_ORG_ANNUAL` | `org_monthly` (stored plan id, unchanged) |

| Teams extra staff seat (GP-773 seat billing) | CARSI Teams Extra Staff Seat | A$695.00 | Yearly | `carsi_teams_extra_seat` | `STRIPE_PRICE_TEAMS_EXTRA_SEAT` | (same subscription as the tier) |

Notes:
- **Teams seat billing = a flat tier base Price + a separate seat item** (founder ruling
  23/11/2026, "Build seat billing now"). Create each tier Price as a **flat** per-unit price
  for the whole tier total (Starter A$299.00, Growth A$799.00, Full Library A$2,499.00); the
  app bills it at quantity 1, and it includes the tier's seats (5 / 15 / 25). Create ONE
  extra-seat Price at A$695.00 yearly; each extra seat is one unit of that separate
  subscription item. Checkout adds the seat item when the buyer chooses extra seats; seat
  expansion raises its quantity (or adds it) and never changes the base item. Expansion is
  charged first (`always_invoice` + `error_if_incomplete`): the prorated amount is charged at
  once and seats are granted only when that payment succeeds.
  The webhook counts seats as included seats + extra-seat quantity, matching items by the
  Price ids the checkout stamps into the subscription metadata (`base_price_id`,
  `seat_price_id`).
- Every Teams Price is checked against amount, AUD, yearly and per-unit shape. A missing or
  mismatched base **or** seat Price makes the Teams checkout answer 503 ("not yet available")
  and seat expansion answer 503; nothing is charged. A Price created earlier under the
  per-unit model (Starter A$59.80 per seat) is refused as a base.
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
`STRIPE_PRICE_TEAMS_FULL_LIBRARY`, `STRIPE_PRICE_TEAMS_EXTRA_SEAT`, `STRIPE_PRICE_ORG_ANNUAL`. (GP-773: `STRIPE_PRICE_ORG_MONTHLY`
and the `carsi_org_monthly` lookup key are no longer read; a monthly Price is never sold as
the yearly plan.)
The go/no-go switch is `TEAMS_SUBSCRIPTIONS_ENABLED=true`, set only once
`SUBSCRIPTIONS_ENABLED=true` is already on. Rollback = set
`TEAMS_SUBSCRIPTIONS_ENABLED=false`; the yearly membership is unaffected.

**Founder prices (GP-773, 20/10/2026, ruled 22/11/2026).** Individual A$795/yr, business
owner A$1,295/yr, each extra staff member A$695/yr, no promotion codes. The amounts live in
`src/lib/lms/membership-prices.ts`, and the individual and business owner checkouts refuse any
Price whose amount, currency or interval differs. Teams extra seats are billed on their own
A$695 yearly seat item (see the notes above), so the "+$695/seat per year" on the Teams cards
is what Stripe charges.

**Before Teams goes on sale:** create the three flat tier Prices and the A$695 seat Price
(Test mode first), run the Teams checks below, then set `TEAMS_SUBSCRIPTIONS_ENABLED=true`.
The flat base Price also makes Teams Growth (A$799 for 15 seats) billable; the old per-unit
model could not express it in whole cents. The pricing cards still show every Teams tier as
"Coming soon" until that UI flag is changed in `src/lib/lms/pricing-tiers.ts`.

## E3 — flip the onboarding course off `isFree` (ops, LAST)
Once the org Price exists, the flag is on, and at least one org is provisioned
(or a grace window is agreed), run against the target DB (never in CI):
`DATABASE_URL="..." npm run db:gate-onboarding-off-free -- --dry-run` then without
`--dry-run`. Reversible with `-- --revert`. Direct onboarding enrolment is already
gated to active-org members (402 for everyone else), so this only removes the
"free" affordance — it never strands an entitled org learner.

## Verify (Test mode), per plan
- **Teams**: start a Starter checkout → Stripe shows A$299.00 per year once (and A$695.00
  per extra seat if chosen) → 5 seats provisioned; invite 5 members → all seated; the **6th
  invite is rejected 409 with a seat-expansion path**;
  `POST /api/lms/subscription/teams/expand-seats {additional_seats:1}` charges the prorated
  A$695 at once and, only when that payment succeeds, adds the seat item → seat limit 6 → the
  6th can then join. Expand again → the seat item's quantity rises; the A$299 base item is
  unchanged. With the test card `4000 0000 0000 0341` (attaches, then declines) the expansion
  answers 402 "no seats were added" and the seat limit stays put. Refund → seats revoked.
- **Org**: start an org checkout with an organisation name → subscription active →
  a member of that org can enrol in an onboarding-brand course; cancel/refund →
  new enrolment blocked, existing progress + certificates retained.
- **No regression**: E1 individual `pro_annual` still behaves exactly as before
  (routing is by `plan` metadata).
