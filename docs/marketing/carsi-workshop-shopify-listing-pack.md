# CARSI Carpet Cleaning Workshop: Shopify listing pack (DRAFT, not for release)

Status: draft prepared 20/11/2026. Nothing in this file is live. Do not publish, activate a paid
listing, set revenue terms or send any link to CCW until the release approvals at the end are given.

## 1. The one permanent CARSI course URL

**https://carsi.com.au/workshops/carpet-cleaning**

- CARSI-owned path. It carries no partner name, so it never has to change if the venue partner changes.
- The old path `/ccw-training/workshop` permanently redirects (308) here, so printed QR codes and old
  links keep working. `/ccw-materials` redirects to `#materials` on the same page.
- The page is public programme information. The course itself is not in the public catalogue, the
  sitemap course list, llms.txt or LMS search (unlisted).
- The page shows each visitor the right next step. Signed-out visitors see a sign-in prompt. Signed-in
  visitors with no cohort enrolment are asked to contact CARSI. Cohort members and instructors get
  "Open the course" and the participant manual.

Use this URL, and only this URL, as the "learn more / access your course" link in any Shopify listing.

## 2. Listing copy (for CCW's store, CARSI as the course brand)

**Title:** CARSI Carpet Cleaning Workshop (2 days, hands-on)

**Short description:**
Two practical days with CARSI: fibre, chemistry, methods, upholstery, hard floors, business and
machinery. Every attendee gets free access to the 16-module CARSI online course and participant manual.

**Body:**
- Trainer: Phill McGurk, CARSI.
- What you do: live fibre burn tests, pH and chemistry, the five cleaning principles at four
  hands-on stations, spot and stain decision tree, upholstery pre-inspection and six cleaning methods,
  hard-floor inspection, machinery maintenance, costing and pricing.
- After the two days: free CARSI online course and participant manual at
  carsi.com.au/workshops/carpet-cleaning. Your CARSI account is created when you check in on Day 1.
- Certificate: a CARSI certificate of attendance once you are checked in on both days. No IICRC CECs
  are attached to this workshop.
- Partner credit: delivered on the CARSI roadshow with partner venue Carpet Cleaners Warehouse (CCW).

The copy deliberately leaves out prices, dates, voucher values and any checkout link. Those are
set by the founder and CCW at release (section 6).

## 3. Listing assets (existing, rights already held by CARSI)

| Asset | Path | Use |
|---|---|---|
| Course hero image | `public/images/courses/upholstery-cleaning.webp` (1024 x 1024) | Shopify product image |
| CARSI logo | the approved CARSI logo used by `src/lib/certificate/CertificateArt.tsx` | Brand mark |
| Page proofs | captured in the evidence folder of this change | Listing review only |

No new imagery was generated. No CCW logo is placed on CARSI course material.

## 4. Existing Shopify-to-CARSI integration (investigated 20/11/2026, read-only)

What exists:
- No Shopify order integration. There is no Shopify webhook route, no Shopify HMAC check, no
  product-to-course mapping and no order-to-enrolment code in the CARSI repository.
- One live outbound link: `src/lib/marketing/ccw-roadshow-offers.ts` holds CCW's permanent product URL
  for the 2-day training voucher (a CCW store-credit product, not a course grant). It appears in the
  post-event offer email only when the attendee completed both days and opted in to email.
- Free access for roadshow attendees already works without Shopify: Day-1 check-in creates the CARSI
  account and enrols the attendee in `ccw-2-day-workshop` (`src/lib/server/ccw-attendance/provision.ts`).
  Both days checked in issues the certificate of attendance.
- Paid course enrolment exists for Stripe only (`app/api/lms/webhooks/stripe/route.ts`, keyed by
  `course_slug` metadata).

Recommendation: do not build a Shopify webhook for this course. Eligible attendees are entitled through
check-in, which is already server-side and fail-closed. The Shopify listing only needs to link to the
permanent URL above. A Shopify `orders/paid` webhook is needed only if the founder later decides to
sell course-only access through CCW's store; that is a separate, founder-approved build (new secret,
HMAC verification, idempotency record, product-to-slug map).

## 5. Verified enrolment flow (what is tested in this change)

| Step | Who | Result | Evidence |
|---|---|---|---|
| Referral | Anyone following the Shopify link | Lands on the CARSI workshop page | Browser check at desktop and phone size |
| Login | Signed-out visitor | Sign-in and password-reset prompts; no course content | Browser check; unit tests |
| Enrolment | Roadshow attendee | Enrolled at Day-1 check-in by the attendance batch | Existing provision tests |
| Course access | Enrolled attendee | Course and participant manual open | Local browser check at desktop and phone size |
| Course access | Signed-in non-attendee | Refused (403 lessons and manual; not shown in search) | Unit tests |
| Instructor manual | Instructor or admin only | Opens; attendees get 403 | Unit tests |

## 6. Outstanding blockers and the exact approvals required

1. **Course data into production** (founder): run the existing seeders for this one slug after
   merge: `npm run db:seed-courses -- --slug=ccw-2-day-workshop` then
   `npm run db:seed-quizzes -- --slug=ccw-2-day-workshop`. Production writes are founder-only.
2. **Sydney attendee check**: confirm in Admin > CCW roadshow > Sign-ins that every Sydney attendee row
   is `provisioned`. Rows held as `needs_confirm` need an admin decision before those attendees can
   open the course.
3. **Instructor accounts**: give each authorised trainer the `instructor` role. Without it they cannot
   open the instructor manual.
4. **Independent verification** of the deployed course (founder rule: no customer-facing link to CCW
   before this).
5. **Shopify listing** (founder + CCW): approve the copy in section 2, the price (if any), revenue
   terms and the product URL. Until then the CCW product stays as it is and no checkout URL is created.
6. **Ship it**: Phill's explicit "ship it" after the release gate receipt passes. On CARSI a push merges
   itself once checks pass.
