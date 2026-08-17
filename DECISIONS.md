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
| 15 | Four LIVE course URLs are branded with IICRC discipline acronyms — `wrt-water-damage-essentials`, `asd-structural-drying-core`, `cct-commercial-carpet-core`, `fsrt-fire-smoke-restoration-core` | Default: agents prepare new topic slugs + 301 redirects and a preview; you approve before it publishes (public URL surface, SEO + inbound links at risk) | 2026-08-25 | OPEN |
| 16 | Is "CEC-accredited training" allowed while the CEC approvals registry is empty? It is live on ~19 surfaces (12 industry pages, the hero infographic, `designations.json`) | No default — licence-critical claim. Agents will not mass-rewrite live copy on a reading of the rules; escalates daily. | 2026-08-22 | OPEN |
| 17 | `/terms` §5 states courses ARE IICRC-approved for CECs and that CARSI reports completions to the IICRC; §4 describes only subscriptions; §1 says "ABN to be confirmed" | No default — a published contract. Agents drafted the Refund Policy it now links to, but will not rewrite the Terms themselves. | 2026-08-24 | OPEN |
| 18 | `/courses` carries an interactive **"IICRC Discipline Map"** whose seven nodes are the discipline acronyms, and an FAQ answer advising which IICRC discipline to choose | No default — removing or reframing a feature on the flagship commercial page is a product and SEO decision, not a copy fix. Agents fixed the copy that branded CARSI's own range; this is what remains. | 2026-08-22 | OPEN |
| 19 | **Three live course page `<title>` tags carry the banned "[discipline]-aligned" phrase** — "(ASD-aligned)", "(CCT-aligned)", "(FSRT-aligned)". They exist ONLY in the production database, not in the repo, so no guard can reach them and no agent can edit them | No default — prod DB content is founder-only via the authed admin session. This is the most exposed licence finding of 2026-08-18: a `<title>` is the browser tab, the SEO title and the Google result. | **2026-08-20** | OPEN |

## Decided (move rows here with date + outcome)
- 2026-08-16 · Telegram competing-idea-bots → rejected in favour of single cockpit bot (founder direction + blueprint §5)

## Notes on open rows

**#7's AAA half is MEASURED and NOT met (2026-08-18).** The default reads "WCAG 2.1 AA
everywhere + AAA on enrol/learn/checkout flows", and until now the AAA half was measured by
nothing — `e2e/a11y.spec.ts` scans `wcag2a`/`wcag2aa` only. Scanned with the AAA rules against
the two checkout entry pages that render without a database, `/pricing` and `/subscribe` both
fail **1.4.6 Contrast (Enhanced)**, on the light-mode brand blue `#146fc2` at **5.14:1 on
white** — clears AA at 4.5:1, misses AAA at 7:1. The dark-mode counterpart `#8fd0ff` is
11.77:1 and passes comfortably. AAA `2.4.9 Link Purpose` raised nothing.

**The remediation is narrower than it first appears.** 1.4.6 requires 7:1 for *normal* text but
only **4.5:1 for large text** (≥18pt/24px, or ≥14pt bold), and it does not govern non-text
elements at all — buttons, borders and focus rings fall under 1.4.11 at 3:1, which this blue
clears easily. At 5.14:1 `#146fc2` therefore **already conforms for headings, buttons and UI
furniture**; axe applies the large-text threshold itself, so the nodes it flagged are
specifically normal-size text. Three options, not two:

1. **Tint only normal-size text.** Keep `#146fc2` as the brand's dominant expression — headings,
   buttons, badges — and use a darker tint for body-size text and inline links. Meets the
   stated default without repainting anything anyone would recognise as the brand.
2. **Darken the light-mode brand blue** to something like `#0d4d87` (8.65:1, same colour
   family). Simplest rule, largest visual change.
3. **Amend this row to AA everywhere** and drop the AAA promise.

An agent should not repaint the brand overnight, so nothing was changed. A failing AAA gate was
deliberately **not** committed either — a red test in the tree is worse than an honest
measurement. The large-text distinction was raised by the `carsi-e7` session after an initial
write-up here overstated the scope as the whole landing system.

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

**#16 is a rules question, not a defect report, which is why it is here rather than fixed.**
`CLAUDE.md` explicitly APPROVES "IICRC CEC Accredited courses" as selling copy, and separately
requires that a course show CEC *hours* only after per-course IICRC approval. "CARSI's
CEC-accredited mould remediation training" sits between the two: it claims accreditation for
named training without stating hours. Read one way it is the approved provider-standing phrasing
with "IICRC" dropped; read the other it is a course-level accreditation claim while
`data/seed/cec-approvals.json` holds zero approvals. Both readings are defensible, the exposure
is the licence, and rewriting nineteen live customer-facing surfaces on an agent's reading is
exactly the kind of unilateral call that should not happen overnight. One clear case was fixed
without waiting: `wrt-water-damage-essentials` described *itself* as "a concise, CEC-accredited
introduction" with `cecHours: 0` — a specific course claiming its own accreditation, which no
reading permits. No guard catches any of this; measured with a positive control, the exact live
string passes every one.

**#11 is licence-adjacent, not merely commercial.** Australian Consumer Law obligations attach
to the per-course sale that is live today, and the only refund sentence on the site sits inside
a subscription clause that is still dark.
