# BACKLOG.md — the single queue (take the top unblocked item; add discoveries at the bottom)

Owner key: F = founder-only · A = agents · A→F = agents prepare, founder approves/sends

| # | Item | Owner | Gate | Status |
|---|---|---|---|---|
| 1 | Land GOAL/BACKLOG/DECISIONS/ENGINE in repo root; add "Read GOAL.md first" as CLAUDE.md line 1 | A | 0 | **done 2026-08-16** — merged to `main` as `41712c69` (PR #666) |
| 2 | Generate CEC submission packs for top 10 courses (`generate-cec-submission.ts`) + cover email draft | A→F | 0 | **agent half done 2026-08-26** — 10 packs + cover email draft in `docs/cec-submissions/`. Selected by educational hours among the 24 published courses, restricted to courses that map to an IICRC discipline. `ccw-carsi-truckmount-operations` (6 h) and `floor-care-onboarding-operational-readiness` (8 h) are the two longest published courses and were EXCLUDED on purpose: they are not restoration courses, and CLAUDE.md names the truckmount one as the exact incident where IICRC framing was templated onto a course with no IICRC discipline. Sending is DECISIONS #1, founder-only. **Provider name SETTLED 2026-08-26:** the founder confirmed "Centre for Australian Restoration and Standards Information". The wrong name is gone from the repo — corrected in 6 places (the generator literal, three spots on the avian-influenza page including its structured-data `alternateName`, the contact page title, and the workshop media manifest), and the packs were REGENERATED rather than find-and-replaced. **Directory-listing claim CUT 2026-08-26** on founder decision. Every pack used to assert CARSI is "listed in the IICRC CEC Provider Directory"; it could NOT be verified (`iicrccecevents.com` resolves to 97.74.190.62 but returns no HTTP response here, while `iicrc.org` returned 200 in the same run as a positive control), so it was removed from the generator in BOTH places it appeared — the Standing line and a supporting-documents bullet — and the packs regenerated. Recorded as unverified, never as false; restore it by hand if and when the listing is confirmed. **No blockers remain on the packs.** Sending is still DECISIONS #1, founder-only. |
| 3 | Send CEC packs to CECCourse@iicrcnet.org | F | 0 | blocked on #2 |
| 4 | Subscriptions go-live: Stripe Prices + Test Clock + DO env; flip at go-live script exit 0 | A→F | 0 | **agent half green 2026-08-26** — `npm run verify:go-live-readiness` **exit=0**, all automated pre-flight checks pass against the live site: pricing page HTTP 200; subscription-status API fails closed (`has_subscription:false, reason:"none"`); checkout fails closed without a session (HTTP 401, not 200); professional-directory health `stubBlocked:true`. **Read the row title carefully — exit 0 does NOT mean "flip it".** The script's own closing line is "Manual steps remain: create Stripe Prices, run Test Clock checklist, set DO env vars." All three are founder-only: Stripe Prices is money configuration, DO env is production configuration, and the flip itself is DECISIONS #2. Exit 0 means the code side is ready and fails closed correctly, nothing more. |
| 5 | Personalise + send the 3 outreach emails (BSCAA, RIA, SCA — drafts in 2nd Brain/Plans) | F | 0 | ready |
| 6 | Approve benchmark survey instrument (DRAFT in docs/marketing) | F | 0 | ready |
| 7 | Pick first franchise target + agents draft pilot offer letter | A→F | 0 | **agent half done 2026-08-26** — `docs/marketing/franchise-pilot-offer.md`. Recommends **Steamatic Australia** first, because its master franchise sits under ASX-listed Johns Lyng Group (since March 2019), whose insurer-funded repair work makes verifiable technician credentials a procurement answer rather than a training brochure. Second: Chem-Dry Australia, 200 AU franchisees. Deliberately NOT first: Jim's Cleaning — biggest by headcount, heading toward 2,000 franchisees, but it runs its own franchisee training, so CARSI would compete with an in-house programme instead of filling a gap. Letter is drafted and quotes ONLY the published Teams pricing; no discount is offered, because a first concession anchors every network after it. Target choice is the founder's — this is a recommendation. **Two problems surfaced that block sending:** (a) `docs/marketing/association-partnerships.md` publishes a group-licensing table asking $3,900 for 25 seats while the live page sells 25 seats for $2,499, about 56% more, and the live page agrees with `src/lib/lms/pricing-tiers.ts` so the association doc is the outlier; (b) that same doc says CARSI is "delivering IICRC CEC-approved courses" and offers "co-branded certificates for IICRC CEC courses", both asserting course-level approval while `cec-approvals.json` is `"approvals": []`. |
| 8 | Wire the RWR metric: Stripe → weekly number in the daily brief | A | 0 | **done 2026-08-26** — `npm run report:rwr` (add `-- --json` for the heartbeat brief). Arithmetic is a pure, unit-tested module (`src/lib/metrics/rwr.ts`, 12 tests) separate from the Stripe adapter (`scripts/report-rwr.mjs`), so the part that can be quietly wrong is the part that is covered. **Fails closed by design and this is the point:** with no `STRIPE_SECRET_KEY`, or on any Stripe error, it prints the blocker and exits **2** — never `$0`, because "$0 per week" claims nothing sold, which is a different and much worse statement than "I could not look". Verified both refusal paths: no key → exit 2 with the blocker; bogus key → exit 2, "Stripe subscriptions returned HTTP 401", no crash and no dollar figure in either. It also refuses to report a partial total if pagination does not finish, since a silent cap would understate revenue and read as a downturn. **Not yet exercised against real Stripe data** — this session has no key and will not handle one, so the fetch-and-shape path is unproven against a live account. First real run should be sanity-checked against the Stripe dashboard. |
| 9 | Teams tier: seat pricing page + Stripe products + seat management ($99–149/seat/yr, 10/50/200) | A | 1 | **mostly already built — measured 2026-08-26, and the row's own prices are stale.** Seat management exists: 6 Prisma models (`LmsTeam`, `LmsTeamMember`, `LmsTeamInvite`, `LmsTeamCoursePurchase`, `LmsTeamSubscription`, `LmsSubscription`), **11 team/seat API routes** with no stubs (checkout, enroll, expand-seats, status, activate-purchase, assignable-courses, invite, invite/accept, me, records, teams), and 3 UI pages. The seat pricing page is live. **The row's numbers contradict the live page and must not be used to create Stripe products:** the row says $99–149/seat/yr at 10/50/200 seats; carsi.com.au/pricing and `src/lib/lms/pricing-tiers.ts` both say Starter $299/5 (+$49), Growth $799/15 (+$39), Full library $2,499/25 (+$29). That is the **third** conflicting seat-price scheme found today, after the association-partnerships table. The live page is authoritative; changing to the row's numbers is a founder pricing decision that must change the live page first. **What was actually missing was a test:** nothing bound the tier definitions to a number, while four places read them including the checkout route. Added `src/lib/lms/pricing-tiers.test.ts` — 13 tests pinning prices, seats, expansion labels, label-vs-cents agreement, monotonic tiers, and that no coming-soon tier invites a purchase. Mutation-proven: changing a price fails 2 tests, un-marking a team tier's `comingSoon` fails 1, changing a CTA to "Start membership" fails 1. **Remaining is founder-only:** create the Stripe products and flip DECISIONS #2. |
| 10 | Employer proof-pack (transcript + training record PDF — PRODUCT_STRATEGY §5) | A | 1 | **done 2026-08-26** — **the row was stale: the feature already shipped and was wired.** Signed-in JSON (`app/api/lms/credentials/proof-pack/route.ts`) and PDF (`.../pdf/route.ts`), a 30-day share-token public pair (`app/api/public/proof-pack/{route,pdf/route}.ts`, token minted by `signProofPackShareToken`), the builder `src/lib/server/proof-pack.ts`, the renderer `src/lib/server/proof-pack-pdf.ts`, the learner page `dashboard/student/credentials` and the public `verify/training-record`. What was actually missing was any test at all on a **licence-critical export path** — this transcript asserts "Total IICRC CEC hours" to an employer or insurer, and the GP-498 gate covers only `resolveLmsCourseCecHours` *underneath* it, never the aggregation on top. Now pinned: **20 tests** across `proof-pack.test.ts` (14) and `proof-pack-pdf.test.ts` (6). The fail-closed rule is the pin that matters — an unapproved course contributes **0** to its row and **0** to the total, and an approved course beside it does not lend it hours. Both proven with a positive control: setting the fallback to `?? 4` turned 3 tests red, and flipping the enrolment filter to `in_progress` turned 1 red; the module was reverted to an empty diff and re-run green. **A real bug was found and fixed by discovery**, not by the row: the PDF drew learner names and course titles with pdf-lib `StandardFonts`, which encode via WinAnsi and **throw** on any codepoint outside Latin-1 — the exact defect `certificate-pdf.ts` fixed as #143. `WinAnsi cannot encode "ā" (0x0101)` was reproduced, so a learner named e.g. Tāmati Ngāpō, or any Cyrillic name, got a 500 instead of their employer proof pack on both the signed-in and the public share route. Fixed by porting the certificate's own remedy — `registerFontkit` plus a subset `NotoSans-Regular.ttf` fallback chosen per string by a local `fontFor`, so Latin transcripts still render through Helvetica exactly as before. **Evidence strengthened after review pushed back on it (commit `0219f0d2`), and the pushback was right on both counts.** (a) The PDF tests asserted only "did not throw", which would still pass if the text were silently dropped, and NotoSans is embedded in *every* document so its presence proved nothing. They now read the **ToUnicode CMap back out of the generated PDF** and assert the codepoints actually drawn — `0101` (ā) and `014D` (ō) for a Māori name, `0410/043D/0430/0418/0432/043E` for a Cyrillic one — while a pure-Latin name must map to an **empty set**, pinning the fallback as selective rather than always-on. (b) The four route handlers had no tests, so nothing proved the fix reached the surface a learner touches; **8 route tests** now drive the exported handlers directly (401 no session, 401 bad share token, 400 no token, 503 no database, fail-closed zero CEC on the wire, and a real `%PDF-` body for a non-Latin learner on both the signed-in and public share route). The positive control was re-run on the **font path** rather than the CEC logic: pointing `loadNotoSansTtf` at a non-existent filename turned **6 of 10** renderer tests and **2 of 8** route tests red, with the stack landing inside `app/api/public/proof-pack/pdf/route.ts`; reverted to an empty diff and re-run green. Gates: type-check, lint, build, `test:unit` (**157 files, 1298 tests**, up 3 files / 32 tests) and all 12 licence/CEC/content guards each **exit 0**. **Not covered, stated plainly:** Prisma is mocked throughout, so the query shape is pinned but no run has exercised this against a live database. |
| 11 | Email capture + renewal-reminder funnel (free library → "CECs lapse in N months") | A | 1 | **agent half done 2026-08-26 — the two halves have opposite answers.** **Renewal-reminder half: already built, wired and genuinely RUNNING in production** — `src/lib/server/recert-reminders.ts` → `app/api/cron/recert-reminders/route.ts` (CRON_SECRET-guarded) → `.github/workflows/notifications-recert.yml` at 09:00 UTC daily, which has fired and succeeded for at least 8 consecutive days. Milestones are T-30 / T-7 / overdue, idempotent on `recert:<user>:<expiry>:<milestone>`. **Verified by reading the run bodies, not the green ticks**, and the run on 2026-08-24 returned `dispatched:2`, so the machinery demonstrably works; `dispatched:0` on the other days is correct idempotency, not a fault — I nearly filed it as a bug and the history disproved it. **What WAS wrong is observability, and it was licence-adjacent:** `{"ok":true,"eligible":19,"due":11,"dispatched":0,"failures":[]}` cannot distinguish "emails delivered" from "no email transport at all". `dispatched` counts in-app notifications; when `MAILTRAP_API_KEY` is unset `isEmailConfigured()` is false, the notification is still created, `dispatched` still increments and **no email is sent, reported nowhere**; and a rejected send was swallowed by `.catch(e => console.error(...))` so it never reached `failures`. On the funnel whose entire job is stopping an IICRC certification lapsing quietly, that silence is the defect. `RecertRunResult` now carries **`emailConfigured`, `emailsSent`, `emailsFailed`**, and a rejected send lands in `failures` as `email: <reason>`; the loop still continues to the next learner and a healthy run is unchanged. `runRecertReminders` itself had **no test** — the 7 existing cases cover pure helpers only — so **10 were added**, including the production-shaped `due=2, dispatched=0` case pinned as CORRECT. Positive control run twice: not counting a successful send turned **3 red**, restoring the swallowed `.catch` turned **1 red**; both reverted and re-run green. Gates: type-check, lint, build, `test:unit` (**158 files, 1309 tests**) and the licence guards each **exit 0**. **Email-capture half: NOT done, and not an agent's call.** The row's premise is "free library → capture", and there is no free library — **all 37 catalogue courses are `isFree: false`** — so making one free is pricing configuration and founder-gated alongside DECISIONS #2. `/api/lead-magnet` exists but is the GP-199 government-contractor guide, a different funnel. **Next real signal:** the 09:00 UTC run after this merges will print `emailConfigured` and settle whether recert emails have been reaching anyone at all. |
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
- 2026-08-18 · **CLC-P2-001 — digit lookalikes of banned designations are deliberately not
  caught** by `check-live-catalogue`. Raised as a documented P2 by independent review at
  `a3530296` and accepted, not fixed. Folding digits (`0`->`O`, `5`->`S`) was removed because it
  corrupted the metric and electrical text CARSI's Australian-production standard requires on
  nearly every course — `50 m² @ 230 V` folded to `SO m2 @ 23O V` — and opened a false-positive
  path where `0ct` becomes `OCT`. A title reading `0CT` therefore escapes this guard. Accepted
  because a digit is not a plausible staff-authored form and a false positive on a licence guard
  costs more than this miss; `check-iicrc-compliance` remains the backstop. Revisit only if a
  digit-form designation is ever observed on the live catalogue.
- 2026-08-18 · **CLC-P2-002 — the IICRC designation expansions in `check-live-catalogue` need
  founder verification against the licensed source.** `DESIGNATION_PHRASES` maps each banned
  acronym to the designation written out, and the guard now blocks on those phrases. One of the
  eight was FABRICATED: TCST was expanded as "tile stone and concrete cleaning technician" from
  memory with no source, and independent review established it is Trauma and Crime Scene
  Technician. The other seven were written the same way and have not been checked. They are
  load-bearing for a licence guard, so they should be confirmed against the licensed IICRC
  source rather than trusted. Note CLAUDE.md forbids feeding IICRC standard TEXT into AI
  tooling; designation names are public nomenclature, but the verification is a founder
  action, not an agent one.
- 2026-08-18 · **CLC-P2-003 — separated-letter acronym forms are not caught** by
  `check-live-catalogue` (`scripts/check-live-catalogue.mjs:220`). Raised as a documented P2 by
  independent review at `623c3f9d` and accepted, not fixed. `W.R.T.`, `W R T`, `W/R/T`,
  `water-damage-w.r.t-essentials` and `water-damage-w-r-t-essentials` all return no hit. The
  reviewer's own disposition: a non-canonical separated initialism is an evasion class rather
  than a plausible ordinary CARSI course-title form, and `rg` found no such form anywhere in the
  repo. Every real violation measured on production uses the contiguous acronym or the
  spelled-out designation. Revisit only if a separated form is ever observed on the live
  catalogue; widening the acronym rules to match separated letters risks false positives on
  ordinary initialisms in course copy, which is the failure mode this guard has already
  produced five times.
- 2026-08-18 · **Course URL slugs still carry IICRC discipline prefixes** (`cct-`, `wrt-`,
  `asd-`, `amrt-`, `fsrt-`). Rendered copy is clean and guarded; the five slugs are exempted from
  the branding guard by exact literal value — anywhere in the scanned file, not only in slug
  position (corrected 2026-08-18: this entry previously claimed "only in slug position", which was
  false both before and after the guard fix). Recorded as DECISIONS #15 (GP-523-D1). Renaming
  empties the exemption list entirely, which is the real fix. It needs 301 redirects plus
  `app/sitemap.ts` and `src/lib/seo/course-marketing.ts` updates, so it is a follow-up, not a
  hotfix. Surfaced when the GP-523 branding guard was made case-insensitive.

---

## Discoveries — 2026-08-19 stopper audit

Full evidence: `docs/session-handoffs/STOPPER-REGISTER-20260819.md`. Every item below was
measured, not inferred; the register carries the exact commands and positive controls.

| # | Item | Owner | Gate | Status |
|---|---|---|---|---|
| 29 | Fix 3 vacuous guards — `check-iicrc-terminology`, `check-course-completeness`, `check-course-visibility-predicate` used the naive entry-point idiom comparing `import.meta.url` against a bare `file://` + argv concat. The checkout path contains a space, which `import.meta.url` percent-encodes and argv does not, so the comparison was always false, the scan body never ran, and each exited 0 in silence. | A | 0 | **done 2026-08-19** — PR #680, receipt `PR_RELEASE_GATE_PASS head=ed01376a` |
| 30 | Wire `check:live-catalogue` into CI on a schedule. It is NOT in CI and is the only guard that has caught a real production defect. Needs no credentials — it reads the public sitemap. | A | 0 | **done 2026-08-20** — `.github/workflows/live-catalogue-guard.yml`. Daily 03:00 UTC and `workflow_dispatch`. **Not** on push: dispatching the real workflow showed a push trigger attaches a PR check whose verdict is about the live catalogue rather than the PR's code, so every PR touching the guard would carry a red check it cannot fix. Observed run `32295824919` — reached production, exited 1, failed for the right reason, and ran its then-168-check suite with no `npm ci` (the suite is 206 checks at the current head, after five defects of one family — a P1, a P0, a second P1, a fourth found by working the next round's attack list before dispatching it, and a fifth that ended the point-fix strategy in favour of a class fix: every report-derived value now passes through a total formatter that cannot throw). Deliberately NOT gated behind a repo variable like `live-cec-guard.yml`: it needs no credentials, and a config flag that silently disables a licence guard is the defect this family exists to prevent. Exit 2 fails the job as loudly as exit 1. **Expected RED until #31 is fixed** — do not add a baseline to make it green. |
| 31 | Fix 4 live designation violations on carsi.com.au (`cct-commercial-carpet-core`, `wrt-water-damage-essentials`, `fsrt-fire-smoke-restoration-core`, `asd-structural-drying-core`). Licence-critical and live now. 3 of the 4 are absent from repo seed, so this needs the prod-DB path. | A→F | 0 | blocked on DECISIONS #16 |
| 32 | ~~Render `commercial-floor-care-schools-childcare.mp4`~~ **WITHDRAWN — false premise.** The mp4 exists (2,109,732 bytes, 18 Aug 01:15) and `test:unit` is green (1056/1056). The "never rendered" claim came from `find . -name "*floor-care*intro*.mp4"`, which cannot match that filename — `intro` is in the directory `course-intros/`, not the filename — so it returned empty against a file that exists. Same disease as #29, in the evidence-gathering rather than the guard. Residual unknown: the earlier `test:unit` exit 1 was a real AssertionError on the ffprobe test; why it failed then and passes now on an unchanged tree is unexplained. | A | 0 | **withdrawn** |
| 33 | Add `tsx` to devDependencies. `check:live-cec` runs `npx tsx`; tsx is absent from both `package.json` and `node_modules`, so that guard cannot execute. ~50 scripts reach for it via npx. | A | 0 | **done** — landed in `e7d85d3f` ("align package.json with the committed lockfile"), `tsx ^4.23.12`. Verified on `origin/main` 2026-08-20; the row was still marked ready. |
| 34 | Remove `continue-on-error: true` from the Build step at `.github/workflows/agent-pr-checks.yml:100`. Measured: the following `Report Results` step writes only to `$GITHUB_STEP_SUMMARY` and never exits non-zero, so `Agent PR Validation` goes green while its own summary prints `Build: ❌ Failed`. **The merge gate is NOT holed** — required checks are `Build Check` and `Frontend Tests`, both in `ci.yml`. Reporting dishonesty, not a merge hole. Low priority. | A | 0 | **done** — landed in `df9da305` ("fail the agent pr build check when the build fails"). Verified on `origin/main` 2026-08-20: no `continue-on-error` remains in that workflow, and the line now carries a comment saying why. The row was still marked ready. |
| 35 | Scanned-count contract: as each guard is touched, make it print what it looked at and exit non-zero when that count is zero. Applied opportunistically, not as a sweep. This is the structural fix — it collapses the whole vacuous-guard class into a loud failure on the day it occurs. | A | 0 | **standing practice — 2 of 2 guards touched so far now comply.** `check-iicrc-terminology.mjs` and `check-iicrc-compliance.mjs` both print a scanned-file count on pass and exit **2** (not 1, so "could not look" stays separable from "found something") when the count is zero. Current counts: terminology **1,101 files**, compliance **1,084 files**. Both tripwires proven by pointing each guard at an empty file listing and observing exit 2, then restoring. The terminology guard also distinguishes the two meanings of zero: in `--staged` mode zero legitimately means the commit touched no in-scope file and it says so in words, while in a full scan zero is the failure. This row stays open by design — it is a contract applied when a guard is next edited, not a sweep. Guards not yet touched and therefore not yet compliant: `check-cec-approvals`, `check-cec-surfaces`, `check-au-english`, `check-standards-claims`, `check-designations`, `check-course-completeness`, `check-source-citations`, `check-live-catalogue` (this one already refuses a vacuous run by its own design), `check-secrets`. |
| 36 | `bootstrap.sh` must install the pre-push hook, and its absence must be detectable. `core.hooksPath` points at `~/.config/git/hooks` — machine-local and outside every repo — so a fresh machine or agent checkout has no pre-push gate at all. | A | 0 | **done 2026-08-26.** There is no `bootstrap.sh` in CARSI — that row came from the estate-wide instructions — so this was solved with `postinstall`, which every checkout already runs. **The measured state was worse than the row describes:** `core.hooksPath` was `D:\CARSI\.githooks`, an absolute machine path, and **that directory did not exist**. Git runs no hooks at all when its hooks path is missing and reports nothing, so there was no local licence gate whatsoever. The guards were fine — `check-iicrc-terminology.mjs --staged` exits 1 correctly on a staged banned phrase — nothing was calling them. Added: tracked `.githooks/pre-commit` running the terminology, compliance and secret guards; `npm run hooks:install` setting a REPO-RELATIVE path; `postinstall` running it softly so a fresh clone is wired by `npm install`; and `npm run check:hooks`, which makes absence loud because an unwired gate looks exactly like a passing one. **A second defect surfaced during the fix:** setting the local config reported success while git still resolved the dead path, because this worktree's own `config.worktree` carried a higher-precedence absolute override. An installer that only fixes the main checkout has the same silent-failure shape as the absolute path it replaces, so it now clears the worktree-scoped value too. **Forward gate proven, not assumed:** staging a file containing "Get IICRC certified with CARSI today." and running `git commit` was REFUSED — HEAD stayed at `2225d0f9` and the file appears in 0 commits. |
| 37 | Repo-wide `npm run lint` exits 1 with **14,777 problems** (7,738 errors). A gate nobody can action is a gate that is effectively off — same class as #29. Attribution was checked: eslint on changed files exits 0, so it is pre-existing, not branch-introduced. Needs a baseline-and-ratchet decision before lint can gate anything. | A | 0 | **CLOSED 2026-08-26 — the premise is no longer true, and no baseline-and-ratchet decision is needed.** Measured with `npx eslint . -f json` and counted from the JSON rather than read off a summary line: **1,186 files linted, 0 errors, 1 warning, 1 total problem.** Not 14,777 problems and not 7,738 errors. `npm run lint` exits **0**. The single remaining warning is an unused `eslint-disable` directive at `src/components/lms/FloatingChat.tsx:473` — a stale suppression, not a defect. **Non-vacuity proven before trusting the zero:** planted `const unused = 1;` in a new source file, eslint reported it as an error and exited 1, so the linter can still fail and the clean result is real. Whatever cleared the backlog of lint errors happened between the row being written and today; the row was not re-measured before being worked, which is why it sat as a P0. Lint can gate now, and already does — `check:hooks` aside, it is in the pre-commit path via CI. |

