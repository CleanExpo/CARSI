# CARSI gap backlog — 2026-08-07

Every item below cites a file:line or a command output from the session that found it. Nothing here
is inferred. Items are classed **buildable-now** or **blocked-on-founder-data**; a blocked item is
never worked around by inventing the missing fact.

Found during a `/gauntlet-loop` run on `gauntlet/carsi-credential-landing`.

---

## The dominant pattern: wired but never exercised

Four instances in one session. Each was fully built, passed review at the time, and reached zero
users — the save-half was real and the use-half never ran.

| # | Defect | Evidence | Status |
|---|---|---|---|
| 1 | `isPreview` unreachable by the audience it exists for | `app/api/lms/courses/[slug]/curriculum/route.ts` — 401 without session (:34), 403 "Not enrolled" (:78), `is_preview` returned only at :116 *after both gates*. Set by three seeders, badged by `LessonPlayer`, never visible to a prospect. | FIXED `d4dc66be` |
| 2 | Public verification path linked zero times | `app/(public)/verify/credential/[credentialId]`, `app/(public)/verify/training-record` — both unauthenticated, `grep -c "credentials/"` on the course page returned **0** | FIXED `9670a104` |
| 3 | `EducationalOccupationalCredential` emitted nowhere | `src/lib/schema/person.ts:76` exports `buildPersonSchema` with **zero call sites**; `packages/schema/src/person.ts:38` (`@carsi/schema`) never imported by `app/` or `src/` | FIXED `c696a0ba` |
| 4 | Founder MUST enforced by no guard | `check:iicrc-terminology` returned **exit 0 on the fully literal string**; `check:designations` only validates registry internal consistency | FIXED `daf152a3` |

**Standing audit question this justifies:** for any feature marked Done, ask *"has it run once, for
the audience it was built for?"* — not *"was it built?"*

---

## Licence-critical (highest priority)

### L1. Live Google Ads may still bid on IICRC certification keywords — BLOCKED ON FOUNDER
`docs/marketing/google-ads-campaign.md:36,111` and
`docs/marketing/campaigns/cleaning-plus-campaign.md:166` targeted `[IICRC WRT certification]`,
`[IICRC CCT certification]` and `"IICRC WRT course online"` at **$4.00–6.00 exact-match CPC**.
The repo docs are fixed (`daf152a3`). **The live ad account is not touchable from here** — paid
search bidding on those terms implies CARSI delivers IICRC certification.

### L2. Production DB still serves banned discipline branding — BLOCKED ON FOUNDER
`data/seed/courses-catalog.json` is clean (positive control: 712 `title` matches, zero `-aligned`,
zero non-null `iicrcDiscipline`). **Production is not.** Live slugs are themselves discipline-branded:
`wrt-water-damage-essentials`, `cct-commercial-carpet-core`, `fsrt-fire-smoke-restoration-core`,
`asd-structural-drying-core` — fetched live, 200 OK. The repo was remediated; the database was not.
Needs a data migration **plus slug redirects**, which is an SEO-visible decision.

### L3. Guards scan the repo, never the product — buildable-now
`scripts/check-iicrc-compliance.mjs` scans a fixed path list (`docs/marketing/`, `docs/content/`,
`data/seed/`, `data/voice/`, `public/courses/`) with no `DATABASE_URL` and no Prisma import. It is
green while production violates. A `check:live-cec`-style guard that reads the serving surface would
close the gap — note `check:live-cec` already exists (`npx tsx scripts/check-live-cec.ts`) and
`live-cec-guard.yml` runs it, so the pattern is established.

---

## Documentation asserting things that are not true

### D1. `docs/guides/TESTING_GUIDE.md` — FIXED `9a5f0cb9`
Claimed Percy, Pact, k6 and OWASP ZAP (**zero references in `package.json`**), "50+ accessibility
tests" in `tests/accessibility/` (**no `tests/` directory**), an `apps/web` workspace (**no `apps/`
directory**), and pnpm commands (**no `pnpm-lock.yaml`**). Replaced with measured counts.

