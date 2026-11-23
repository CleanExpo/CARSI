# Business Coaching under CARSI (GP-561)

Parent goal for the coaching product line. Child work is tracked in Linear:

| Issue | Scope | Repo status (2026-11-23) |
| --- | --- | --- |
| GP-591 | Stranger → first course (SPM) | Runbook + e2e smoke added |
| GP-632 | A5 multi-coach chapters | `coach_user_id` + `chapter_slug` on profiles; portal routing |
| GP-637 | A10 partner demo | `/ccw-training/partner-demo` — step 10 now live |
| GP-628/A1 | AI onboarding brief | Generated on submit; admin API to regenerate |
| GP-630 | A3 Ask my coach | Portal panel (flagged); corpus admin |
| GP-636 | A9 TradeHall | `/dashboard/coaching/tradehall` passport; seminar video TBD |
| (portal) | Member workspace | `/dashboard/coaching` — receipts, chapter card, marketing pack |

**Member-facing roof (engineering):** session receipts on `/dashboard/coaching/sessions`, coach chapter strip (A5 default), TradeHall preview under Resources, live portal copy on `/ccw-training`, `npm run verify:product-excellence`.

**Still founder-owned for “100% business”:** Round 2 offer pricing/cadence, AI authority boundaries, record location (Mission Control vs CARSI), Stripe coaching in prod checklist.

Next integration gates: Stripe coaching subscription in prod, founder-approved demo on sales calls, then A5 schema migration for `coachUserId` / `chapterSlug` on profiles.