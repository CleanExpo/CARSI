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
| 15 | GP-523-D1 — course URL slugs still carry a lowercase IICRC discipline prefix (`cct-commercial-carpet-core`, plus wrt/asd/amrt/fsrt) | Default: KEEP the slugs for now; rename ships only with 301 redirects in a follow-up. Rendered copy is already clean and stays guarded. | 2026-08-25 | OPEN |

| 16 | **Prod-DB access path for the 43 live courses absent from repo seed** — 4 live courses carry banned IICRC designation branding on carsi.com.au NOW (`CCT-aligned`, `WRT`, `FSRT-aligned`, `ASD-aligned`); 3 of the 4 are not in the repo, so no agent can reach them | No default — licence-critical. Escalates daily. | 2026-08-21 | OPEN |

## Decided (move rows here with date + outcome)
- 2026-08-16 · Telegram competing-idea-bots → rejected in favour of single cockpit bot (founder direction + blueprint §5)
- 2026-08-19 · **Independent-reviewer credential → RESOLVED by founder.** All three reviewer
  options were down (no OpenRouter key, no second-vendor CLI, Codex rate-limited **and exiting 0
  while failing**), so no agent could complete a release gate and Level 1 work accumulated
  committed-but-unshippable. Founder set `OPENROUTER_API_KEY` + `OPENROUTER_MODEL`
  (`qwen/qwen3.8-27b`) in Vercel `unite-group/carsi-web` production env; agents pull via
  `vercel env pull`. Proven working the same day: the reviewer failed a planted mutation and
  passed the real diff, minting the first `PR_RELEASE_GATE_PASS` of the session (PR #680).
  A local `gemma4:12b` was tried first and **failed the same mutation control** — it quoted the
  defective line and returned PASS — so Ollama was removed from the Mac Mini entirely (60 GB).

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

**#15 exists because a compliance guard was blind, not because the slugs are new.** The GP-523
branding test asserted the seed catalogue carried no discipline acronym and passed — but its
regex lacked the `i` flag, so it matched `CCT` and never `cct-commercial-carpet-core`. Adding the
flag turned that assertion red against five real slugs (`wrt-`, `asd-`, `amrt-`, `fsrt-`, `cct-`),
which is how the exposure surfaced. The guard now runs case-insensitively and exempts the five
deferred slugs by literal VALUE; an acronym in a title, or a bare lowercase acronym, still fails,
and both directions are asserted in the test's positive-control block.

> **Corrected 2026-08-18 after review.** This paragraph previously read "exempts *only*
> slug-shaped lowercase matches" and closed "the deferral covers URLs only — rendered copy is
> clean". Both overstated the guard. The exemption was keyed to slug SHAPE, so it erased any
> lowercase acronym-hyphen-word token from any string literal: a mutation placing `cct-certified`
> in a real `title:` field left the guard green, and no other check caught it. Fixed by keying the
> exemption to the five literal slug values, with the mutation pinned as a regression test.

Renaming the slugs without
redirects would break live URLs, `app/sitemap.ts:137` and indexed SEO, so the rename is deferred
rather than rushed into a licence fix. **The deferral covers the five slug URLs only. Rendered copy
carries no acronym today, and since the 18/08 fix the guard actually enforces that rather than
merely asserting it.**

**#11 is licence-adjacent, not merely commercial.** Australian Consumer Law obligations attach
to the per-course sale that is live today, and the only refund sentence on the site sits inside
a subscription clause that is still dark.