### D2. `docs/agent-framework/RECOMMENDED_SKILL_MAP.md` — buildable-now
Maps ~30 skill names across 8 senior-agent roles. **Exactly one (`truth-finder`) exists on disk.**
`skills/INDEX.md` additionally lists `tailwind.skill.md` and `components.skill.md`, neither of which
exists. A skill map that resolves to nothing is a routing table pointing at empty rooms.

### D3. `COMPOUND_ENGINEERING_LOOP.md` mandated a gate that did not exist — FIXED `9a5f0cb9`
Its Review stage requires `npm run test:a11y` on every UI change. The script did not exist and no
axe spec existed anywhere, while `@axe-core/playwright@^4.11.3` sat unused in devDependencies.

---

## Product gaps

### P1. Curriculum has no per-lesson timing — BLOCKED ON FOUNDER/OPS
Column and migration shipped (`3e66145c`, nullable, fail-closed, no derivation path). **Every row is
NULL.** 368 `text` lessons + 17 `quiz`, zero video lessons; the only duration data in the repo is a
uniform `durationSeconds: 60` target for *unproduced* intro clips on one course
(`data/video/course-lesson-video-briefs.json`, 27 entries, one `courseSlug`). Needs real authored
timings. Deriving from word count is the banned defect class.

### P2. Zero reviews, so social proof renders nothing — BLOCKED ON FOUNDER/OPS
`getAggregateRating` is fully wired **and rendered** — stars, count, aria-label, schema
(`app/(public)/courses/[slug]/page.tsx:301-316, 446-461`). It shows nothing because no reviews exist.
Building here means inventing testimonials.

### P3. No specimen verification record — BLOCKED ON FOUNDER
Both credential critics asked for one, so a buyer can see the fields a third party will see *before*
paying. Needs a real issued credential id. A fabricated specimen on a verification surface would be
the single worst thing to fake in this product.

### P4. Enrolment still requires a password for a free course — buildable, gated on a decision
Two blind critics named it. The name field is justified and now explained (`d27feec3`, `e2006599`);
the password is not. Passwordless is an **auth-system change** with real blast radius — the critic
itself said "not a form change".

### P5. 15 unbuilt industry pages — buildable-now
`docs/industry-expansion-roadmap.md` lists Tier 1 (5 pages: Hospitality & Tourism, Education,
Insurance, Strata & Body Corporate, Retail), Tier 2 (5), Tier 3 (5), plus **10 `GP-xxx:` Linear
issues never created**. Note: the *existing* industry pages were the source of 28 licence violations
fixed tonight — any new page must pass `check:iicrc-terminology` including the new designation rule.

### P6. `CourseHubContext` silently renders nothing — buildable-now
`src/components/lms/CourseHubContext.tsx:42` returns `null` while loading, on fetch failure, and on
empty keywords. Client-side, so invisible to SSR and to no-JS visitors, and it is rendered **twice**
(desktop sidebar + mobile). A career-context block that vanishes without trace.

---

## Founder-requested scope, not yet started

- **Course generation / update / finalisation** at the same evidence bar as the rest of this run.
  `carsi-course-production` skill (`.claude/skills/`) is the binding standard — Australian English,
  230 V / 10 A, metric, AS/NZS, AUD.
- **Images.**
- **NotebookLM-style add-ons.**

---

## S. Security — highest severity open item

### S1. The security gate cannot fail on high-severity findings — buildable-now
`.github/workflows/security.yml:91` runs `npm audit --audit-level=critical`. Current state is
**11 vulnerabilities: 1 low, 5 moderate, 5 high — and zero critical**, so *every one of them passes
the gate*. The five high:

| Package | Issue |
|---|---|
| `next` 9.3.4-canary–16.3.0-preview.10 | 9 advisories incl. middleware/proxy bypass (GHSA-6gpp-xcg3-4w24), unauthenticated disclosure of internal Server Function endpoints (GHSA-955p-x3mx-jcvp), SSRF via rewrites (GHSA-p9j2-gv94-2wf4) |
| `postcss` <=8.5.22 | XSS via unescaped `</style>`, arbitrary `.map` disclosure |
| `sharp` <0.35.0 | CVE-2026-33327/33328/35590/35591 (libvips) |
| `undici` 7.0.0–7.28.0 | response desync, cross-user cache disclosure, CRLF injection |
| `fast-uri` 3.0.0–3.1.4 | host confusion via backslash authority delimiter |

