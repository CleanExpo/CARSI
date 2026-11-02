# Research pack — CARSI Mould Remediation Practitioner (v1 DRAFT)

**Status:** DRAFT v1 for Subject-Matter-Expert review. **SME: Phill McGurk** (holds the licensed
S500, S520, S700 and S540). This pack is the human summary of the course's **evidence ledger**:

`data/courses/mould-remediation-fundamentals/v1-draft/evidence/evidence-ledger.jsonl`
(pointed to by `meta.evidenceLedger`; schema per the `course-truth` and `carsi-course-production`
skills and the evidence-layer template).

Standards are referenced **by name only**. No IICRC (or other) standard text was reproduced,
paraphrased or entered into any AI tool.

## What this course is (founder decision, 02/11/2026)

- **The designation requires Level 2.** Earning "CARSI Mould Remediation Practitioner" requires
  completing `level-2-mould-remediation-30ee3492`. One course per level, no duplicate teaching.
- This course (`mould-remediation-fundamentals`) is therefore the **designation assessment and
  credential wrapper**: `meta.prerequisite: "level-2-mould-remediation-30ee3492"`,
  `meta.courseRole: "designation-assessment-and-credential-wrapper"`. The requirement is stated in
  the description, the short description, lesson 1 and the practical task.
- Content is application, not teaching: integrated Australian case studies (scope to sign-off,
  deciding between conditions, common-failure analysis, the defensible job file, client and
  insurer communication), the practical task with rubric, and the final designation exam.
- Tier words used: Foundation → Practitioner → Advanced → Master. The course places this
  designation at the Practitioner tier (inferred from its name — founder to confirm; GAP MRP-006).

## How the Level 2 overlap was handled