**The class, not the instances.** #29–#37 are one disease: *silence read as evidence*. A control
that emits nothing is currently indistinguishable from a control that found nothing. #35 is the
structural fix; the rest are instances it would have caught. The scope limit that sits above all
of them: repo seed holds 37 courses, production sells 80, so no source-scanning guard can see 54%
of what is actually being sold.

- 2026-08-19 · **CLC-P2-004 — an `OCT`-branded SLUG with a clean title is not caught** by
  `check-live-catalogue`. Raised by independent review on PR #674 and reproduced: slug
  `oct-odour-control` with title `Odour Management Fundamentals` returns `[]`. `OCT` is in
  `AMBIGUOUS_ACRONYMS`, which disables the slug rule for it. Accepted, not fixed, for the reason
  already recorded in the code: slugs are lowercase by convention and carry no case to
  disambiguate, so enabling the rule flags `seasonal-cleaning-oct-2026` — a legitimate October
  course — as a licence violation. Measured in the same run: the false-positive control is
  silent today and would fire if the exemption were removed. A guard that cries wolf on October
  is one staff stop believing, which is the failure mode this guard has already produced five
  times. The title rule still catches `OCT` written as a designation, the designation-phrase
  rule catches `odour/odor control technician` on both surfaces, and `check-iicrc-compliance`
  remains the backstop. Revisit only if an `OCT`-form slug is ever observed on the live
  catalogue — and fix it by narrowing to a month-name exclusion, never by dropping the guard.

