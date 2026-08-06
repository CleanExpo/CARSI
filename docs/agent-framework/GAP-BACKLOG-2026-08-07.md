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

## Awaiting: three parallel audits dispatched 2026-08-07

Course-content completeness · dependencies + CI coverage · UI/UX and accessibility.
Findings append here on arrival. This section is a placeholder, not a result.