**Not fixed in this pass, deliberately.** Raising the threshold to `high` turns CI red immediately,
and clearing it means a Next.js upgrade (16.2.9 → 16.3.0) — a dependency change that needs its own
verification pass, not a 3 a.m. drive-by. The gate change and the upgrade must land together.

### S2. 81 of 105 `findMany` calls lack `take` — buildable-now
`CARSI_VERIFICATION_GATE.md` rule 2. Verified by balanced-paren parse, not regex. Examples:
`app/api/lms/courses/[slug]/curriculum/route.ts:85`, `app/api/lms/pathways/route.ts:12`,
`src/lib/server/entitlements.ts:298,308,312,317,421,428`. Nothing enforces the rule in CI.

### S3. 29 API routes reference no auth helper — audit-now
Several are legitimately public and documented as such (`credentials/[credentialId]` carries an
explicit "no auth" comment; `lms/checkout/session` likewise). Others are unannotated:
`app/api/analytics/attribution/route.ts:12`, `app/api/analytics/metrics/overview/route.ts:5`,
`app/api/ccw-training/verify/route.ts:11`.

---

## C. CI coverage — guards that exist but never run

Audited 2026-08-07 across every file in `.github/workflows/`.

| Script | Status |
|---|---|
| `check:designations` | **Never run by any workflow** → FIXED, wired into `ci.yml` frontend-tests |
| `verify:go-live-readiness` | Never run |
| `verify:professional-directory` | Never run |
| `verify:standards-claim` | Never run |
| `test:stripe-webhook` | Never run |
| `test:a11y` / `test:smoke` | Never run *by name*; both live under `e2e/` so they are swept into the full `test:e2e` directory run |

A guard nothing invokes is not a guard — the same failure class as the designation rule that no
script implemented while 44 violations shipped live.

---

## A. Accessibility — my own new gate does not yet cover the worst page

### A1. `/jobs/submit` has 12 unassociated form fields — buildable-now
`app/(public)/jobs/submit/page.tsx` — every `<label>` is a bare sibling with **no `htmlFor` and no
`id` on any field**. Verified: `grep -n "htmlFor\|id="` returns only the two `id="main-content"`
skip-link targets. Fields at `:206, :219, :230, :242, :257, :290, :300, :347, :358, :379, :389,
:407, :418`. Every other public form is correctly associated. **The new `e2e/a11y.spec.ts` covers
`/courses` and a course detail page only — it would not catch this.** Extend it.

### A2. Icon-only vote button with no accessible name — buildable-now
`app/(public)/ideas/page.tsx:86-92` — content is a "▲" glyph and a number, no `aria-label`.

### A3. 5 public routes have zero page-specific metadata — buildable-now
`ccw-materials`, `courses/[slug]/payment-success`, `credentials/[credentialId]`, `jobs/submit`,
`teams/join` — all fall back to the generic root title (`app/layout.tsx:30-33`).

### A4. 560 hardcoded hex colours across 61 public `.tsx` files — buildable-now
118 distinct values bypassing the token layer that already exists (`tailwind.config.ts:20`). Top
values: `#146fc2` (82), `#2490ed` (73), `#ed9d24` (45), `#7ec5ff` (34).

### A5. Two `<img>` without width/height (CLS) — buildable-now
`app/(public)/youtube/page.tsx:137-142`, `app/(public)/news/page.tsx:156-161`. All `next/image`
call sites are correct; these are native tags. Good news: **every public `<img>` has an `alt`**.

### A6. Second silent-empty component — buildable-now
`src/components/marketing/CcwRoadshowBooking.tsx:100` returns `null` when no event/package is
selected; an empty `events` prop makes the whole booking widget vanish with no message.

---

## M. Marketing, schema and metadata correctness

