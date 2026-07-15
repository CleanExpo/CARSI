# Spec — CCW/CARSI Roadshow: day-gated Attendee Offers

- **Date:** 2026-07-15
- **Status:** REVISED post-`/judge` (79/100 APPROVE EXPERIMENT for slice-1). Slice-1 (pure config + date-gate + URL guard + flag) owner-approved to build 2026-07-15. Welcome-email wiring + activation remain gated on §7 deps.
- **Judge corrections folded in:** the CARSI membership offer uses the existing **`grantYearlyMembership({ priceAud })`** path (`src/lib/admin/admin-yearly-membership.ts`) — there is **no Stripe coupon system** in the repo (grep-confirmed empty). Offers reuse `sendEnrollmentWelcomeEmail`, `email-templates.ts` CTA block, and the `CCW_ATTENDANCE_ENABLED` flag convention.
- **Owner-confirmed decisions folded in:** claim window = the 2 event days; benefits run their normal term after claim; prices stay soft to participants until each offer is live.
- **Repo:** CleanExpo/CARSI (`D:/CARSI`) · prod = DigitalOcean, auto-deploys `main`
- **Related:** program tracker `Downloads/CCW-CARSI-NRPG-Program-Tracker.md` (WS4/5/6/7), UNIT-A attendance PR #587, `[[carsi-safe-shipping]]`, `[[ccw-carsi-nrpg-program]]`

---

## 1. Problem / intent

Roadshow attendees should receive **three attendee-exclusive Course Offers** — CCW store credit (Shopify), CARSI 1-year membership (discounted), RestoreAssist assisted-setup (discounted) — and these must be a **permanent, reusable feature** across every roadshow event (Melbourne/Sydney/Brisbane + future), **activated only on the days of the course** and surfaced only to verified attendees.

Today these offers are DESIGNED (tracker WS5/6/7) but not built into the roadshow flow, and each has an external dependency that is **not yet satisfied** (see §7).

## 2. Goals

1. A single, config-driven **Attendee Offers** structure on the roadshow event model — one place, works for all events.
2. **Server-side date-gating**: offers are active *only* within an event's own `[startDateIso, endDateIso]` window (AEST), never before/after.
3. **Attendee-gating**: offers/claim links reach only verified attendees (via `freeEntryToken` / signed-in enrolled attendee) — never public.
4. **Wire into the Day-1 welcome email** (and attendee portal) so participants get their offers on the day.
5. **Fail-closed on non-permanent URLs** (reject `*.shopifypreview.com`) so a temporary link is never emailed.
6. **Dark by default** behind a flag; no prod behaviour change until owner enables + the dependencies land.

## 3. Non-goals (out of scope)