- 2026-08-19 · **CLC-P2-005 — the guard reads `<title>` only, so a designation shown in `<h1>`
  or `og:title` is invisible to it.** Raised by independent review on PR #674 (gpt-5.5-high) and
  reproduced end to end: a page serving `<title>Clean Course | CARSI</title>` alongside
  `<meta property="og:title" content="Water Damage WRT Essentials | CARSI">` and
  `<h1>Water Damage WRT Essentials</h1>` exits **0** and prints `✓ 1 live courses clean.` The
  acronym is displayed to every reader and shared to every social preview; the guard never sees
  it. Filed rather than fixed because this is a **scope decision, not a defect in what the guard
  claims to do** — its stated contract is the document title, and widening it to the rendered
  body is a different guard with a different false-positive profile (an `<h1>` quoting an IICRC
  standard nominatively is legitimate copy, and `og:title` is often generated). Deciding it needs
  a ruling on which surfaces are "course branding". Until then `check-iicrc-compliance` remains
  the repo-side backstop, and its 46%-of-catalogue ceiling still applies. Blast radius if
  ignored: unknown — no live page is currently known to do this, and nothing measures it.

- 2026-08-19 · **CLC-P2-006 — exotic HTML5 named entities are still not decoded.** Raised by
  independent review round 4 on PR #674 (gpt-5.5-high) and reproduced: `&AMPWRT` and `&Wopf;RT`
  render text a reader sees as WRT-like, but `decodeEntities` knows only the five named entities
  it needs (`amp`, `lt`, `gt`, `quot`, `apos`) plus the full numeric forms. Accepted, not fixed.
  The full HTML5 named-entity table is ~2,231 entries; embedding it — or adding a parser
  dependency to a guard that must run with zero install — buys coverage of forms no CMS emits,
  in exchange for a much larger false-positive surface and a dependency in the one guard that
  reads production. The classes that actually occur in authored copy are closed: numeric
  references decimal and hex, with or without the semicolon and with any padding; the five named
  entities a title realistically carries; every default-ignorable character; and full URL
  normalisation. Revisit only if an exotic named entity is ever observed on the live catalogue —
  and fix it by decoding with a real HTML parser, never by hand-extending the table, which is the
  ratchet this file has already lost to three times.

