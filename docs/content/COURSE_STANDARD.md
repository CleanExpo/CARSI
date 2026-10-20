# CARSI Course Standard v1

**Status:** v1, drafted 20/10/2026 for GP-658. Owner: founder. Applies to every new course and to
every existing course when it is upgraded.

**Machine check:** `npm run audit:course-depth` (report) and `npm run check:course-standard` (CI).
Script: `scripts/audit-course-depth.mjs`. Test: `npm run test:course-depth`.

This document says what a CARSI course must contain. It does not replace the Australian-production
skill (`.claude/skills/carsi-course-production/SKILL.md`), the licence rules in `CLAUDE.md` or the
humanizer pass. Those still apply to every course. This standard adds structure and depth.

---

## 1. Why this exists

A 20/10/2026 audit of the seed catalogue found that stated course hours are not backed by content.
The median course holds reading for about 14.5% of its stated time. Most modules hold one text
lesson. Very few lessons carry an image, a download, a worked example or a check. This standard
sets floors that can be measured from the repository, so "deeper" is a number, not an opinion.

## 2. How a course opts in

A course is held to this standard when its catalogue entry carries:

```json
"meta": {
  "standard": "v1",
  "standardLevel": "L2-practitioner",
  "rolePaths": ["mould-and-indoor-air"]
}
```

- `meta.standard: "v1"` turns enforcement on. CI fails if an opted-in course misses any floor.
- Courses without `meta.standard` are still scored and reported, but never fail CI. That keeps the
  existing catalogue shippable while courses are upgraded one at a time.
- Any other value of `meta.standard` (a typo such as `"V1"`, or a version this script does not
  know) is an input error and fails CI. A course must not slip out of enforcement through a typo.
- Every new course ships with `meta.standard: "v1"`. Every upgraded course gets it when the upgrade
  lands. The marker is never removed to make CI pass.

## 3. The hierarchy

Levels → role paths → courses → modules → lessons.

### 3.1 Levels

Recorded in `meta.standardLevel`. The existing `level` field is left alone, because the storefront
reads it.

| `meta.standardLevel` | Purpose                                                                          | Typical length |
| -------------------- | -------------------------------------------------------------------------------- | -------------- |
| `L0-free`            | Free knowledge: a taster or free lead course                                     | 5–90 min       |
| `L1-foundation`      | Safe and useful on day one                                                       | 2–4 h          |
| `L2-practitioner`    | Earns a CARSI Southern Hemisphere Restoration Designation, with a practical task | 8–14 h         |
| `L3-specialist`      | Supervises, scopes, reports and handles complex jobs                             | 6–10 h         |

IICRC CEC approval is not a level. It is a separate shelf, and only courses listed as approved in
`data/seed/cec-approvals.json` sit on it.

### 3.2 Role paths

Recorded in `meta.rolePaths` (at least one). A course may sit on more than one path.

| id                              | Path                                              |
| ------------------------------- | ------------------------------------------------- |
| `new-technician`                | New Technician (first 30 days)                    |
| `water-and-drying`              | Water and Drying                                  |
| `mould-and-indoor-air`          | Mould and Indoor Air                              |
| `biohazard-and-decontamination` | Biohazard and Decontamination                     |
| `fire-smoke-and-odour`          | Fire, Smoke and Odour                             |
| `carpet-and-floors`             | Carpet and Floors                                 |
| `supervisor-and-estimator`      | Supervisor and Estimator                          |
| `adjacent-buyers`               | Property managers, facility managers and builders |

### 3.3 Courses, modules and lessons

- A course at L1–L3 has **4–6 modules**. An L0 course has 1–6.
- Every module has **at least 3 lessons**: two or more teaching lessons plus the module check. No
  single-lesson modules.
- WHS boilerplate (heat stress, SDS, plant and machinery) lives once, in shared foundation
  courses. Specialist courses link to it and do not repeat it.
- A teaching lesson is any lesson whose `contentType` is not `quiz`. It runs about 8–12 minutes.

## 4. The seven-part lesson pattern

Every teaching lesson uses these seven parts, in this order, each under its own heading (`<h2>`,
`<h3>` or `<h4>` whose text starts with the part name). The audit looks for the headings.

1. **On the job** (60–100 words). A real Australian job scenario: place, building, people, what
   went wrong.
2. **The idea** (300–600 words). One concept, explained plainly. One idea per lesson.
3. **See it.** A diagram, field photo or short video (2–4 minutes). The lesson must carry at least
   one visual: an `<img>`, `<svg>`, `<video>` or `<iframe>` in the body, or an `image`/`video`
   resource.
4. **Do it in metric.** One worked example with real numbers in metric units (°C, %RH, g/kg, m²,
   m³, m³/h, L, L/day, mm, kPa, 230 V). Show each step.
5. **Field download.** A one-page tool the learner takes to the job: a checklist, decision tree,
   form or field card. It is attached as a lesson resource.
6. **Check yourself.** Three questions on this lesson. Each wrong answer has a practitioner-written
   "why". The questions live in the module check quiz (see 5.4), which pools three questions per
   teaching lesson.
7. **Takeaway.** Two lines the learner remembers, plus the next step (the next lesson, a glossary
   term or a calculator).

## 5. Measurable floors

Each floor is checked by `scripts/audit-course-depth.mjs` against the seed data. The numbers here
and the constants in the script must match. Change both together, in one reviewed commit.

