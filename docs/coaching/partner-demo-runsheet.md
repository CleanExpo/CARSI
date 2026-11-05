# Business Coaching partner demo: ten-minute run sheet (GP-637)

Use this on a call with a prospective partner coach. It shows the member journey on the real
portal, using one seeded demo member. Every screen is real; the business and its data are samples.

The step list below is mirrored in `src/lib/coaching-portal/partner-demo.ts` and shown on the
noindex page `/ccw-training/partner-demo`. A unit test keeps the three in the same order.

## Before the call (once per environment)

1. Seed the demo member on a **local or disposable preview** database. Never production.

   ```bash
   # dry run first: prints every write, changes nothing
   CARSI_COACHING_DEMO_ENABLED=true DATABASE_URL="postgresql://...@127.0.0.1:5432/carsi" \
     npm run db:seed-coaching-partner-demo
   # then write
   CARSI_COACHING_DEMO_ENABLED=true DATABASE_URL="postgresql://...@127.0.0.1:5432/carsi" \
     npm run db:seed-coaching-partner-demo -- --apply
   ```

   A preview database on another host must be named exactly: `--allow-host=<host>`.
   The script refuses everything else (exit 3).

2. Set the demo login's password once. The seed never handles a password: a new demo login is
   locked and cannot sign in. An admin opens `/admin/users/<id>` and uses **Reset password**.
   The user id and email are printed by the seed (`partner.demo.member@demo.carsi.invalid`).
   Turn off "send email" when resetting: the demo address cannot receive mail.
   Re-running the seed keeps that password.

3. Re-run the seed after each call (or nightly) to put the demo back to its starting state.
   It only ever touches the demo member's own rows.

Sign in as the demo member and keep this sheet beside you. A **Demo mode** banner sits across the
top of every portal screen.

## 1. Member home

- **Screen:** `/dashboard/coaching`
- **Proves:** one workspace per member.
- **Say:** "This is what your member sees every time they log in: the plan focus, the next action
  and the next session."

## 2. Business profile

- **Screen:** `/dashboard/coaching/onboarding/profile`
- **Proves:** structured onboarding.
- **Say:** "Before the first call, the member tells us about the business in their own words."

## 3. Business assessment

- **Screen:** `/dashboard/coaching/onboarding/assessment`
- **Proves:** evidence before the first call.
- **Say:** "Every question answered, and the coach's review feedback sits with it."

## 4. Onboarding packet

- **Screen:** `/dashboard/coaching/onboarding/packet`
- **Proves:** A1 onboarding brief. Today this is the frozen packet the coach receives.
- **Say:** "The coach gets the whole picture in one packet. The AI-written brief and draft first
  plan are being built (GP-628)." Do not say the system wrote this plan: in the demo it is seeded.

## 5. Growth plan

- **Screen:** `/dashboard/coaching/plan`
- **Proves:** a coach-approved plan.
- **Say:** "One focus, a direction, and the latest guidance from the coach."

## 6. Action board

- **Screen:** `/dashboard/coaching/actions`
- **Proves:** dated commitments with coach feedback.
- **Say:** "Six actions: done, in progress, to do and one blocked. The blocked one is where the
  coach steps in."

## 7. Sessions

- **Screen:** `/dashboard/coaching/sessions`
- **Proves:** every session ends in decisions.
- **Say:** "Last session's decisions are the receipt. Next session already has the member's prep."

## 8. Learning path and resources

- **Screen:** `/dashboard/coaching/resources`
- **Proves:** A6 prescribed learning path (GP-633).
- **Before the demo:** in Admin, open **Learning paths**, choose the demo member and press
  **Assign from assessment** (the seed does not assign it), then **Approve path**. A new path is
  a draft the member cannot see until it is approved. The demo answers point to sales,
  operations and technology gaps, so up to four published courses are prescribed. The
  **Gap-to-course map** on the same page sets which courses each gap prescribes.
- **Say:** "The member's assessment picked these CARSI courses, and I approved them before the
  member saw them. Their progress shows here and on the Actions board, and finishing a course
  ticks off the action. I can remove, add or reorder courses for each member, and change which
  courses each gap prescribes."

## 9. Marketing pack

- **Screen:** `/dashboard/coaching/marketing`
- **Proves:** A7 marketing pack (GP-634).
- **Say:** "Each member gets an automated review of their website and Google link, a local-search
  checklist, 30 days of claim-safe social drafts, and ranked fixes. Fixes land on the action board
  as proposed items until the coach approves them."

## 10. Ask my coach assistant

- **Status:** coming (GP-630). Nothing to click yet.
- **Proves:** A3.
- **Say:** "Members will ask questions answered from your own material, and unanswered ones come to
  you."

## 11. Your chapter and the Hall

- **Status:** coming (GP-632 chapters, GP-636 TradeHall). Nothing to click yet.
- **Proves:** A5 and A9.
- **Say:** "You would run your own chapter: your name, your members, your currency. A US chapter
  prices in US dollars. Your members also get a seat in the Hall."

## What is not in the demo yet

- The **Demo US chapter with USD pricing** needs GP-632's coach table. It is drafted, not built:
  see `docs/coaching/partner-demo-chapter-DRAFT.md`.
- **Assistant exchanges** are not seeded because that screen is still being built (GP-630). The
  marketing pack is live — build or open a saved pack on `/dashboard/coaching/marketing`. The
  learning path is assigned by hand before the demo (section 8).
- **Scheduled nightly reset** is not set up. Re-running the seed is the reset; scheduling it needs
  a decision on which preview database the demo lives in.