- 2026-08-20 · **CI-P1-001 — `npm run test:unit` fails inside the release gate's sequential run
  on the `/Volumes/Storage Unit` checkout, and passes standalone.** Measured this session: green
  standalone five times (143 files / 1060 tests, 5–51s); red four times when run by
  `pr_release_gate.py issue` immediately after `npm run type-check`. The symptom is always the
  same file — `[vitest-pool]: Failed to start forks worker for
  src/components/admin/AdminCcwSignInsClient.test.tsx`, sometimes `Timeout waiting for worker to
  respond`, once surfacing instead as a 5s `Test timed out` in the filesystem-heavy
  `src/lib/seo/course-marketing.test.ts`. That file passes alone in 1.4s. **Ruled out:** memory
  (70% free, zero swap), worker oversubscription (reproduced at `--maxWorkers=4` on a 10-CPU
  box), and the branch under test (the diff touches zero files under `src/`, and
  `vitest.config.ts` globs only `src/**`). CI's own `Unit Tests` job passes on a clean runner, so
  this is specific to this machine/checkout. **Why it matters:** it blocks the release gate
  non-deterministically, and the tempting workaround — dropping `test:unit` from the receipt, or
  re-running until green — is self-certification. It cost a genuine, independently-PASSed commit
  (`e3a3b49e`) its push this session. **2026-08-20, resumed session — two more hypotheses ruled
  out, and the flake did not reproduce.** Descriptor exhaustion is out: `ulimit -n` is 1048576
  soft / unlimited hard (`kern.maxfilesperproc` 92160), not the macOS 256 default. Process
  exhaustion is out: `ulimit -u` is 4000 soft / 6000 hard, and a sampler taken every 2s across a
  full sequential run peaked at **671 user processes and 27 node processes** — an order of
  magnitude below the cap, with `vm.swapusage` 0.00M used throughout. Both hypotheses were
  measured, not reasoned. The run then passed twice: once as a plain sequential
  `type-check` → `test:unit` in bash, and once through
  `~/.claude/jobs/f37f7054/tmp/mirror-gate-tests.py`, a faithful mirror of
  `pr_release_gate.run_tests` — same `subprocess.run(shell=True)`, same `cwd`, same env stripped
  of `GIT_REDIRECT_VARS`, all seven receipt commands in receipt order. All seven exited 0
  (type-check 28.8s, test:unit 29.3s). The mirror exists so diagnosis never has to be paid for
  with the gate's own run. **Still not root-caused** — a negative reproduction is not a fix. The
  surviving hypothesis is contention from concurrent load rather than any static limit: the four
  failures happened while this session's review agents and watchers were resident (~57 node
  processes), and the two clean runs happened after they exited (17–27). That is a correlation
  across two conditions, not a demonstrated mechanism, and it is recorded as such. It also
  predicts the flake will return the next time the gate is run under a busy multi-agent session,
  so the entry stays open. Do not close it on the strength of a green run.
  **2026-08-20, third session — the prediction above came true, and the failure is now known not
  to be a test defect at all.** Reproduced at head `1139d5af` while a `cursor-agent` reviewer was
  resident (1-min load average **5.38** on 10 CPUs): `type-check` 0 in 101.0s, then `test:unit`
  **exit 1 in 106.7s** — the slowest recorded run of this suite by a wide margin. The decisive new
  datum is the count, not the error string (which this entry already recorded): the run reported
  `Test Files 142 passed (142)` and `Tests 1058 passed (1058)` against a healthy **143 / 1060**
  confirmed in three prior logs. **Zero tests failed.** Exactly one file — worth two tests —
  never ran, because the forks pool never started its worker
  (`AdminCcwSignInsClient.test.tsx`, `[vitest-pool-runner]: Timeout waiting for worker to
  respond`), and vitest correctly declined to call an incomplete run green. So every search for a
  nondeterministic *assertion* was looking for the wrong object; the assertions were never
  involved. `import 236.30s` against a 96.24s wall clock shows the pool heavily contended.
  **This does NOT license a fix by timeout-raising.** Raising the pool timeout converts "one file
  silently did not run" into "one file silently did not run and nothing said so" — the exit-1
  behaviour is the guard working. **Nor does it revive `maxForks` capping**, which this entry
  already measured out: it reproduced at `--maxWorkers=4`. The honest residue is that load remains
  a **correlation** — one loaded run failed here, but another loaded run passed at 66.7s earlier
  the same day — so the mechanism (worker-startup timeout) is demonstrated while its trigger is
  not. The one operational rule that follows and is worth keeping: **never run `test:unit`, the
  receipt, or the push hook while a reviewer process is alive on the same box**, since the gate
  and the push both re-execute the test commands. Raw log preserved at
  `~/.claude/jobs/f37f7054/tmp/ci-p1-001-repro-1139d5af.log` for as long as that job exists;
  the evidence that matters is quoted above precisely because that path will not outlive the job.

