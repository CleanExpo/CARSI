# DECISIONS.md — founder queue (every item has a default and a deadline; no silent stalls)

Rule: if the deadline passes with no answer, the DEFAULT applies and the daily brief says so.
External sends, spend, pricing and licence-critical claims NEVER default — they escalate daily.

| # | Decision | Default if silent | Deadline | Status |
|---|---|---|---|---|
| 1 | Send CEC submission packs (top 9 courses — `wrt-water-damage-essentials` is held back, see `docs/cec-submissions/README.md`) | No default — external send. Daily reminder escalates. | 2026-08-20 | OPEN |
| 2 | Flip SUBSCRIPTIONS_ENABLED after runbook passes | No default — revenue switch. Daily reminder. | 2026-08-23 | **DECIDED 2026-08-26 — founder said "switch the subscriptions on". AWAITING EXECUTION, which is founder-only and not merely by policy: this environment holds NONE of the five credentials required (`STRIPE_SECRET_KEY`, `DIGITALOCEAN_TOKEN`, `DO_API_TOKEN`, `DATABASE_URL`, `ADMIN_PASSWORD` — all verified absent 2026-08-26), so an agent cannot perform it even if permitted. `ENGINE.md` also names the subscription flip as the one action that is never autonomous. **Code side is ready and re-verified today**, not assumed: `npm run verify:go-live-readiness` exits 0 with pricing page HTTP 200, subscription status failing closed (`reason:"none"`), checkout returning HTTP 401 without a session, and directory health `stubBlocked:true`. The runbook `docs/runbooks/rana-stripe-connection.md` was checked against the code rather than trusted — price resolution really is `STRIPE_PRICE_PRO_ANNUAL` first then `lookup_key: carsi_pro_annual` (`src/lib/server/subscription-price.ts`, both paths unit-tested), and A$795 matches `pricing-tiers.ts` at `priceCents: 79500`. **Three manual steps remain, in this order:** (1) create the Stripe Product and Price — recurring yearly, AUD, unit amount 79500, tax behaviour **inclusive** (GST is in the $795, not added), `lookup_key=carsi_pro_annual`; (2) run the Test Clock checklist; (3) set `SUBSCRIPTIONS_ENABLED=true` on DigitalOcean `monkfish-app` — the go/no-go switch, and last. Until step 3, checkout fails closed with an honest "not yet available" message and never charges against a wrong Price. |
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

---

## Added 2026-08-26

| # | Decision | Default if silent | Deadline | Status |
|---|---|---|---|---|
| 17 | **Rotate then seal the `monkfish-app` secrets.** `doctl apps spec get` returns env vars in plaintext, including a **live `sk_live_` Stripe key** and the Mailtrap key — 43 of 44 unencrypted, only `CRON_SECRET` sealed. Anything holding `doctl` on any machine can read them, and has been able to. | No default — credential handling, escalates daily. An agent cannot do this: sealing means submitting the live values, which is prohibited regardless of authorisation. | 2026-08-28 | OPEN |
| 18 | **Melbourne and Sydney: new dates, or retire the listings.** Both events finished (22–23 and 30–31 July) and `/events/ccw-roadshow` still lists and sells them. Dates were deliberately **not** invented; a test pins the expired set exactly so it cannot be forgotten. | Default: **remove both listings** if no dates by the deadline. A page selling a past event is worse than a page with one city on it. | 2026-08-29 | OPEN |
| 19 | **Does CCW still owe its customers free entry?** The founder set $149/seat for every customer and retired free entry, and the code now says so throughout. If CCW promised its own customer base free attendance, that is a partner commitment this repo cannot see. | No default — a partnership term, not a price. Escalates. | 2026-08-29 | OPEN |
| 20 | **Flip `ROADSHOW_PAYMENT_REQUIRED=true`.** Pay-to-play is built, tested and dark: a booking takes a 72-hour hold that counts against the cap, Stripe checkout runs, and the webhook refuses to confirm a lapsed hold rather than overselling. | No default — money. **Sequence it after #17**; turning payments on while a live key sits in plaintext is the wrong order. Brisbane is 4 September, so this is the deadline that actually bites. | 2026-09-01 | OPEN |
| 21 | **A free course for the row-11 email-capture funnel.** BACKLOG row 11 assumes a free library to capture from. All 37 catalogue courses are `isFree: false`, so the funnel has no front door. | No default — pricing. | 2026-09-05 | OPEN |

**Decided by the founder on 2026-08-26, recorded here as context rather than as open rows:**
$149 per seat at every location; free entry retired outright ("we just offered this to see if
there was a market" — it worked, so it ends rather than pauses); Brisbane moved to Friday 4 –
Saturday 5 September 2026; and #2, the subscription flip, decided and awaiting execution only.

**A note on this file's own track record, measured 2026-08-26.** It held 16 rows, **11 past their
deadline**, and **not one has ever been marked RESOLVED, DONE or CLOSED**. Writing a blocker here
unblocks the *agent*, not the *work* — so no row above should be treated as progress, and nothing
downstream should be built assuming an answer arrives. That is why #18 carries a real default:
where a safe fallback exists, the deadline should do something rather than pass quietly.
