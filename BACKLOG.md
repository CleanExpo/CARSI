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
| 30 | Wire `check:live-catalogue` into CI on a schedule. It is NOT in CI and is the only guard that has caught a real production defect. Needs no credentials — it reads the public sitemap. | A | 0 | **done 2026-08-20** — `.github/workflows/live-catalogue-guard.yml`. Daily 03:00 UTC and `workflow_dispatch`. **Not** on push: dispatching the real workflow showed a push trigger attaches a PR check whose verdict is about the live catalogue rather than the PR's code, so every PR touching the guard would carry a red check it cannot fix. Observed run `32295824919` — reached production, exited 1, failed for the right reason, and ran its then-168-check suite with no `npm ci` (the suite is 188 checks at the current head, after a P1, a P0 and a second P1 found across three rounds of independent review). Deliberately NOT gated behind a repo variable like `live-cec-guard.yml`: it needs no credentials, and a config flag that silently disables a licence guard is the defect this family exists to prevent. Exit 2 fails the job as loudly as exit 1. **Expected RED until #31 is fixed** — do not add a baseline to make it green. |
| 31 | Fix 4 live designation violations on carsi.com.au (`cct-commercial-carpet-core`, `wrt-water-damage-essentials`, `fsrt-fire-smoke-restoration-core`, `asd-structural-drying-core`). Licence-critical and live now. 3 of the 4 are absent from repo seed, so this needs the prod-DB path. | A→F | 0 | blocked on DECISIONS #16 |
| 32 | ~~Render `commercial-floor-care-schools-childcare.mp4`~~ **WITHDRAWN — false premise.** The mp4 exists (2,109,732 bytes, 18 Aug 01:15) and `test:unit` is green (1056/1056). The "never rendered" claim came from `find . -name "*floor-care*intro*.mp4"`, which cannot match that filename — `intro` is in the directory `course-intros/`, not the filename — so it returned empty against a file that exists. Same disease as #29, in the evidence-gathering rather than the guard. Residual unknown: the earlier `test:unit` exit 1 was a real AssertionError on the ffprobe test; why it failed then and passes now on an unchanged tree is unexplained. | A | 0 | **withdrawn** |
| 33 | Add `tsx` to devDependencies. `check:live-cec` runs `npx tsx`; tsx is absent from both `package.json` and `node_modules`, so that guard cannot execute. ~50 scripts reach for it via npx. | A | 0 | **done** — landed in `e7d85d3f` ("align package.json with the committed lockfile"), `tsx ^4.23.12`. Verified on `origin/main` 2026-08-20; the row was still marked ready. |
| 34 | Remove `continue-on-error: true` from the Build step at `.github/workflows/agent-pr-checks.yml:100`. Measured: the following `Report Results` step writes only to `$GITHUB_STEP_SUMMARY` and never exits non-zero, so `Agent PR Validation` goes green while its own summary prints `Build: ❌ Failed`. **The merge gate is NOT holed** — required checks are `Build Check` and `Frontend Tests`, both in `ci.yml`. Reporting dishonesty, not a merge hole. Low priority. | A | 0 | **done** — landed in `df9da305` ("fail the agent pr build check when the build fails"). Verified on `origin/main` 2026-08-20: no `continue-on-error` remains in that workflow, and the line now carries a comment saying why. The row was still marked ready. |
| 35 | Scanned-count contract: as each guard is touched, make it print what it looked at and exit non-zero when that count is zero. Applied opportunistically, not as a sweep. This is the structural fix — it collapses the whole vacuous-guard class into a loud failure on the day it occurs. | A | 0 | ready |
| 36 | `bootstrap.sh` must install the pre-push hook, and its absence must be detectable. `core.hooksPath` points at `~/.config/git/hooks` — machine-local and outside every repo — so a fresh machine or agent checkout has no pre-push gate at all. | A | 0 | ready |
| 37 | Repo-wide `npm run lint` exits 1 with **14,777 problems** (7,738 errors). A gate nobody can action is a gate that is effectively off — same class as #29. Attribution was checked: eslint on changed files exits 0, so it is pre-existing, not branch-introduced. Needs a baseline-and-ratchet decision before lint can gate anything. | A | 0 | ready |

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