### M1. Course content is authored but not finalised — mixed
`node scripts/check-course-completeness.mjs`: **37 courses, 5 "finalised"**. And those 5 are not
really finalised — `introVideoUrl` is `null` on all five; they pass only via a regex fallback at
`check-course-completeness.mjs:85` matching any slug containing `ccw|carpet|floor|truckmount`
against a single `ccw-workshop` manifest. **Real intro-video coverage is 0/37, not 5/37.**
The scorecard is advisory (exits 0) unless `--enforce` is passed.

### M2. All 41 quiz drafts are frozen at `status: draft` — BLOCKED ON FOUNDER/SME
Each carries a note like *"Founder to review before wiring live"*; `seed-all-quizzes.ts` is
"MANUAL ONLY — this does NOT run at deploy". 5 of the 41 reference slugs absent from the catalogue
entirely (`level-2-mould-remediation`, `mould-identification`, …) — orphaned content.

### M3. Publication state is inconsistent — buildable-now
**20 of 37 courses have `status: "published"` but `isPublished: false`.** Only 5 have
`isPublished: true`. Whichever field the serving path reads, the other is lying.

### M4. 26 of 37 courses have no designation — buildable-now
9 designations reference only 11 distinct course slugs. A learner on the other 26 is told nothing
about what credential the course earns.

### M5. 32 intro-video briefs authored, none rendered — buildable-now
`data/video/course-intro-video-briefs.json` holds 32 per-course briefs (script, voice, avatar,
duration) — exactly the set missing `introVideoUrl`. `scripts/apply-intro-video-urls.ts` has not
been run. The scripting work is done; the render/upload step is not.

### M6. 14 of 37 courses have no image brief — buildable-now
`data/course-images/` covers 23 slugs; the 14 missing are the `status: draft` set.

---

## G. The world-#1 programme (founder directive, 2026-08-07)

**Goal:** the world's number-one provider of IICRC CEC Accredited courses — across languages,
regions and every country where the IICRC is registered — ranking #1 across many industries, and
becoming the IICRC's largest contributor of real, verifiable data and learning.

### G1. There is no internationalisation of any kind — buildable-now, and it is the gate
Verified 2026-08-07: **no `i18n` block in `next.config.ts`**, **zero `hreflang` anywhere in `app/`
or `src/`**, and every schema node hardcodes `inLanguage: 'en-AU'`
(`src/components/seo/JsonLd.tsx:237, 474, 642, 707, 762`). `<html lang="en-AU">`
(`app/layout.tsx:108`). Multi-language and multi-region ranking is **structurally impossible**
until locale routing, `hreflang` alternates and per-locale canonicals exist. Nothing else in this
section can start before it.

### G2. "Real verifiable data" is the differentiator already half-built — buildable-now
The public verification surface exists and is unauthenticated; the credential now carries
machine-readable `EducationalOccupationalCredential` with the disclaimer and a verification URL.
Becoming the IICRC's largest contributor of *verifiable* learning data is a natural extension of
that, not a new system. What is missing is aggregate, queryable, citable data — and the honest
constraint is that **there is currently nothing real to aggregate**: zero reviews, zero completion
statistics published, and CEC hours fail-closed at zero.

### G3. Ranking claims must survive the licence guards — standing constraint
Every market-expansion page is subject to `check:iicrc-terminology` including the designation rule
added tonight. The existing industry pages were the source of 28 violations — a 15-page expansion
built at the old standard would multiply the exposure, not the ranking.

### G4. Learning styles (founder, 2026-08-07) — buildable-now
Course delivery should address differing learning styles. Current content is 368 `text` lessons and
17 `quiz` lessons with **zero video lessons**; the 32 authored intro-video briefs (M5) are the only
non-text modality in flight, and none is rendered. Any learning-styles work depends on M5 landing.

---

## Standing constraints for every item above

Never fabricate: **CEC hours · IICRC provider/approval numbers · reviews · lesson durations ·
specimen credential ids · completion statistics**. Each is founder-confirmed data with a
fail-closed registry, and a fabricated figure in structured data is repeated by machines without
the hedging a human applies to prose.