- 2026-08-20 · **`main` is RED on E2E: three specs assert hero copy the homepage no longer has.**
  Found because PR #682 is the first PR branched off `1057be16`, so it inherited the break rather
  than causing it — its diff touches zero files under `src/` or `e2e/`. Commit `c9f8028d`
  ("copy(hero): lead with the outcome…") replaced the H1 with "Become the technician every job
  site trusts.", but `e2e/carsi-journeys.spec.ts:33`, `e2e/smoke.spec.ts:37` and
  `e2e/pre-production.spec.ts:268` still expect "Professional training that fits the workday.".
  Observed in run `32295812622`: `expect(locator).toContainText` failed against
  `#main-content`, which received the new copy. **Why it matters beyond the red tick:** these are
  the only automated checks that the landing page renders its hero at all, so until they are
  realigned the homepage has no working smoke test — and a copy change is exactly the kind of
  edit that would otherwise be caught here. Fix by updating the three expectations to the current
  H1, not by loosening them to match any text; the assertion's value is that it pins specific
  published copy. Confirm the wording is final with the founder first — the hero has changed
  twice in three commits (`c9f8028d`, then `1e88d119`).

- 2026-08-20 · **A misdispatched `cursor-agent --force` autonomously executed backlog work in a
  review worktree.** Dispatching the independent reviewer with a trailing `-` — the
  `codex exec --sandbox workspace-write - < brief` stdin convention from
  `skills/pr-release-gate/SKILL.md` — silently fails on `cursor-agent`, which has no such
  convention: `-` becomes the literal positional prompt. Given no real instruction, the agent did
  what this repo tells any agent to do — read `CLAUDE.md`, "All work comes from the top of the
  backlog" — and, holding `--force` (write + shell), started executing **BACKLOG #2**. Across two
  worktrees it generated ten CEC submission packs under `docs/cec-submissions/`, modified
  `BACKLOG.md`, `DECISIONS.md` and `GOAL.md`, edited `scripts/generate-cec-submission.ts`, and
  symlinked the external `node_modules` tree in to run checks. Both then exited **0** and reported
  success in confident, plausible prose. **Neither wrote the `reviewer-report.json` the brief
  demanded.** Contained: it happened only in two disposable worktrees, both since `reset --hard`
  and `clean`; the branch worktree was untouched and nothing was committed or pushed.
  **Why it matters:** an exit code of 0 plus a fluent summary is exactly what a completed review
  looks like from the outside. The only thing that distinguished "reviewed" from "did something
  else entirely and said it went well" was the **absence of the report file** — so never infer a
  review from a reviewer's exit code or its prose, only from a SHA-bound report that
  `pr_release_gate.py` will accept. Two fixes: (a) `SKILL.md` step 4 should say the `-` stdin rule
  is **codex-specific**, and that a reviewer CLI must be smoke-tested for prompt delivery before a
  real dispatch (one throwaway prompt returning a known token — it costs seconds and would have
  caught this); (b) dispatching any `--force` agent into a CARSI checkout inherits this repo's
  "take the top backlog item" instruction, so a reviewer brief must be **delivered and verified**,
  never assumed. Consider `--plan`/`--mode ask` for read-only reviewers that do not need to run
  suites.