| #    | Floor            | Rule                                                                                                                                                                                     | Measured from                                                                               |
| ---- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 5.1  | `metadata`       | `meta.standard` is `v1`, `meta.standardLevel` is one of the four levels, `meta.rolePaths` lists at least one known path, `durationHours` > 0, `shortDescription` is set                  | catalogue entry                                                                             |
| 5.2  | `structure`      | L1–L3: 4–6 modules. L0: 1–6. Every module has at least 3 lessons                                                                                                                         | `modules[].lessons[]`                                                                       |
| 5.3  | `depth`          | Evidenced learning minutes ≥ **50%** of stated minutes (`durationHours` × 60)                                                                                                            | see 5.3 below                                                                               |
| 5.4  | `moduleChecks`   | Every module contains a quiz lesson that resolves to a quiz with at least 3 questions per teaching lesson in that module (minimum 3)                                                     | quiz lesson `contentBody` or a `quiz:<id>` resource, resolved against `data/seed/**/*.json` |
| 5.5  | `explanations`   | Every question in those quizzes has an `explanation` of at least 20 characters                                                                                                           | quiz files                                                                                  |
| 5.6  | `finalQuiz`      | The last lesson of the last module is a quiz with at least 10 questions and a pass mark of at least 70%                                                                                  | quiz files                                                                                  |
| 5.7  | `fieldDownloads` | Every module has at least one field download resource                                                                                                                                    | lesson `resources[]`                                                                        |
| 5.8  | `lessonPattern`  | Every teaching lesson has all seven part headings                                                                                                                                        | lesson `contentBody`                                                                        |
| 5.9  | `lessonWords`    | Every teaching lesson has at least 400 words                                                                                                                                             | lesson `contentBody`                                                                        |
| 5.10 | `visual`         | Every teaching lesson carries a visual                                                                                                                                                   | body tags or `image`/`video` resource                                                       |
| 5.11 | `metricExample`  | Every teaching lesson contains at least one number with a metric unit                                                                                                                    | lesson `contentBody`                                                                        |
| 5.12 | `practical`      | Courses at L2/L3, and every course with `meta.designation`, have a practical task: `data/seed/<slug>-assessment.json` with instructions and at least 3 rubric criteria                   | seed file (matches `LmsPracticalAssessment`)                                                |
| 5.13 | `australian`     | No US spelling, US voltage or US circuit framing anywhere in the course copy                                                                                                             | `findUsForms` from `scripts/check-au-english.mjs`                                           |
| 5.14 | `licence`        | No banned IICRC phrasing in the course copy; `cecHours` is 0 unless the slug is approved in `data/seed/cec-approvals.json`; a course with `meta.designation` has `iicrcDiscipline: null` | `scanText` from `scripts/check-iicrc-terminology.mjs`, `cec-approvals.json`                 |

### How evidenced learning minutes are counted (floor 5.3)

- Reading: words in teaching lessons ÷ 230 words per minute (HTML tags stripped).
- Video: `durationMinutes` on a video lesson, or `durationMinutes` on a `video` resource.
- Checks: 1.5 minutes per resolved quiz question.

The floor is 50%, not 100%. The rest of the stated time is practice, field-tool use and the
practical task, which the seed data cannot measure. The evidenced share is an internal audit
measure only. It is never shown to learners as a course length.

### What counts as a field download (floor 5.7)

A field download is a lesson resource with `kind` of `download`, `checklist`, `template`,
`field-card`, `form` or `pdf`, or a URL ending in `.pdf`, `.docx`, `.xlsx` or `.csv`. Links to
government pages, audio narration, flashcards and quiz links do not count. They are useful, but
they are not a tool the learner takes to the job.

## 6. Australian production rules

These restate the carsi-course-production skill. The skill is the full checklist.

- Australian English: mould, colour, odour, metre, litre, fibre, centre, licence (noun),
  practise (verb), -ise endings.
- Power: 230 V, 50 Hz, 10 A GPO, RCD or safety switch, test-and-tag. All power maths at 230 V.
- Metric units first. Imperial only in brackets after the metric value.
- Products: available in Australia in 230 V form, with the date of the availability check.
- Standards and regulators: AS/NZS, Safe Work Australia, state WHS regulators and state EPAs.
- Prices in AUD, with "inc GST" where it applies.
- Australian places, climate, building types and job types in every scenario.
- Every course passes the humanizer skill and a human sign-off before publish.

## 7. Licence rules

- CARSI is an **IICRC CEC Accredited** provider. That accreditation covers continuing education
  credits only. IICRC certification comes only through IICRC-approved schools and examinations,
  and CARSI course copy never says or implies that a CARSI course leads to it.
- CARSI credentials are the **CARSI Southern Hemisphere Restoration Designations**. A CARSI course
  is never named or branded with an IICRC discipline acronym and is never described as aligned to
  an IICRC discipline. Designation courses set `iicrcDiscipline: null` and carry the credential in
  `meta.designation`.
- Every new course ships with `cecHours: 0`. Only the founder changes it, and only after the IICRC
  approves that course and the approval is recorded in `data/seed/cec-approvals.json`.
- Cite IICRC standards by name only (for example "ANSI/IICRC S500"). Keep standard text out of
  courses and out of every AI tool.
- No IICRC logo or mark is used.
- A course on the CEC approvals list carries no CCW brand, product name or link.
- The existing guards still run on every change: `check:iicrc-terminology`,
  `check:iicrc-compliance`, `check:cec`, `check:cec-course-brand` and `check:au-english`.

## 8. What the audit cannot see

- Live database content. The audit reads the seed catalogue (`data/seed/courses-catalog.json`),
  which can lag the live site. A course upgraded through the admin screen must also be exported
  back to the seed before the audit can score it.
- Whether a visual or download is any good. The audit proves it exists. A human reviews quality.
- Whether a scenario is real or a worked example is correct. A practitioner reviews those.
- Video length, unless `durationMinutes` is recorded.
