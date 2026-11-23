# Business Coaching under CARSI (GP-561)

Parent goal for the coaching product line. Child work is tracked in Linear:

| Issue     | Scope                         | Repo status (2026-11-23)                                                 |
| --------- | ----------------------------- | ------------------------------------------------------------------------ |
| GP-591    | Stranger → first course (SPM) | Runbook + e2e smoke added                                                |
| GP-632    | A5 multi-coach chapters       | Chapter registry, admin `/admin/coaching-chapters`, member assignment    |
| GP-637    | A10 partner demo              | `/ccw-training/partner-demo` — step 10 now live                          |
| GP-628/A1 | AI onboarding brief           | Generated on submit; `/admin/coaching-members` + regenerate → draft plan |
| GP-630    | A3 Ask my coach               | Portal panel (flagged); corpus admin                                     |
| GP-636    | A9 TradeHall                  | Passport + in-portal seminar replays (YouTube embeds)                    |
| (portal)  | Member workspace              | `/dashboard/coaching` — receipts, chapter card, marketing pack           |

**Member-facing roof (engineering):** session receipts on `/dashboard/coaching/sessions`, coach chapter strip (A5 default), TradeHall preview under Resources, live portal copy on `/ccw-training`, `npm run verify:product-excellence`.

**Coach admin roof:** `/admin/coaching-members` — chapter/coach assignment (GP-632), read A1 briefs, regenerate brief, apply suggested focus to draft growth plan (never overwrites approved).

**Round 2 in repo (defaults):** `coaching-ai-governance.ts` + admin chapters page — founder can override copy. **Prod-only:** Stripe live keys, Phill T0 constraint validate.

Next integration gates: Stripe coaching subscription in prod, founder-approved demo on sales calls, Phill validates `assigned_to` CHECK (T0) after prod audit.