- 2026-08-26 · **P2 — course prices are NOT in this repository, so no repo test can pin them.**
  `app/api/lms/checkout/route.ts:129` reads `priceAud` off the production database row. The seed
  catalogue is a snapshot, not the source of truth, exactly like the live-catalogue problem where
  the authoritative value sits where a guard cannot see it. What CAN be pinned is the refusal, and
  now is: `createStripeCheckoutForCourse` throws `INVALID_AMOUNT` for a missing, non-numeric,
  zero, negative or sub-50-cent amount, covered by `src/lib/server/local-course-checkout.test.ts`.
  Mutation-proven — replacing the guard condition with `if (false)` fails 6 of its 8 tests. The
  residual risk is unchanged and belongs on the founder's side: a wrong `priceAud` in production
  charges that wrong price, and nothing in CI can see it. A live price audit is the only control
  that would.

- 2026-08-26 · **P3 — a corrupted discount charges FULL price silently.** In
  `local-course-checkout.ts:70`, a non-finite `unit_amount_cents` override fails `Number.isFinite`
  and the amount falls back to the course list price. That is the right direction for revenue —
  far better than charging nothing — but it means a broken discount code surfaces as an annoyed
  customer rather than an error. Measured and pinned as current behaviour in the checkout test
  rather than asserted away. Worth a log line at the fallback so the failure is visible.

- 2026-08-26 · **P3 — `IndividualTier.comingSoon` documents a contract the data breaks and the
  code does not enforce.** The type comment reads "true while checkout for this tier cannot be
  delivered. No CTA, no href", but `pro_annual` carries `href: '/subscribe'` while
  `comingSoon: true`. Harmless today, and deliberately left alone: both render paths branch on
  `comingSoon` before emitting a link (`PricingTiers.tsx:57`, `HomePricingSection.tsx:241`), and
  the homepage supplies its own `?? '/subscribe'` fallback anyway, so the href is unreachable
  rather than dangerous. Worth resolving one way or the other — either drop the href to match the
  stated contract, or reword the comment to describe what the code actually guarantees. A comment
  that states a rule nothing enforces will eventually be trusted by someone.

- 2026-08-26 · **GUARD-P1 — the IICRC licence guards only scan git-TRACKED files, so a brand-new
  file gets a false clean.** Found while writing `docs/marketing/franchise-pilot-offer.md` for
  row 7. `docs/marketing/` is in `SCANNED_DIRS`, so the file should have been in scope. It was not.
  **Measured, both directions:** planted the phrase "CARSI delivers IICRC certification courses.
  Get IICRC certified with CARSI today." in that file while it was UNTRACKED —
  `check:iicrc-terminology` exit **0** and `check:iicrc-compliance` exit **0**. Ran `git add` on
  the same file with the same planted phrase — both exit **1**. Removed the phrase — both exit 0.
  **Why this is worse than a zero-count bug:** the count is not zero, it is silently short, so the
  scanned-count contract in row 35 would not catch it. The blind spot is exactly the newest file,
  the one most likely to carry a fresh violation. An author writes a new marketing page, runs the
  guard, sees green, and commits a banned phrase. Nothing in the workflow tells them to stage it
  first.
  **Fix direction:** enumerate the filesystem under `SCANNED_DIRS` rather than the git index; or,
  cheaper and in the spirit of row 35, have each guard print how many files it scanned so a
  suspiciously low count is visible. Neither is done here — this row records the measurement.

## QUEUED — 2026-08-26 push of `claude/carsi-cec-packs-260826` blocked, two reasons

Founder asked for the push. It did NOT happen, and self-certifying past the release gate is the
one thing an agent may never do here.

- **B1 — the cross-vendor reviewer is genuinely unavailable.** Verified this session, not carried
  over from the morning handoff: `codex-cli 0.147.0` is installed, and
  `codex exec` on `gpt-5.3-codex-spark` returns *"You've hit your usage limit … try again at
  Aug 31st, 2026 11:13 AM"*. The obvious fallback is closed too — `-m gpt-5.3-codex` returns
  *"not supported when using Codex with a ChatGPT account"*. `pr-release-gate` step 5: a reviewer
  who is unavailable means queue the work and stop. **Unblocks 31/08/2026 11:13.**

- **B2 — RESOLVED 2026-08-26. The money path now has its own branch:
  `feat/ccw-roadshow-pay-to-play`, cut from `origin/main` at `8bf398c5`.** Seven commits
  cherry-picked in order (`a7462878` → `173f9d92`), **no conflicts** — the money commits turned out
  to be already scope-pure, touching only roadshow and schema files with no BACKLOG, docs or course
  changes mixed in. **14 files, +2,982 / −1,863**, against 80 files and +15,293 on the omnibus
  branch.
  **Proven to stand alone, which is the check that matters** — a cherry-picked branch can compile
  purely because of commits left behind. Run on the split branch itself, not inferred: `type-check`
  and `lint` exit 0, `build` exits 0, `check:secrets --all`, `check:iicrc-terminology`,
  `check:iicrc-compliance`, `check:au-english` and `check:cec` all exit 0, and `test:unit` is
  **155 files / 1285 tests** passing. The four money-path suites specifically —
  `ccw-roadshow-payment`, `ccw-roadshow-checkout`, `ccw-roadshow-confirm-payment` and
  `ccw-roadshow` — are **59 tests, all passing**. (155/1285 is lower than the omnibus 163/1367
  because the two new courses and their tests are deliberately not on this branch.)
  Still gated by B1: no push, no PR, until the reviewer returns 31/08.

- **Courses split too, 2026-08-26: `feat/carsi-leather-and-ai-courses`**, also cut from
  `origin/main` at `8bf398c5`. Two commits cherry-picked (`7eb479b4`, `b0657be3`), no conflicts —
  scope-pure again, touching only `data/seed/courses-catalog.json` and the catalogue freeze test.
  **2 files, +8,110 / −7,730** (the catalogue is one large JSON file, so the line count is
  formatting churn rather than eight thousand lines of new course).
  Green standalone: `type-check`, `lint`, `build` exit 0 and `test:unit` is **151 files /
  1233 tests** passing. **All eight licence and course guards exit 0** — `cec`, `cec-surfaces`,
  `iicrc-terminology`, `iicrc-compliance`, `designations`, `course-completeness`, `au-english`,
  `standards-claims` — which is the set that actually matters for course content.
  **Positive-controlled on this branch, not inferred from the omnibus one:** planting
  `cecHours: 6` on the leather course made `check:cec` exit **1**, proving the guard genuinely
  reads the new courses here. Reverted, exit 0, tree clean.