- Building the **CCW voucher redemption** itself — that lives entirely on CCW's Shopify (Toby). We store + surface the **permanent product URL** only.
- Creating the **CARSI Stripe coupon/price** — Rana creates the live `$795` annual price + tracked coupon (WS6 / Decision §3). This spec *consumes* a coupon ref; it does not mint one.
- The **RestoreAssist** discount build — separate repo, separate gate (`no auto-PR into RA main`); this spec only defines how CARSI *links* to it.
- Changing the claim window semantics (owner-locked: claimable during the 2 days; benefit then runs its normal term).
- Payment/checkout refactors, subscription enablement, portal auth (owned by WS4/UNIT-A #587).

## 4. Design

### 4.1 Data model (`src/lib/marketing/ccw-roadshow.ts`)

Add an optional offers block to `CcwRoadshowEvent` (shared across all events; per-event override possible later):

```ts
type CcwOfferKey = 'ccw-store-credit' | 'carsi-membership' | 'ra-setup';

type CcwAttendeeOffer = {
  key: CcwOfferKey;
  label: string;               // participant-facing, soft (no hard price until live)
  detail: string;              // one line; how to claim
  url?: string;                // CCW / RA: permanent product URL (NOT a preview URL — §4.5)
  membershipPriceAud?: number; // CARSI: price passed to grantYearlyMembership (e.g. 295); NOT a coupon
  live: boolean;               // false = configured but not yet activatable (dependency unmet)
};
```

- Offers are the same three across events by default; expose as `ccwRoadshowAttendeeOffers` and reference per event (so Sydney/Brisbane inherit automatically).
- **CARSI membership delivery reuses `grantYearlyMembership({ priceAud: membershipPriceAud })`** (12-month grant + `paymentReference` + `sendYearlyMembershipEmail`) on an attendee-gated admin/route path — **not** a self-serve Stripe coupon (none exists). `membershipPriceAud` is server-side only.
- **No hard prices in the participant-facing `label`/`detail`** until `live: true` AND owner confirms (keeps the "soft until live" decision enforceable in code).

### 4.2 Date-gating (authoritative, server-side)

```ts
function areAttendeeOffersActive(event: CcwRoadshowEvent, now: Date): boolean
```

- `true` **iff** `now ∈ [startDateIso, endDateIso]` for that event (AEST, inclusive of both course days).
- Uses the event's own ISO window — no separate date field to drift.
- **Server-side only** — the client clock is never trusted for activation.

### 4.3 Attendee-gating

- Offers surface only to a **verified attendee**: a valid `freeEntryToken` for that event, or a signed-in account enrolled in that event's course (reuse UNIT-A #587 sign-in / provisioning source of truth).
- Non-attendees (public site, unauthenticated) **never** see claim URLs/coupon refs.

### 4.4 Welcome-email wiring (Day-1)

- On Day-1 sign-in provisioning (UNIT-A #587 flow), the welcome email includes **only the offers where `live === true` AND `areAttendeeOffersActive(event, now)` AND the URL/coupon passes validation** (§4.5).
- If an offer isn't live yet, it is silently omitted (no broken/placeholder links) — the email still sends with whatever is live.

### 4.5 Permanent-URL guard (fail-closed)

- A validator rejects any offer `url` whose host matches `*.shopifypreview.com` (or is otherwise a known-temporary preview host). Such an offer is treated as **not live** (omitted from email + portal) and logged.
- Rationale: the CCW link supplied 2026-07-15 was a Shopify *preview* URL; hardcoding it would break. Only a published product URL may go live.

### 4.6 Feature flag

- `CCW_ATTENDEE_OFFERS_ENABLED` (default **false**). While false: no offer surfaces anywhere. No prod behaviour change on merge.

## 5. Acceptance criteria

1. `CcwRoadshowEvent` carries a shared `offers` block; all three events (Melbourne/Sydney/Brisbane) resolve the three offers with no per-event duplication.
2. `areAttendeeOffersActive` returns **false** the day before an event, **true** on both course days (AEST boundaries), **false** the day after — unit-tested for each event's window incl. AEST edges.
3. Offers never surface when `CCW_ATTENDEE_OFFERS_ENABLED` is false (default).
4. Offers never surface to an unauthenticated/non-attendee caller (attendee-gating test).
5. An offer whose `url` is a `*.shopifypreview.com` host is treated as not-live and is **omitted** from the welcome email + portal (fail-closed test).
6. The Day-1 welcome email renders exactly the offers that are `live` AND active AND URL-valid; omits the rest; still sends if some/all are absent.
7. Participant-facing offer copy contains **no hard price** unless `live === true` (soft-until-live enforced).
8. CARSI membership offer is delivered by **`grantYearlyMembership({ priceAud: membershipPriceAud })`** on an attendee-gated path (reusing the existing admin mechanism) — never a public promo code (Decision §3). No coupon primitive is introduced.
9. No offer is claimable outside its event's 2-day window even if the client requests it (server rejects; date-gate is authoritative).
10. Merging to `main` with the flag off produces **zero** behaviour change (dark-launch proof).
11. Offers render **only** for a successfully-provisioned, **non-quarantined** attendee — a row quarantined by `provision.ts` (established-account email) receives no offers.

### 4.6a Flag justification (per judge §12.3)
A **separate** `CCW_ATTENDEE_OFFERS_ENABLED` flag (distinct from `CCW_ATTENDANCE_ENABLED`) is intentional: attendance provisioning (accounts/enrolment/certificate) is a different risk surface from money offers (Shopify/Stripe/RA), and the offers depend on external parties (Toby's URL, Rana's price) landing *after* attendance may already be live. Independent flags let attendance run live while offers stay dark until each §7 dependency is satisfied.

## 6. Verification

- **Unit (vitest):** date-gate (before/during×2/after, AEST edges, all 3 events); flag off; attendee vs non-attendee; preview-URL rejection; welcome-email offer selection (all-live / some-live / none-live); soft-copy-no-price invariant.
- **Local gate:** tsc clean, eslint clean, vitest green, prisma validate (if schema touched — expected NOT to be; offers are config, not DB). No repo CI green-cite unless the required checks actually ran (path/label-gated; see `[[carsi-safe-shipping]]`).
- **Dark-launch proof:** flag-off snapshot identical to pre-change.
- Gated (not provable here): live Shopify redemption, live Stripe coupon application, RA cross-repo — verified by Rana/Toby in their surfaces.

## 7. Dependencies / gates (blockers to going live — NOT to building dark)

| Dep | Owner | Needed for |
|-----|-------|-----------|
| ~~Permanent CCW Shopify product URL~~ ✅ **DONE 2026-07-15** — `https://ccwonline.com.au/products/ccw-carsi-2-day-in-house-training` (verified live: "CCW/CARSI 2 Day In-house Training", $100→$150 credit). `ccw-store-credit` now `live:true`. | Toby | — |
| **CARSI live `$795` annual price + tracked coupon ref** | Rana | `carsi-membership` offer `live: true` |
| **RA assisted-setup discount mechanism** (coupon vs in-app; RA repo) | RA / Rana | `ra-setup` offer `live: true` |
| **Financial sign-off** (funding model, GST) | Owner | any offer live |
| Flag flip `CCW_ATTENDEE_OFFERS_ENABLED=true` (DO env) | Owner/Rana | activation |

Building the feature **dark** needs none of the above; **activating** each offer needs its row satisfied.

## 8. Open questions

1. **RA discount** — coupon code the attendee redeems on the RA site, or an in-app entitlement flag? (changes whether CARSI links out or passes a token)
2. **CCW product** — is `ccw-carsi-2-day-in-house-training` the $100→$150 store-credit voucher itself, and does redemption/crediting happen entirely on CCW Shopify (we only link)? Confirm the permanent URL + the exact CTA wording.
3. **Portal vs email** — is the welcome email the only delivery, or also a persistent "My Offers" panel in the attendee portal (WS4)? (email is in-scope; portal panel could be a fast follow)
4. **Claim proof** — do we need to record which attendee claimed which offer (for reconciliation/marketing), or is claim tracked entirely on CCW/Stripe side?

## 9. Recommended build order (after `/judge` + sign-off)

1. Config + `areAttendeeOffersActive` + preview-URL guard + flag (pure, fully unit-testable, zero prod effect). **← safe first slice.**
2. Welcome-email wiring into UNIT-A #587 provisioning (behind flag).
3. Attendee-portal "My Offers" panel (optional fast-follow).
4. Activate offers one row at a time as each §7 dependency lands.