- **No Level 2 or Level 3 lesson text was copied**, and no Level 2 topic is taught again. Each
  case study names the Level 2 lessons it applies, by title (e.g. "Level 2, 3.2 Negative air: how
  many air scrubbers?"). Every Level 2 lesson title cited (16 of its 17 lessons) was copied from the Level 2 seed entry.
- The first draft of this rebuild (written before the founder decision, never committed) had 13
  teaching lessons that re-taught Level 2 topics (biology and health, inspection, containment,
  negative air, PPE, sequence, drying, verification, documentation). They were **cut**. Two were
  **converted**: the documentation lesson became the job-file case study, and the health lesson's
  sourced points became the communication case study. Their sourced facts are reused only where a
  case study applies them.
- Six first-draft field tools that duplicated Level 2's own field downloads were deleted and
  replaced by four wrapper tools (tracker, area decision and failure check, job file and
  communication checklist, practical submission checklist).
- Removed and retired from the live seed structure (seed untouched; applies on promotion): modules
  `d6d8589f…` (biology), `09552b87…` (containment), `c643d4d8…` (PPE by condition); lessons
  `d7d85a55…`, `59bb42cc…`, `834cd0a0…`, `b0d93520…`, `0fe664ae…`, `6b2bb55e…`. Seven lesson ids
  and four module ids are kept and re-purposed; the final quiz id `ce8d62e3…` is kept with new
  questions.

## Ledger at a glance (02/11/2026)

| Status | Entries | Meaning |
| --- | ---: | --- |
| VERIFIED | 28 | An Australian regulator, government or health authority page was opened on 02/11/2026 (Exa search/fetch) and supports the claim; verbatim quote of 25 words or fewer. |
| JUSTIFIED | 7 | Our arithmetic (Hyland-Wexler psychrometrics at 101.325 kPa, P = V x I, areas, volumes, ACH, GST) on labelled illustrative scenario figures. |
| GAP | 10 | Not verifiable here. **Every GAP must be cleared before go-live.** |

Grades: VERIFIED A1 x1, A2 x26, A3 x1; JUSTIFIED A1 x1, A2 x5, B2 x1. No vendor page is used.

**SME checklist tag.** The brief asked for `check_by: "Phill (SME) — licensed S520"` on standards
GAPs. The validator requires `check_by` to be an ISO date (rule `check-by-not-iso`), so that value
would fail validation. The tag is carried in a separate field, **`check_owner: "Phill (SME) —
licensed S520"`**, which the validator accepts and ignores. Filter on it to build Phill's list.

## Open GAPs (10)

| ID | Owner | Claim (short) | Action |
| --- | --- | --- | --- |
| MRP-001 | Phill (SME) — licensed S520 | S520 cited as AS-IICRC S520:2025 (Level 2's edition). Level 3 also cites "ANSI/IICRC S520 2024 edition"; CLAUDE.md cites S520:2024. Confirm designation and edition | substantiate |
| MRP-002 | Phill (SME) — licensed S520 | How each area call in the three-room case maps to the standard's condition terms (taught in Level 2 1.1 and 2.3) | substantiate |
| MRP-003 | Phill (SME) — licensed S520 | The scope-to-sign-off job sequence matches the standard as taught in Level 2 | substantiate |
| MRP-004 | Phill (SME) — licensed S520 | Verification before containment comes down; tolerance and hold period for "at the reference" | substantiate |
| MRP-005 | Phill (SME) — licensed S520 | Containment and negative air before removal and before any air moves across visible growth | substantiate |
| MRP-006 | founder | Designation rules (Level 2 + practical 70% + final 80%) and Practitioner-tier placement need a published CARSI source | substantiate |
| MRP-027 | SME | Fit check each time a tight-fitting respirator goes on (SafeWork SA sentence not in the extract read) | substantiate |
| MRP-037 | SME | The six failure patterns as the common causes of callbacks (illustrative composite, no data) | substantiate or soften |
| MRP-038 | SME | Contemporaneous records are stronger evidence; acceptance is for the reviewing body | substantiate |
| MRP-048 | SME | Insurer decides cover; separating insured event from pre-existing issues | substantiate |

## Sources opened and graded (02/11/2026)

| Source | Grade | Supports |
| --- | --- | --- |
| WorkSafe Queensland — Managing mould | A2 | size bands (under 1, 1–10, over 10 m²); fix the cause; at-risk workers; communicate with owners and occupants |
| WorkSafe Queensland — Respiratory protective equipment | A2 | AS/NZS 1716 |
| SafeWork NSW — Mould at work | A2 | fix the moisture or it returns; 48-hour porous rule; waste as general rubbish after checking with council; final clean |
| SafeWork SA — Fit testing and fit checking of RPE | A2 | fit test before first wear |
| Safe Work Australia — Model WHS laws; Duties of a PCBU | A2 | all jurisdictions except Victoria; primary duty |
| WorkSafe Victoria — Information for employers: OHS Act 2004 | A2 | eliminate risks at the source |
| Safe Work Australia — Asbestos overview; NSW Government Asbestos — Tradespeople | A2 | cannot tell by looking; licence; pre-1990 buildings |
| enHealth (Australian CDC) — Potential health effects of mould | A2 | higher-risk groups; no exposure limit or health guideline value |
| NSW Health — Mould | A2 | most people will not have health problems from contact |
| Better Health Channel (Vic) — Mould and your health | A2 | occupational hygienist; seek medical advice |
| Queensland Health — Mould after a disaster | A2 | no dry brushing |
| NT Government — Mould growth and your health | A2 | spores released when disturbed or as a building dries out |
| ABCB — Condensation in buildings handbook (2023) | A2 | 70 %RH linked to mould growth; 7–22 kg/day water vapour |
| NSW Government — Voltage optimisation fact sheet | A3 | 230 V (+10% to −6%) |
| WorkSafe ACT — Residual current devices | A2 | RCD on portable gear and leads |
| ACCC — Consumer rights and guarantees | A2 | automatic consumer guarantees |
| ATO — How GST works | A1 | GST 10% |

Psychrometric values (Hyland-Wexler, 101.325 kPa): 21 °C/65 %RH = 10.09 g/kg, dew point 14.2 °C,
surface RH at 15 °C = 94.8%; 25 °C/72 %RH = 14.33 g/kg; 24 °C/55 %RH = 10.24 g/kg; 24 °C/70 %RH =
13.10 g/kg; 28 °C/42 %RH = 9.91 g/kg; 22 °C/50 %RH = 8.22 g/kg; 20 °C/55 %RH = 8.00 g/kg.

## Changes from the live seed entry

- **the unapproved CEC-accreditation wording removed** from the description and short description. The course
  is not in `data/seed/cec-approvals.json`.
- **Condition 1/2/3 definitions removed**, and the final-quiz question that restated a condition
  definition. The case study uses the terms as taught in Level 2 and leaves the mapping to Phill.
- **7 modules / 14 lessons → 4 modules / 7 case-study lessons**, each to the seven-part pattern,
  plus 4 practice checks and a 20-question final designation exam.
- **`durationHours` 5 → 2.5** (see "Hours" below). **S520 citation versioned** (GAP MRP-001).

## Diagram briefs

The coordinator builds the SVGs. Each is referenced from its lesson as
`/courses/mould-remediation-fundamentals/diagrams/<file>`. All follow the production-skill rules
(viewBox 0 0 800 H, CARSI wordmark top-right, footer "CARSI · CARSI Mould Remediation
Practitioner · schematic, not to scale"). Australian English and metric units throughout.

| File | Lesson | What it shows | Labels | Units |
| --- | --- | --- | --- | --- |
| `practitioner-designation-pathway.svg` | 1.1 | Left-to-right pathway: Level 2 completed → 4 case-study modules → practical task → final exam → designation; small tier strip below | "CARSI Level 2 Mould Remediation (prerequisite)", "Modules 1–4", "Practical task — pass 70%", "Final designation exam — pass 80%", "CARSI Mould Remediation Practitioner"; tier strip "Foundation → Practitioner → Advanced → Master" with Practitioner highlighted | % |
| `scope-to-signoff-timeline.svg` | 1.2 | Ten-day timeline of the Toowoomba job, one band per stage with the evidence recorded beneath | Day 1 Scope, Day 2 Plan, Days 3–4 Fix and contain, Days 4–5 Remove and clean, Days 5–9 Dry, Day 9 Verify, Day 10 Hand over; evidence chips "1.64 m²", "17.28 m³", "≈23 ACH", "6.3 A at 230 V", "$2,145.00 inc GST" | m², m³, ACH, A, V, AUD |
| `three-room-decision.svg` | 2.1 | Floor plan of a Newcastle unit (bathroom, bedroom, kitchen) with an evidence panel per room and the recorded decision | Panels "See / Measure / Connects / Smell / Decision"; bathroom "0.96 m² growth"; bedroom "wall 15 °C, room 21 °C 65 %RH → surface ≈95 %RH", "0.66 m² behind wardrobe"; kitchen "comparison area"; total "1.62 m²". Decision boxes say "Decision (Level 2 terms)" — no standard definitions | °C, %RH, m² |
| `six-common-failures.svg` | 2.2 | Six cards in a 3 x 2 grid, each: failure, what the file showed, the Level 2 lesson that covers it | Cause not fixed; Porous material kept ("86 h > 48 h"); Air moved before containment; Dust left; Rebuilt wet ("4.1 g/kg above the house"); No record | h, g/kg |
| `job-file-timeline.svg` | 3.1 | Geelong job file as a timeline from first call to handover; each event tagged with an evidence item number; a shaded gap "Days 3–7 not recorded" | Evidence chips "items 12–15: 4.3 m² removed", "item 31: mean 12.0 vs ref 11", "item 32: 8.2 vs 8.0 g/kg", "items 40–42: $2,640.00 + $418.00 inc GST" | m², g/kg, AUD |
| `four-audiences.svg` | 3.2 | "Job facts" box in the centre with four audience boxes around it | Director: scope, timing, price "$3,410.00 inc GST"; Staff / carer with asthma: "room closed — see your GP"; Parents: "what is being done — no 'safe level' promised"; Insurer assessor: "cause, 3.3 m², method, evidence plan; variation 0.96 m² approved in writing" | m², AUD |
| `rubric-scoring-walkthrough.svg` | 4.1 | Horizontal bar chart: five criteria, draft score and revised score per criterion, 70-point pass line | Criteria 1–5 short names; draft 12/15/11/12/12 = 62; revised 17/18/16/17/16 = 84; pass line "70"; callouts "add total + band + asbestos check", "add amps per circuit at 230 V", "AS/NZS 1716 + fit-test date; remove health advice", "add g/kg and readings vs reference" | points, A, V, g/kg |

## Hours

Evidenced volume: 7 lessons, 5,872 words ÷ 230 ≈ 25.5 min, plus 41 questions × 1.5 ≈ 61.5 min,
≈ 87 min in all. Floor 5.3 needs evidenced ≥ 50% of stated time, so stated time can be at most
about 2.9 h. `durationHours` is **2.5** (58% evidenced). The practical task itself will take a
candidate longer than the ~1 h this leaves for it; the audit cannot count it. COURSE_STANDARD §3.1
gives 8–14 h as typical for L2 — this course is an assessment wrapper on top of Level 2, so it is
short by design. Founder question below.

## Open founder questions

1. **`standardLevel`.** Both this course and Level 2 are tagged `L2-practitioner`. The standard
   defines L2 as "earns a designation, with a practical task", which fits this course; Level 2
   carries its own practical too. Should Level 2 stay L2, or should one of them move?
2. **Hours.** 2.5 h is honest for the evidenced content; if the founder wants the practical's real
   time reflected, the audit would need a way to count assessed practical time.
3. **Storefront `level` field** is still "Foundational" (kept from the live entry). With a Level 2
   prerequisite that reads wrong; the allowed values are a storefront decision.
4. **Practitioner tier placement** (GAP MRP-006): confirm this designation is the Practitioner
   tier, and publish the designation rules (Level 2 + practical 70% + final exam 80%).
5. **the unapproved CEC-accreditation wording in the live seed.** The phrase appears in the live entry for this
   course and in 12 other seed entries (including published `water-damage-essentials` and
   `ccw-carsi-truckmount-operations`), none of which is in `cec-approvals.json`. The guards pass it,
   but it reads as a CEC claim. This draft removes it; the seed is untouched.
6. **Intro captions URL.** `meta.introCaptionsUrl` (kept as instructed) is a signed HeyGen URL
   whose `Expires` parameter fell on 23/07/2026; it has likely expired.
7. **Intro video.** The kept intro video was made for the old teaching course and may describe
   content this course no longer teaches. Review before publish.

## Guard coverage (measured 02/11/2026)

No repository guard scans `data/courses/`. Banned phrases planted in the draft catalogue (a US
spelling of mould, the banned accreditation and approval phrasings, an absence claim about S520,
and a US voltage with US circuit framing) were caught **only** by the audit's `australian` and
`licence` floors, which read catalogue course copy but not the quiz or assessment files. Planted
in a `public/courses/…/field-tools/*.md` file they were caught by `check:iicrc-terminology`,
`check:iicrc-compliance` and `check:standards-claims`, but **not** by `check:au-english`.
`check:cec` (registry), `check:cec-surfaces` (app/src/components/lib) and `check:cec-course-brand`
(CEC-approved slugs only) do not scan this course by design. Quiz, assessment, ledger, this pack
and the spec were scanned by importing `findUsForms`, `scanText` and `evaluate` directly. Re-run
all guards after promotion into `data/seed/`, where they apply.

## Licence / production guardrails honoured

- `iicrcDiscipline: null`, `cecHours: 0`; no CEC claim; the credential is in `meta.designation`;
  no IICRC discipline acronym; separate from IICRC certification.
- Australian English, 230 V / 50 Hz / 10 A GPO / RCD, metric, AUD with GST, Safe Work Australia
  and state regulators, AS/NZS 1716. Equipment by class, not brand; no CCW brand.
- No medical diagnosis or advice; health statements sourced to public health authorities.
