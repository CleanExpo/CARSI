# DECISIONS.md — founder queue (every item has a default and a deadline; no silent stalls)

Rule: if the deadline passes with no answer, the DEFAULT applies and the daily brief says so.
External sends, spend, pricing and licence-critical claims NEVER default — they escalate daily.

| # | Decision | Default if silent | Deadline | Status |
|---|---|---|---|---|
| 1 | Send CEC submission packs (top 10 courses) | No default — external send. Daily reminder escalates. | 2026-08-20 | OPEN |
| 2 | Flip SUBSCRIPTIONS_ENABLED after runbook passes | No default — revenue switch. Daily reminder. | 2026-08-23 | OPEN |
| 3 | Send 3 outreach emails (BSCAA / RIA / SCA) | No default — external send. Daily reminder. | 2026-08-20 | OPEN |
| 4 | Approve benchmark survey instrument | Default: 30-min review session auto-scheduled | 2026-08-23 | OPEN |
| 5 | Marketplace PR #1 (unite-group-marketplace) | Default: DE-SCOPE plugin; skills stay in-repo | 2026-08-22 | OPEN |
| 6 | Lucide icon rule | Default: ADOPT narrowed rule (custom marks for brand/status; Lucide for generic UI) | 2026-08-22 | OPEN |
| 7 | Accessibility target | Default: WCAG 2.1 AA everywhere + AAA on enrol/learn/checkout flows | 2026-08-22 | OPEN |
| 8 | Ad budget for authored campaigns (suggest $300–500/mo trial) | No default — spend. Weekly reminder. | 2026-08-27 | OPEN |
| 9 | First franchise target (suggest Jim's Cleaning Group) | Default: agents draft for Jim's; you approve before send | 2026-08-27 | OPEN |
| 10 | Merge lane for `main`: it deploys to production on push and requires no PR review | Default: KEEP as-is, and agents never open a PR without a passing release receipt | 2026-08-24 | OPEN |
| 11 | Refund terms for per-course purchases (none exist; `/terms` covers only subscriptions) | Default: agents DRAFT per-course refund terms + a `/refund-policy` page; you approve before publish | 2026-08-24 | OPEN |
| 12 | Level names for the CARSI tier ladder (Foundation → Practitioner → Advanced → top tier TBD) | No default — naming is founder-owned. Agents propose 3 naming sets; you pick. | 2026-08-30 | OPEN |
| 13 | Public Research Notes page (1 distilled, cited note/week) — go? | Default: YES at Gate 1 — it is the E-E-A-T engine | 2026-08-30 | OPEN |
| 14 | Paywalled-journal budget for the evidence sweep | Default: OPEN-ACCESS ONLY (commits no spend). Any paid source is a new cost → founder-only. | 2026-08-30 | OPEN |
| 16 | **`OPENROUTER_API_KEY` for the independent-reviewer swarm** — all three reviewer options are down (no OpenRouter key, no second-vendor CLI, Codex rate-limited to 2026-08-20 and **exiting 0 while failing**), so no agent can complete a release gate; work queues instead of shipping | Default: SET the key — it is the free, non-Anthropic reviewer and the cheapest unblock for autonomous operation | 2026-08-21 | OPEN |
| 15 | **Prod-DB access path for the 43 live courses absent from repo seed** — 4 live courses carry banned IICRC designation branding on carsi.com.au NOW (`CCT-aligned`, `WRT`, `FSRT-aligned`, `ASD-aligned`); 3 of the 4 are not in the repo, so no agent can reach them | No default — licence-critical. Escalates daily. | 2026-08-21 | OPEN |

## Decided (move rows here with date + outcome)
- 2026-08-16 · Telegram competing-idea-bots → rejected in favour of single cockpit bot (founder direction + blueprint §5)

## Notes on open rows

**#5, #6, #7 were already applied as their defaults during the 2026-08-17 readiness loop.**
That work ran under de-scope (marketplace PR #1 was verified OPEN and unmerged), the narrowed
Lucide rule, and AA-everywhere-with-AAA-on-enrol/learn/checkout. Nothing needs redoing if you
confirm; if you override any of the three, only the accessibility target changes measured work
(the readiness scorecard's row 13 reports AA coverage only, AAA unmeasured — that file is
`docs/RELEASE-READINESS.md` on branch `docs/release-readiness-20260817`, not yet on `main`).

**#10 is new and was not previously written down.** `app.yaml` sets `deploy_on_push: true` on
`main`, so a merge is a production release with no staging step. `main`'s protection requires
`Build Check` and `Frontend Tests`, enforces admins and requires conversation resolution — but
requires **no pull-request review** and permits force-pushes. That combination means nothing
structurally prevents an unreviewed production deploy. It is recorded here as a decision rather
than a discovery because leaving it implicit is itself a choice.

**#11 is licence-adjacent, not merely commercial.** Australian Consumer Law obligations attach
to the per-course sale that is live today, and the only refund sentence on the site sits inside
a subscription clause that is still dark.
