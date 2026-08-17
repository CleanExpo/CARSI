# BACKLOG.md — the single queue (take the top unblocked item; add discoveries at the bottom)

Owner key: F = founder-only · A = agents · A→F = agents prepare, founder approves/sends

| # | Item | Owner | Gate | Status |
|---|---|---|---|---|
| 1 | Land GOAL/BACKLOG/DECISIONS/ENGINE in repo root; add "Read GOAL.md first" as CLAUDE.md line 1 | A | 0 | **done 2026-08-16** — merged to `main` as `41712c69` (PR #666) |
| 2 | Generate CEC submission packs for top 10 courses (`generate-cec-submission.ts`) + cover email draft | A→F | 0 | **done 2026-08-18** — 10 packs + cover email in `docs/cec-submissions/`, 11 CECs requested. Awaiting founder send (DECISIONS #1). On branch `worktree-overnight-gate0-20260818`, unpushed |
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

**Note on #4 (subscriptions go-live) — RESOLVED 2026-08-18.** The blind check is fixed. The
probe now returns one of three verdicts and only `refused` passes; an edge/gateway response is
`unknown` and fails, because it proves nothing. The cause also turned out to be readable from the
response itself: the 504 carries `x-do-orig-status: 503`, DigitalOcean's record of what the
application actually answered, so the probe reads that header and sees through the rewrite. The
gate is conclusive again and states its reason ("origin answered HTTP 503, edge rewrote it to
504") instead of passing because the status merely was not 200. A 504 hiding an origin 200 — an
open checkout behind a gateway error — now fails; under the old assertion it passed. 14 self-test
cases including the literal production response.
`docs/RELEASE-READINESS.md` and branch `docs/release-readiness-20260817` do not exist anywhere
reachable — see the 2026-08-18 Discoveries entry before looking for them.

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
- 2026-08-18 · **The three branches this file pointed future sessions at do not exist.**
  `fix/iicrc-guard-skill-surfaces`, `feat/carsi-agent-skills-additive` and
  `docs/release-readiness-20260817` are on neither `origin` nor this machine — `git fetch
  --prune` then `git branch -a --list` returns nothing for any of them. They were local to
  another machine and were never pushed, so that work is unrecoverable and must be redone from
  the descriptions here. `docs/RELEASE-READINESS.md` likewise does not exist anywhere reachable.
  Nothing in the notes below should be read as "a fix already exists".
- 2026-08-18 · **`og-image.png` is 1.1 MB and is fetched on every measured page.** That is the
  right size for an Open Graph meta tag and the wrong size for something the page renders. It
  and `logo.png` (217 KB) are site-wide, so they are worth one pass independent of the course
  thumbnails, which are fixed. Check whether it is referenced from an `<img>` at all before
  changing anything.
- 2026-08-18 · **The `/courses` HTML document is ~854 KB on its own**, before any image. Worth
  looking at what is being serialised into the payload for a catalogue page.
- 2026-08-18 · **DigitalOcean rewrites the app's fail-closed 503 into a 504 HTML page.** Proven
  by the `x-do-orig-status: 503` header on the live response. The application is behaving
  correctly; the platform replaces its JSON `detail` with a generic gateway page, so the honest
  "Membership purchasing is not yet available" message never reaches the browser. Four endpoints
  behave this way (`subscription/checkout`, `org/checkout`, `teams/enroll`, `portal`). The
  go-live gate now reads the header and is no longer fooled, but the customer-facing half is
  untouched.
- 2026-08-18 · **`x-do-orig-status` also means any client-side error handling that reads a JSON
  body from these endpoints is receiving HTML in production.** Not audited — worth checking what
  the subscribe page does with a failed checkout response.
- 2026-08-18 · **Course completeness: 0 of 37 courses are finalised, and all 37 lack an intro
  video.** `npm run check:course-completeness` reports every other bar green (assessment,
  thumbnail, metadata, scaffolds, depth) and `introVideo` red across the board. The check runs
  in advisory mode, so it exits 0 and says nothing in CI. It was also silently vacuous on this
  machine until tonight — see the guard fix.
- 2026-08-18 · **The licence guards scan SOURCE LINES; components emit copy at RENDER.** This is
  how the flagship `/courses` page published the full seven-acronym IICRC discipline roster while
  every guard reported green. The sentence is assembled from JSX children — `Water Restoration
  Technology (<AcronymTooltip term="WRT" />), …` — so the literal `(WRT)` never appears on any
  source line, and both the glossed-list rule and the CEC-claim rule are defeated by the line
  split even though the rendered page reads exactly like the copy they ban. Found by the
  independent reviewer, then confirmed live on production. The copy that branded CARSI's own
  range is fixed; `AcronymTooltip` remains a general way for banned text to reach a page
  invisibly. A real fix scans the RENDERED output (the e2e suite already has pages open in a
  browser) rather than adding more source-line regexes — that is a design decision, not a patch.
- 2026-08-18 · **Checkout return-URL safety depends on the platform rejecting a forged Host.**
  The six checkout/portal routes build their default success and cancel URLs from
  `request.nextUrl.origin`, which is Host-derived, and the new origin allowlist folds that same
  value in. Production rejects `Host: evil.example` at the edge with 403 before the app sees it
  (measured, so it is safe today), but the dependency is environmental and undocumented outside
  the code comment now added. If CARSI ever moves off DigitalOcean App Platform to a host that
  forwards arbitrary Host headers, both the allowlist and every default return URL become
  attacker-controllable. Pinned by tests in `checkout-redirect.test.ts` so the change surfaces.
  Raised by the `carsi-e7` session, which tested the production behaviour rather than assuming it.
- 2026-08-18 · **The edge still destroys the JSON body of every fail-closed 503.** The client no
  longer retries a deliberate refusal or reports a phantom gateway timeout, but the route's own
  sentence ("Membership purchasing is not yet available.") cannot reach the browser because
  DigitalOcean replaces the body with an HTML error page. Recovering the human wording needs
  either a DO configuration change or per-status copy in the client — a product decision.
- 2026-08-18 · **No standing check enforces the Australian-production standard.** The rules in
  `.claude/skills/carsi-course-production/SKILL.md` — 230 V / 50 Hz, 10 A GPO, metric primary,
  AS/NZS and Safe Work Australia, no US regulators presented as authoritative — are enforced by
  nothing; `check:au-english` covers spelling only. A throwaway sweep of the 13 draft courses
  (366k characters) found no genuine defect, so the content is good, but that was a one-off with
  no regression protection. A standing checker would need care: every US reference in the corpus
  today is a deliberate AU-vs-US contrast that teaches the difference, so a naive rule would
  condemn the best content in the catalogue. Not built tonight — GOAL rule 4, and a new guard is
  a queue decision. Findings: `docs/cec-submissions/DRAFT-COURSES-READINESS.md`.
- 2026-08-18 · **Four draft courses have no `meta.designation`** —
  `commercial-floor-care-schools-childcare`, `whs-fundamentals`,
  `psychrometry-building-science-for-drying`, `asbestos-awareness-for-restoration-technicians`.
  For the first two that is probably correct (company onboarding and general WHS are not
  restoration designations); the other two look like oversights.
- 2026-08-18 · **`docs/onboarding/` carries unresolved `[COMPANY TO CONFIRM …]` placeholders in
  shipped floor-care standards** (uniform spec, sign-in process, supervisor contact). Surfaced by
  `check-company-placeholders.mjs`, which could not run on this machine at all until tonight.
  These are founder-answerable facts, not agent-answerable ones.