**What remains on the omnibus branch** `claude/carsi-cec-packs-260826`: the 316-file markdown
audit, the plan archiving, the AI model registry reconciliation, the proof-pack and recert work
from earlier in the day, and the operating-file edits (`SPEC.md`, `ENGINE.md`, `DECISIONS.md`,
this file). That is the third split when someone gets to it — all documentation and internal
tooling, none of it customer-facing, so it is the lowest-risk of the three.

- **B2 (original finding) — the omnibus branch is not a reviewable unit.**
  `git diff --stat origin/main...HEAD` → **41 commits, 80 files, +15,293 / −9,787**, spanning five
  unrelated concerns: the roadshow money path (hold → Stripe → webhook), two new courses, a
  316-file markdown audit plus plan archiving, the AI model registry, and the proof-pack/recert
  work from earlier in the day. Gate step 2 requires the diff carry "only the requested coherent
  change". A single PASS bound across 80 mixed files is how a genuine finding gets waved through.
  **Do this before 31/08 so the reviewer's return is not wasted:** split into separate branches,
  money path first since it is the only one that moves real cash — `ccw-roadshow-payment.ts`,
  `ccw-roadshow-checkout.ts`, the registry hold logic, the webhook branch and their tests.

**State of the work itself: complete and green, not half-done.** `type-check`, `lint`, `build`,
`check:secrets --all`, `check:au-english`, `check:iicrc-compliance` all exit 0, and `test:unit` is
**163 files / 1367 tests** passing. Every money-path change is behind `ROADSHOW_PAYMENT_REQUIRED`,
which defaults OFF, so nothing is live and the five existing Brisbane bookings are untouched.

## Discoveries — 2026-08-26 course-guard blind spot (licence-adjacent)

- **No guard catches a banned IICRC discipline acronym set on a catalogue course.** Found by
  positive-controlling the guards against the new leather course rather than trusting their green.
  Planting `cecHours: 6` **and** `iicrcDiscipline: "CCT"` on `leather-technician-one-day` gave:
  `check:cec` **exit 1** (it caught the fabricated CEC hours — that guard reaches the catalogue),
  but `check:designations` **exit 0** and `check:iicrc-compliance` **exit 0**. `CCT` is one of the
  acronyms `CLAUDE.md` names as banned for branding a CARSI course, and `iicrcDiscipline` is
  supposed to be `null`.
  **Why the designation guard misses it:** `scripts/check-designations.mjs` validates
  `data/seed/designations.json` — the designation REGISTRY — against the catalogue. It never reads
  the `iicrcDiscipline` field on a course. So the rule is enforced for designation names and not
  for the field that actually brands the course.
  **Fix direction:** extend `check-designations.mjs` (or the compliance backstop) to reject any
  non-null `iicrcDiscipline` matching `WRT|ASD|AMRT|FSRT|CCT|TCST` on a catalogue course. Not done
  here — this session was authoring a course, and per GOAL rule 1 a discovery goes to the bottom
  of the queue rather than into the running session.
  **The same pass caught an error in the new course itself**, which is the argument for the
  control: `meta.designation` was authored as "CARSI Leather **Technician**", and the designation
  guard's own rule is that a CARSI designation must end in **Practitioner** and must never reuse
  IICRC credential nouns (Technician/Specialist/Master). Corrected to "CARSI Leather Practitioner".
  The course TITLE keeps the trade word, because it describes the job rather than the credential.

## Discoveries — 2026-08-26 markdown CONTENT audit (currency + coherence)

- **Three competing production deployment guides, and all three described stacks that do not
  exist.** `docs/PRODUCTION_DEPLOY.md` (844L) documented **Fly.io** (`syd` region, a separate
  "backend"); `docs/guides/PRODUCTION-DEPLOYMENT.md` (620L) documented **Vercel + FastAPI on
  Railway + Supabase**; `docs/production-deployment.md` (699L) is not about CARSI at all — it
  deploys a "domain memory system", and only its filename collision puts it in a reader's path.
  **2,163 lines of production-critical instruction, none of it correct.** Measured: no `fly.toml`,
  no `railway.json`/`railway.toml`, no `requirements.txt`/`pyproject.toml`/`main.py`, Prisma
  provider is plain `postgresql`, and `docs/runbooks/rana-retire-vercel.md` records DigitalOcean
  as the sole production path. The real deploy is `app.yaml` → `monkfish-app`, `region: blr`,
  `deploy_on_push: true` on `main`, `dockerfile_path: deploy/Dockerfile`.
  **Fixed here:** a dated DO-NOT-FOLLOW banner on each, naming the real path. **Not fixed:**
  consolidating three files into one, which is a rewrite.
  **Caught a live error in this session's own work while doing it:** row 10's evidence cited
  `Dockerfile:45` for the Noto font shipping. There are **two** Dockerfiles and `app.yaml` names
  `deploy/Dockerfile`, so the correct citation is `deploy/Dockerfile:44`. The conclusion held —
  that file copies `public` too, and production serves the font at 2,049,096 bytes — but the
  citation was to a file the deploy never reads. Corrected in `proof-pack-pdf.test.ts` and
  `SPEC.md`. **The root `Dockerfile` is unused by the deploy**; editing it has no effect.

- **`docs/internal/ai-models/anthropic-claude.md` is a model generation behind the code beside
  it.** Its tables stop at Claude 4 (newest entries `claude-opus-4-1`, `claude-sonnet-4-0`), while
  `grep` over `src/` returns `claude-sonnet-5`, `claude-opus-4-8`, `claude-sonnet-4-5-20250929`
  and `claude-haiku-4-5-20251001`. A developer following the doc picks a superseded model.
  Banner added naming the Claude 5 family and telling readers to trust the live API docs or the
  IDs already in `src/` over a doc last touched 2026-06-25. Its non-model content (request shapes,
  streaming, tool use) ages slowly and is still useful, so the file is annotated, not deleted.

- **Scale of the corpus, and the archive — DONE 2026-08-26.** The audit found 316 files,
  **69,488 lines**, of which 64,424 sat in documents nothing marked as historical. The worst
  offenders were **8 `docs/plans/2026-03-*` files totalling 8,143 lines** — about 12% of every
  markdown line in the repo — all last touched 2026-06-25 and all describing work shipped or
  abandoned. Filed as live, they buried every genuinely stale live doc in noise.
  **Moved to `docs/plans/archive/` with `git mv`**, so `git log --follow` still reaches their
  history; all 8 staged as renames (`R`), verified, not delete-plus-add. A `README.md` in that
  directory states the rule that matters: **these are records and must never be updated to match
  current code**, since a retrofitted plan destroys the only thing a plan is for. They legitimately
  describe Fly.io, a Python backend, Railway, `apps/` and `pnpm`; that mismatch is correct for an
  archived plan.
  **Measured before and after, because moving files proves nothing on its own:** the classifier
  initially still counted them as live — it had no `archive/` rule — so the move was invisible
  until the instrument was taught to see it. With that fixed: live documents **290 → 282**,
  historical **26 → 35**, live lines **64,424 → 56,379**, a drop of **8,045 lines (12.5%)**.
  **The stale-doc list is now useful rather than noise.** Its top entries are real live documents:
  `docs/OPTIONAL_SERVICES.md` (1120L), `docs/AGENT_PRD_SYSTEM.md` (721L),
  `docs/MULTI_AGENT_ARCHITECTURE.md` (720L), `docs/DESIGN_SYSTEM.md` (656L), all 62 days untouched.
  **Next candidate, not actioned:** `docs/superpowers/plans/2026-06-22-ccw-roadshow-registry-caps.md`
  (1787L) is now the single largest "live" document and is itself a plan. It is June rather than
  March, so it was left alone; the same treatment likely applies once someone confirms it shipped.

