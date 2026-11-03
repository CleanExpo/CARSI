# DRAFT, NOT APPLIED: Demo US chapter with USD pricing (GP-637 step needing GP-632)

**Status: draft for review. Nothing in this file runs.** It is deliberately outside
`prisma/migrations/`, because `npm start` runs `prisma migrate deploy` on production and would
apply anything placed there.

## Why it is a draft

GP-637 asks for a demo coach in a chapter called "Demo US" with USD pricing. The current schema
has no coach or chapter table: `carsi_coaching_sessions.coach_name` is free text, and pricing is
a single AUD constant in `src/lib/marketing/carsi-coaching-monthly.ts`. Chapters and per-coach
currency are GP-632 (Coaching advantage A5), which is still Todo and owns that design.

The seed in this PR therefore labels sessions with `coach_name = 'Demo Coach'` and does not
create a coach row, chapter or price.

## What GP-632 needs to provide for the demo to show a chapter

1. A coaches table (GP-632 build step 1): user id, display name, chapter slug, currency, Stripe
   price id, notification email.
2. `coach_id` on the member's business profile.
3. Coach-specific price display (GP-632 build step 4), with the GST line shown only for AU.

## What the seed would add once GP-632 lands

- One coach row: display name "Demo Coach", chapter slug `demo-us`, currency `USD`,
  notification email on `demo.carsi.invalid`, **no Stripe price id** (a demo must never be able to
  take a real payment).
- The demo member's `coach_id` pointed at that coach.
- Same rules as today: deterministic ids, demo rows only, dry run by default.

## What Phill must approve

- The GP-632 schema migration itself (production schema change: founder approval).
- Whether a demo chapter may exist on the production database at all, or only on a preview one.
- Which preview database hosts the demo, so a nightly reset can be scheduled against it.
