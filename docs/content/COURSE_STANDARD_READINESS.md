# Course Standard v1 — catalogue readiness & upgrade queue

**Generated:** 2026-11-01 · **Source:** `npm run audit:course-depth -- --json` over
`data/seed/courses-catalog.json` (80 courses). **Spec:** `docs/content/COURSE_STANDARD.md`.
Re-run the audit and update this file whenever the catalogue changes — the numbers below are a
snapshot, not a live view.

> This is a research/design artifact: it says *which* courses to raise to Standard v1 and *in what
> order*. It changes no course and adds no process. Authoring, SME sign-off, media generation,
> seeding and publishing remain their own gated steps.

## Where the catalogue stands

- **80 courses.** **2 carry `meta.standard: "v1"`** (`level-2-mould-remediation-30ee3492`,
  `level-3-mould-remediation-6c55a1ef`) and both meet **every** floor. The other **78 are
  pre-standard** (no `meta.standard` marker) and are reported, not gated.
- **46 / 80 have lesson text**; 34 are `isPublished: true`.
- **`check:course-standard --ci` is green (exit 0)** — no opted-in course misses a floor. Raising a
  course to v1 is therefore an *opt-in*: it only enters enforcement once its floors are green, so
  the live catalogue is never blocked by this work.

### The gap is uniform and structural — not licence or language

| Floor | Courses missing / applicable | Reading |
| --- | --- | --- |
| `australian` | **0 / 80** | Whole catalogue is AU-clean — the guards have held. |
| `licence` | **0 / 80** | No banned IICRC/CEC phrasing anywhere. |
| `finalQuiz` | 69 / 80 | 11 courses already have a ≥10-Q / ≥70% final. |
| `lessonWords` | 74 / 80 | Most lessons are under 400 words. |
| `metadata` | 78 / 80 | The v1 markers (`standard`/`standardLevel`/`rolePaths`) are the entry step. |
| `structure` | 76 / 80 | Legacy shape is single-lesson modules. |
| `depth` · `moduleChecks` · `fieldDownloads` · `lessonPattern` · `visual` · `metricExample` | ~78 / 80 | The seven-part lesson pattern + field tools + module checks + visuals + worked metric examples. |
| `practical` | 9 / 11 applicable | Only the two v1 Mould courses have a rubric. |

**Interpretation.** Nothing in the catalogue fails on Australian production or licence — those
disciplines are solved and guarded. The entire distance to v1 is the *depth* the Standard defines:
the seven-part lesson, enough words, a visual and a worked metric example per lesson, a field
download per module, real module checks with written explanations, and (for designation courses) a
practical task. The Level 2/3 Mould courses prove the shape; every other course copies it.

## Priority cohort — the 9 CARSI designation courses

The catalogue holds **9 courses that already carry a CARSI Southern Hemisphere Restoration
Designation** (`meta.designation` set, `iicrcDiscipline: null`, `cecHours: 0`). These define the
CARSI credential catalogue, so they are the natural order of upgrade — each one raised to v1 is a
sellable, assessed, designation-bearing course. None is on v1 yet.

| Course slug | Designation | On v1? | Floors |
| --- | --- | --- | --- |
| `water-damage-restoration-fundamentals` | CARSI Water Restoration Practitioner | — | 3/14 |
| `mould-remediation-fundamentals` | CARSI Mould Remediation Practitioner | — | 3/14 |
| `structural-drying-fundamentals` | CARSI Structural Drying Practitioner | — | 2/14 |
| `category-3-sewage-black-water-remediation` | CARSI Contaminated-Water Practitioner | — | 2/14 |
| `fire-smoke-damage-restoration-fundamentals` | CARSI Fire & Smoke Restoration Practitioner | — | 2/14 |
| `trauma-crime-scene-decontamination-fundamentals` | CARSI Trauma & Biohazard Decontamination Practitioner | — | 2/14 |
| `carpet-cleaning-fundamentals` | CARSI Carpet Cleaning Practitioner | — | 2/14 |
| `timber-floor-assessment-restoration` | CARSI Timber Floor Restoration Practitioner | — | 2/14 |
| `assessing-indoor-environment-conditions` | CARSI Indoor Environment Assessment Practitioner | — | 2/14 |

(These 9 are distinct from the two `level-2/3-mould-remediation-*` v1 courses, which are a deeper,
separately-built pair.)

**Recommended lead: `water-damage-restoration-fundamentals` ("CARSI Water Restoration
Practitioner").** It is tied top of the cohort (3/14), it is the course used in the Ivi live-demo
path, water-and-drying is the most common AU restoration discipline, and it already passes
`licence`, `australian` and `finalQuiz` — the remaining work is pure structure. Its worked upgrade
blueprint is `data/courses/water-damage-restoration-fundamentals/v1-upgrade-spec.md`.

## Coverage gaps (what v1 does not yet reach)

- **Levels** (`meta.standardLevel`): only `L2-practitioner` and `L3-specialist` exist today (both
  Mould). There is **no `L0-free` taster** and **no `L1-foundation`** course on v1 — an L0 free lead
  course is the cheapest acquisition asset and is missing from the standard entirely.
- **Role paths** (`meta.rolePaths`): only `mould-and-indoor-air` is covered. The other seven —
  `new-technician`, `water-and-drying`, `biohazard-and-decontamination`, `fire-smoke-and-odour`,
  `carpet-and-floors`, `supervisor-and-estimator`, `adjacent-buyers` — have **no** v1 course. The
  designation cohort above maps onto most of them, so upgrading it closes most of this gap.

## Full restoration upgrade queue (non-v1, has lesson text — top 18 by floors passed)

Ranked by floors passed, then content volume. "Des" = carries a CARSI designation.

| # | slug | floors | mods | less | words | Des | representative gaps |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | moisture-meters-readings-and-dry-standards | 4/13 | 7 | 31 | 12439 | – | structure, depth, pattern, downloads, visual |
| 2 | asthma-and-allergy-course | 4/13 | 5 | 22 | 5370 | – | depth, checks, pattern, downloads, visual |
| 3 | psychrometry-building-science-for-drying | 3/13 | 10 | 41 | 13757 | – | structure, depth, pattern, downloads, visual |
| 4–6 | introduction-to-drying-{educational,transport,industrial} | 3/13 | 5 | 5 | ~5k | – | structure, finalQuiz, pattern, downloads |
| 7 | whs-fundamentals-for-restoration-and-cleaning-professionals | 3/13 | 9 | 18 | 3749 | – | structure, depth, pattern, downloads |
| 10 | mould-remediation-fundamentals | 3/14 | 7 | 14 | 2042 | **Y** | + practical |
| 11 | water-damage-restoration-fundamentals | 3/14 | 6 | 13 | 2022 | **Y** | + practical *(recommended lead)* |
| 12 | neosan-labs-product-training | 2/13 | 9 | 44 | 28716 | – | product training — not a designation course |

Two deep courses (`moisture-meters-readings-and-dry-standards`, `psychrometry-building-science-for-drying`)
have the most existing content and so the shortest distance on the word/volume floors; they make
good **supporting** upgrades inside the water-and-drying path once the designation lead ships.

## How to use this file

1. Pick the next course from the designation cohort (lead already chosen).
2. Write its `v1-upgrade-spec.md` from the audit gap list (mirror the water lead).
3. Author to the spec (SME), build field tools + diagrams + quiz + assessment, add the v1 markers.
4. `npm run audit:course-depth` until the course is green; it only enters `--ci` enforcement once
   `meta.standard: "v1"` is set, so set that marker **last**.
5. SME + founder sign-off → media generation → seed → publish (all gated, outside this file).