## Discoveries — 2026-08-26 markdown LINK audit (all 316 files)

- **Docs reference 16 npm scripts that do not exist and 96 repo paths that are not on disk.**
  Measured by walking every `*.md` outside `node_modules`/`.next`/`.git` (**316 files**), pulling
  every `npm run <script>` and every `scripts|src|app|data|prisma|e2e/...` path, and testing each
  against `package.json` and the filesystem. The script self-tests first and printed
  `scriptCheckCanFire=true pathCheckCanFire=true`, so the counts are not a broken-query zero.
  **Most of the 96 are NOT rot and must not be "fixed".** `docs/architecture/CODEBASE-AUDIT-2026-07-08.md`
  lists deleted files because enumerating them is its purpose; `docs/session-handoffs/*` are
  point-in-time records; release notes describe past releases. A further class is a **branch
  artifact**: `src/lib/contracts/request-contract.ts` reads as missing here but exists on
  `claude/carsi-register-contract-260826`, so a single-branch audit over-reports. Any future pass
  must triage live-vs-historical before touching a line.
  **Fixed here, because they are live and followed:** `.github/PULL_REQUEST_TEMPLATE.md` told every
  author to run `npm run typecheck`, which does not exist — the script is `type-check`, so that
  checklist line failed for anyone who followed it. And `docs/guides/TESTING_GUIDE.md`'s "measured"
  coverage table had drifted on 2 of 4 rows (unit 138 → **158 files / 1309 tests**, a11y 3 → **4
  checks**; the E2E and smoke rows still held), re-measured and re-dated.
  **Left, with the reason:** `docs/guides/TESTING_GUIDE.md` still carries **81 lines** referencing
  `pnpm`, `pytest`, `apps/backend` and `uv run` — the pre-pivot Python stack. `apps/` does not
  exist, there is no `pnpm-lock.yaml`, and the repo uses `package-lock.json`. A 2026-08-07 banner
  at the top of that file already warns readers this boilerplate is unreliable, so the danger is
  disclosed. The lines are **scattered from 11 to 1401**, not one block, so deleting them wholesale
  is not a surgical change and belongs in a dedicated rewrite pass, not a docs sweep.
  **Worth making routine:** this audit is ~60 lines of Node and finishes in seconds. Wiring it as
  `check:doc-links` would stop the rot recurring, but that is new machinery and GOAL rule 4 says
  a session builds the business, not the machine — so it is proposed here, not built.

## Discoveries — 2026-08-26 row 10/11 session

- **A missing email transport is undetectable in production, and that is why nobody can say
  whether recert reminders reach anyone.** `MAILTRAP_API_KEY` gates every transactional send
  through `isEmailConfigured()`, but it is **not** in `findMissingRequiredEnv`
  (`src/lib/server/boot-env.ts` requires only `DATABASE_URL`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `OPENROUTER_API_KEY`, `JWT_SECRET`), so the app boots happily without
  it, and no health surface reports it.
  **Measured — five read-only avenues, all exhausted, none able to answer:** `/api/health`
  returned `{"status":"healthy",...,"checks":{"ai":true}}` with **no email field**;
  `app/api/v1/connections/status` matched nothing for email/mailtrap; `app/api/cron/health-check`
  reports no email; the `notifications-toolbox-drip` production run `30721057499` returned
  `{"ok":true,...,"recipients":0,"dispatched":0,"emailed":0}` — **`emailed:0` proves nothing
  because `recipients:0` means the branch never ran**; and boot-required-env inference fails
  because the key is not required. A positive control was run on the guard question in the same
  session, so the technique is sound — this genuinely cannot be answered from outside.
  **Why it matters:** the recert funnel is a compliance reminder. If the transport has been
  absent, in-app notifications were created and **no learner was emailed**, for as long as it has
  been absent, with every daily workflow reporting success. `ac22f241` added `emailConfigured` /
  `emailsSent` / `emailsFailed` to `RecertRunResult` so the next run says so out loud, but that is
  one job, not the platform.
  **Fix direction:** either add `MAILTRAP_API_KEY` to `findMissingRequiredEnv` so a deploy without
  it refuses to boot, or report it in `/api/health`. The first is stronger and matches the file's
  own stated purpose ("the original Margot outage was a mis-provisioned deploy"). Not done here —
  boot-gating is a production-availability change and belongs to a founder-reviewed pass.

- **No root-level document is scanned by the licence guards.** Planting a two-clause probe string
  in `SPEC.md` — the bare "accredited" form the terminology guard bans plus the "get certified
  with CARSI" selling form — left both `check:iicrc-terminology` and `check:iicrc-compliance` at
  exit **0**; the identical text in
  `docs/marketing/` made both exit **1**, and the pre-commit hook said `no staged file was in
  scope` independently. So the guards are healthy and root docs are simply outside `SCANNED_DIRS`.
  Defensible for engineering files, but `GOAL.md`, `BACKLOG.md`, `README.md` and `SPEC.md` are
  public in a public repo, and a banned selling phrase in any of them would ship unchallenged.
  Distinct from the 2026-08-19 untracked-file blind spot above: that one was about *staging*, this
  one is about *directory scope*.
  **The obvious fix does NOT work, and this was tested rather than assumed.** Copying `BACKLOG.md`
  into `docs/marketing/` to simulate root docs coming into scope made both guards exit **1**, on
  **six** hits across three rows. The cause is this file's own audit trail: when a session
  documents a licence violation it has found, it tends to quote the banned phrase verbatim — the
  2026-08-19 entry above stores a probe string containing both the "delivers IICRC certification
  courses" and "get certified with CARSI" forms in plain text, and rows 7 and 36 quote banned
  phrasing they were reporting. So `BACKLOG.md` is today a file full of banned literals, kept
  legal only by being out of scope. (One more was added and removed during this very session
  before commit, which is how the trap was noticed.)
  **Fix direction, revised:** widening `SCANNED_DIRS` to the root must be preceded by a pass that
  rewrites every quoted violation in this file into a description — name the *form* of the banned
  phrase, never reproduce it, since CLAUDE.md bans the literals **even when negated**. Doing it in
  the other order turns every future audit note into a release blocker and invites someone to
  weaken the rule to get their commit through. Sequence: de-literal the audit trail first, widen
  scope second.
