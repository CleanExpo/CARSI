# v1 upgrade blueprint — CARSI Mould Remediation Practitioner

**Course:** `mould-remediation-fundamentals` · title "CARSI Mould Remediation Practitioner"
**Designation:** CARSI Mould Remediation Practitioner (`meta.designation`; `iicrcDiscipline: null`;
`cecHours: 0`). **Standard:** `docs/content/COURSE_STANDARD.md`.
**Role (founder decision 02/11/2026):** designation assessment and credential wrapper.
**Prerequisite:** `level-2-mould-remediation-30ee3492` (CARSI Level 2 Mould Remediation).
**Audit of the live seed entry:** 3/14 (passes `finalQuiz`, `australian`, `licence`).
**Audit of the v1 draft:** 14/14 (`node scripts/audit-course-depth.mjs --seed-dir=data/courses/mould-remediation-fundamentals/v1-draft --ci`, exit 0).

> Build spec. The authored draft is in `./v1-draft/` (a staging fixture, not `data/seed/`).
> Going live is gated: SME (Phill) sign-off → founder sign-off → promote into seed → manual
> per-course seed run. `meta.standard: "v1"` was set last.

## 0. Scope decision

The live entry is a 7-module teaching course whose topics (biology, assessment, containment,
negative air, PPE, sequence, verification, documentation) are all taught, in more depth, by Level 2.
The founder ruled one course per level with no duplicate teaching. This course therefore:

- requires Level 2 (`meta.prerequisite`), stated in the description, lesson 1 and the practical;
- teaches nothing Level 2 already teaches; each lesson **applies** Level 2 to a whole job and names
  the Level 2 lessons it draws on, by title;
- holds the designation assessment: the practical task (rubric) and the final designation exam.

## 1. Metadata (floor 5.1)

| Field | Live seed | v1 draft |
| --- | --- | --- |
| `meta.standard` | — | `v1` (set last) |
| `meta.standardLevel` | — | `L2-practitioner` (earns a designation, carries a practical task) |
| `meta.rolePaths` | — | `["mould-and-indoor-air"]` |
| `meta.prerequisite` | — | `level-2-mould-remediation-30ee3492` |
| `meta.courseRole` | — | `designation-assessment-and-credential-wrapper` |
| `durationHours` | 5 | **2.5** — matched to evidenced volume (58%); see §4 |
| `description` / `shortDescription` | teaching course, "CEC-accredited training" | wrapper; prerequisite stated; no CEC claim |
| kept | slug, title, `priceAud` 99, `cecHours` 0, `iicrcDiscipline` null, `meta.designation`, `designationProgram`, intro video and captions meta, `linearIssue` GP-474, `level`, tags, thumbnail | unchanged |

## 2. Structure (floor 5.2): 4 modules, each ≥3 lessons

| Module | Lessons |
| --- | --- |
| M1 The designation & the whole job | 1.1 The designation: what it requires and how you earn it · 1.2 Case study: one job from scope to sign-off · Module 1 check |
| M2 Making the calls on site | 2.1 Case study: deciding between conditions across three rooms · 2.2 Common-failure analysis: why mould jobs come back · Module 2 check |
| M3 Evidence, clients & insurers | 3.1 Case study: writing the defensible job file · 3.2 Case study: talking to the client, occupants and the insurer · Module 3 check |
| M4 Designation assessment | 4.1 Preparing your practical submission · Module 4 check · Final designation exam |

7 teaching lessons, 4 practice checks (6/6/6/3 questions), final designation exam (20 questions,
pass 80%), practical task (5 criteria, pass 70%).

## 3. Per-floor work

- **`lessonPattern` / `lessonWords` / `visual` / `metricExample`:** each lesson uses the seven parts,
  771–954 words, one SVG referenced by filename (briefs in the research pack; the coordinator
  builds them), and a worked metric example (m², m³, ACH, A at 230 V, W, °C, %RH, g/kg, kPa, h,
  AUD with GST). Each ends with `<h3>Sources for this lesson</h3>` generated from the ledger.
- **`fieldDownloads`:** one per module under `public/courses/mould-remediation-fundamentals/field-tools/`:
  scope-to-sign-off tracker, area decision and failure check, job file and communication checklist,
  practical submission checklist. None duplicates a Level 2 field download.
- **`moduleChecks` / `explanations`:** 3 questions per teaching lesson, each with an explanation.
- **`finalQuiz`:** 20 questions, pass 80% (quiz id `ce8d62e3…` kept, questions replaced).
- **`practical`:** `v1-draft/mould-remediation-fundamentals-assessment.json` — plan and evidence a
  medium job (Wollongong, 1984), including area decisions and an insurer note; 5 x 20 points.
- **`australian` / `licence`:** AU English, 230 V / 10 A / RCD, metric, AUD; no CEC claim; no IICRC
  discipline acronym; S520 named only; no standard requirement stated.

## 4. Depth math (floor 5.3)

| Source | Volume | Evidenced min |
| --- | --- | --- |
| 7 lessons | 5,872 words ÷ 230 | ~25.5 |
| Checks (21 Q) + final (20 Q) | 41 Q × 1.5 | ~61.5 |
| **Total** | | **~87 min** |

At 2.5 h (150 min): 58%. The ceiling for an honest pass is about 2.9 h. The practical's real time
is not counted by the audit. No content was added to inflate the number.

## 5. Remaining gated steps

1. Phill: clear the 10 GAPs (5 tagged `check_owner: "Phill (SME) — licensed S520"`).
2. Coordinator: build the 7 SVGs from the briefs; `npm run check:course-diagrams`.
3. Founder: confirm tier placement, `standardLevel`, hours, storefront `level`, intro video fit.
4. Humanizer pass; founder sign-off.
5. Promote into `data/seed/` (catalogue entry, quiz, assessment) and retire the old module and
   lesson ids listed in the research pack; re-run `check:course-standard`, `check:au-english`,
   `check:iicrc-terminology`, `check:iicrc-compliance`, `check:standards-claims`, `check:cec`
   there (they scan `data/seed/`, not `data/courses/`).
6. Manual per-course seed run; publish remains founder-gated. The enrolment gate that enforces
   the Level 2 prerequisite is an app change, not part of this draft.
