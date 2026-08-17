# BACKLOG.md — the single queue (take the top unblocked item; add discoveries at the bottom)

Owner key: F = founder-only · A = agents · A→F = agents prepare, founder approves/sends

| # | Item | Owner | Gate | Status |
|---|---|---|---|---|
| 1 | Land GOAL/BACKLOG/DECISIONS/ENGINE in repo root; add "Read GOAL.md first" as CLAUDE.md line 1 | A | 0 | **done 2026-08-16** — merged to `main` as `41712c69` (PR #666) |
| 2 | Generate CEC submission packs for top 10 courses (`generate-cec-submission.ts`) + cover email draft | A→F | 0 | ready |
| 3 | Send CEC packs to CECCourse@iicrcnet.org | F | 0 | blocked on #2 |
| 4 | Subscriptions go-live: Stripe Prices + Test Clock + DO env; flip at go-live script exit 0 | A→F | 0 | ready — see note below |
| 5 | Personalise + send the 3 outreach emails (BSCAA, RIA, SCA — drafts in 2nd Brain/Plans) | F | 0 | ready |
| 6 | Approve benchmark survey instrument (DRAFT in docs/marketing) | F | 0 | ready |
| 7 | Pick first franchise target + agents draft pilot offer letter | A→F | 0 | ready |
| 8 | Wire the RWR metric: Stripe → weekly number in the daily brief | A | 0 | ready |
| 9 | Teams tier: seat pricing page + Stripe products + seat management ($99–149/seat/yr, 10/50/200) | A | 1 | ready |
| 10 | Employer proof-pack (transcript + training record PDF — PRODUCT_STRATEGY §5) | A | 1 | ready |
| 11 | Email capture + renewal-reminder funnel (free library → "CECs lapse in N months") | A | 1 | ready |
| 12 | NRPG directory launch prep: real listings only, free for CARSI-trained firms | A | 1 | ready |
| 13 | Ship authored Google Ads + LinkedIn campaigns at small budget | A→F | 1 | needs budget |
| 14 | AU price-anchoring page (vs $699–$1,150 instructor-led) | A | 1 | ready |
| 15 | Telegram cockpit: daily RWR + approvals + 3 founder actions | A | 1 | after #4 |
| 16 | Field benchmark survey (CARSI + CCW lists + INCLEAN + suppliers, n≥150) | A→F | 2 | blocked on #6 |
| 17 | RestoreAssist bundle: train + document + listed, one subscription | A | 2 | ready |
| 18 | SCA CPD provider application; RTO partner shortlist for QLD CPD | A→F | 2 | after #5 |
| 19 | NZ locale pass (en-NZ gap) | A | 2 | ready |
| 20 | Benchmark report + media pack (the citable dataset) | A→F | 3 | blocked on #16 |
| 21 | Evidence-layer template into course-production skill + one pilot course retrofit | A | 1 | ready |
| 22 | Public References block on course pages (+ llms.txt wiring) | A | 1 | after #21 |
| 23 | Weekly Research Notes page (1 distilled, cited note/week) | A→F | 1 | ready — DECISIONS #13 defaults YES |
| 24 | Findings→course mapping pass added to weekly triage | A | 1 | ready |
| 25 | Level architecture: map 80 courses into tiers; founder names levels | A→F | 2 | blocked on DECISIONS #12 (level names) |
| 26 | Reference PDFs into employer proof-pack | A | 2 | after #10 |
| 27 | E-E-A-T metrics into Monday pulse: referring domains, AI-answer presence, kw growth | A | 1 | ready |
| 28 | Retrofit remaining courses with evidence layers (batched, guards on) | A | 2–3 | after #21 |

**Note on #4 (subscriptions go-live).** The pre-flight script `verify-go-live-readiness.mjs`
exits 0 today, but one of its four checks cannot currently tell success from failure: it asserts
only `status !== 200`, and what it receives is a 504. The origin is correct — it returns 503 by
design while the flag is off — but DigitalOcean rewrites that to a 504 with an HTML body before
it reaches any client. Since the flip requires "checkout fails closed without session" to hold
before AND after, that check must be tightened to assert the exact expected status first, or
the gate is blind at the moment it matters. Full detail is in `docs/RELEASE-READINESS.md` R2 —
which lands with branch `docs/release-readiness-20260817` and is **not** on `main` yet.

**Note on #21–#28 (the Evidence Engine).** These implement the founder's 2026-08-16 spec: a
five-stage loop (ingest → grade → map → teach → publish) that turns the existing 2nd Brain
sources pipeline and A1–C3 evidence grades into a per-lesson evidence layer, so each substantive
point carries four parts: the governing requirement cited nominatively, the mechanism in plain
English, the graded evidence behind it, and a public reference list.

Two constraints bind every one of these items:

1. **Positioning (licence-adjacent).** CARSI sits ON TOP of a technician's existing IICRC
   standing: depth, not rivalry. Public and course copy must present it that way, and copy
   asserting that CARSI outranks or replaces IICRC certification is banned. "Greater than Master"
   is internal ambition only. The phrase that ships is "beyond the standard: the science of
   restoration". This sits alongside the existing designation and CEC rules in `CLAUDE.md` — if
   it should be guard-enforced rather than documented, that is a separate, deliberate change to
   `check-iicrc-terminology`, not something to fold into these items.
2. **Cite-or-cut, and the licensed-source rule.** No graded source, no claim. Every rule in
   `CLAUDE.md` under "Standards claims" and "IICRC standards IP + AI use" applies unchanged to
   evidence-layer copy: verification against the licensed section indexes, section-level
   citation, and the prohibition on entering standard text into AI tooling. The evidence layer
   raises the volume of standards-adjacent copy, so it increases exposure to those rules rather
   than altering them. Run `npm run verify:standards-claim -- "<copy>"` on any lesson text naming
   a standard, before it ships.

Reuse, don't rebuild: the sources pipeline, evidence grades, standards section indexes,
voiceover/thumbnail production and the AEO/llms.txt surfaces all already exist.

Metric for this thread (§7 of the spec): referring domains to course/research pages, AI-answer
presence for target questions, organic keyword count (baseline 119), and external citations of
the Benchmark — reported in the Monday pulse via #27. Note this is an *authority* metric, not
RWR; it compounds slowly and must not be read as revenue movement.

## Parked (deliberate)
- unite-group-marketplace plugin cutover — de-scope stands unless PR #1 merged (DECISIONS #5)
- Release-gate rewrite lane (quoted-separator bypass etc.) — after Gate 0
- Competing idea-generation bots — rejected; the cockpit (#15) is the accepted form

## Discoveries (append here, triage weekly — do NOT work these mid-session)
- 2026-08-16 · **The Evidence Engine's own per-lesson template fails CARSI's standards-claim
  gate.** `npm run verify:standards-claim -- "<copy>"` exits 1 on the spec's heading structure
  (the "what the standard requires / why it works / what the evidence shows" wording), and also
  on ordinary positioning prose that pairs a negated claim-verb with the word "standard" across
  a sentence boundary — individually clean sentences fail once concatenated. Measured with a
  positive control: the same text reworded exits 0, so the guard is firing correctly, not broken.
  This matters because items #21/#22/#28 emit that template into `app/`, `src/` and
  `docs/content/`, which ARE inside the guard's `SCANNED_DIRS` — so the template as specced
  would fail CI on the first pilot course. Decide before building #21: reword the template
  headings, or tighten the absence-claim rule (never disable it) and add the case to
  `scripts/check-standards-claims.test.mjs`. The quoted wording above is deliberate; this file
  is not scanned, per the next entry.
- 2026-08-16 · **The licence guards do not scan the repo-root operating files.**
  `check-iicrc-compliance` scans `app/ src/ templates/ docs/marketing/ docs/content/ data/seed/
  data/voice/ public/courses/`; `check-iicrc-terminology` a similar list plus `public/`. None
  match `GOAL.md`, `BACKLOG.md`, `DECISIONS.md` or `ENGINE.md`, so a green run says nothing about
  their contents. That is defensible — they are internal notes, the same class as the explicitly
  exempted `CLAUDE.md` — but it means "guards green" must never be quoted as evidence that
  anything in these four files was checked.
- 2026-08-17 · **The IICRC licence guard is blind to every skill and plugin surface, and the
  fix is written but not shipped.** `SCANNED_DIRS` excludes `.claude/skills/`, `skills/` and
  `.claude-plugin/`. Measured with a firing positive control: the identical banned canary exits
  1 in `docs/marketing/` and 0 in all three. A fix exists on `fix/iicrc-guard-skill-surfaces`
  (`af56b18a`, 15/15 gates green) but is **not shipped** — it used its two review rounds and
  round 2 returned four P0 filename bypasses that are pre-existing guard properties rather than
  regressions: a case-sensitive extension test misses `SKILL.MD`; `startsWith` scope misses a
  case-variant `.Claude/Skills/` on a case-insensitive filesystem; and trailing-space and
  backslash paths are lost when git's output is parsed. **This is licence-critical and is the
  highest-value item in this list.** Finishing it is one focused pass: normalise and
  case-fold paths at the `git ls-files` boundary, then re-review.
- 2026-08-17 · **Five CARSI skills are written but not on `main`.** `origin/main:.claude/skills`
  holds 1 directory; `feat/carsi-agent-skills-additive` holds 6. That branch is de-scoped after
  four review rounds with four open P1s — all of them in `scripts/check-agent-skills.mjs`, none
  in the skills. The obvious split is to land the five skills and drop the guard, which is
  hand-rolled YAML parsing that has now failed four rounds on YAML semantics.
- 2026-08-17 · **Refund terms cover the wrong product.** `/terms` carries one refund sentence
  ("Refunds are provided in accordance with Australian Consumer Law") and it sits inside the
  subscription-cancellation clause. Subscriptions are dark; the per-course purchase — the only
  revenue that exists today — has no refund terms at all. `/refund-policy` and `/support` 404.
- 2026-08-17 · **Performance misses the LCP target on every measured page**: 3.3–4.1 s against
  a 2.5 s threshold on catalogue, a course page and the checkout entry, plus a reproducible
  38.5 s on home whose own Lighthouse breakdown attributes only ~1.27 s. Those two figures
  contradict each other; the cause is unestablished, not diagnosed.
- 2026-08-17 · **`.env` points `DATABASE_URL` at a Supabase pooler that no longer
  authenticates** (P1000), while CARSI runs on DigitalOcean Postgres. Any local task needing
  real data fails until this is reconciled.
- 2026-08-17 · **Merging to `main` deploys straight to production** (`deploy_on_push: true` in
  `app.yaml`) and `main` requires no pull-request review. Worth a deliberate decision rather
  than leaving it implicit.
- 2026-08-18 · **Course URL slugs still carry IICRC discipline prefixes** (`cct-`, `wrt-`,
  `asd-`, `amrt-`, `fsrt-`). Rendered copy is clean and guarded; the slugs are exempted only in
  slug position, recorded as DECISIONS #15 (GP-523-D1). Renaming needs 301 redirects plus
  `app/sitemap.ts` and `src/lib/seo/course-marketing.ts` updates, so it is a follow-up, not a
  hotfix. Surfaced when the GP-523 branding guard was made case-insensitive.
