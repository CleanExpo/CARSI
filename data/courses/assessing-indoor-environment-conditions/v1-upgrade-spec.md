# v1 upgrade blueprint — CARSI Indoor Environment Assessment Practitioner

**Course:** `assessing-indoor-environment-conditions` · title "CARSI Indoor Environment Assessment
Practitioner" · Linear GP-468.
**Designation:** CARSI Indoor Environment Assessment Practitioner (`meta.designation`;
`iicrcDiscipline: null`; `cecHours: 0`). **Standard:** `docs/content/COURSE_STANDARD.md`.
**Audit of the live seed entry:** 2/15 floors.
**Audit of the v1 draft:** 15/15 (`node scripts/audit-course-depth.mjs --ci --seed-dir=data/courses/assessing-indoor-environment-conditions/v1-draft`, exit 0).

> Build spec. The authored draft is in `./v1-draft/` (a staging fixture, not `data/seed/`).
> Going live is gated: SME (Phill) sign-off → clear all 6 GAPs → diagrams, cover and lesson images
> → founder sign-off → promote into seed → manual per-course seed run.

## 1. Metadata (floor 5.1)

| Field | Live seed | v1 draft |
| --- | --- | --- |
| `meta.standard` | — | `v1` |
| `meta.standardLevel` | — | `L2-practitioner` (earns a designation, carries a practical task) |
| `meta.rolePaths` | — | `["mould-and-indoor-air", "supervisor-and-estimator"]` |
| `durationHours` | 4 | **3.5**, matched to evidenced volume (58%); see §4 |
| `description` / `shortDescription` | called the course "CEC training" (no IICRC approval exists) and carried raw `&mdash;` entities | no CEC claim; AU + NZ scope; plain text |
| kept | slug, id, title, `priceAud` 99, `cecHours` 0, `iicrcDiscipline` null, designation and programme, `linearIssue`, `level`, category, thumbnail, intro-video-unlinked note | unchanged |

## 2. Structure (floor 5.2): 6 modules, each 3+ lessons

| Module | Lessons |
| --- | --- |
| M1 The Assessment Process and the Assessor's Role | 1.1 What an assessment is, and is not · 1.2 Source, pathway, receptor · Module 1 check |
| M2 Buildings, Climate and Moisture | 2.1 The building as a system in AU and NZ climates · 2.2 Psychrometry in metric · Module 2 check |
| M3 Instruments and What They Tell You | 3.1 Thermo-hygrometers and moisture meters · 3.2 Particle counters, CO2 and ATP · Module 3 check |
| M4 Sampling Strategy, Laboratories and Chain of Custody | 4.1 When sampling helps · 4.2 Accredited laboratories and chain of custody · Module 4 check |
| M5 Interpreting Readings and Knowing When to Stop | 5.1 Interpreting readings in context · 5.2 Stop and escalate · Module 5 check |
| M6 Reports That Stand Up | 6.1 Writing the report · 6.2 Talking to occupants, insurers and professionals · Module 6 check · Final designation exam |

12 teaching lessons (607–894 words), 6 module checks (6 questions each, pass 80%), final
designation exam (20 questions, pass 80%, quiz id `c53ece9f…` kept with new questions), practical
task (5 criteria × 20 points, pass 80%).

**Ids.** The course id, 6 module ids and 12 lesson ids are kept from the seed entry and
re-purposed. Retired on promotion (recorded in `meta.retiredFromSeedOnPromotion`): module
`fffb214e…`, lessons `309d59d1…` and `0a49cf84…`, and the old draft quiz `16f9c422…`
(`data/seed/assessment-drafts/`). The seed files themselves are untouched.

## 3. Per-floor notes

- **`lessonPattern` / `lessonWords` / `metricExample`:** all seven parts in order; worked metric
  example in every lesson (m², m³, m³/h, L/s, °C, %RH, g/kg, ppm with mg/m³, L, AUD with GST).
  Each lesson ends with `<h3>Sources for this lesson</h3>` generated from the VERIFIED ledger rows
  for that lesson; no GAP is listed.
- **`visual`:** every lesson carries an `<img>` to an SVG under
  `public/courses/assessing-indoor-environment-conditions/diagrams/`. **The SVGs are not built**
  (briefs in `v1-draft/research-pack.md`), as in the mould Practitioner draft. The floor passes on
  the tag; the files must exist and pass `check:course-diagrams` before go-live.
- **`fieldDownloads`:** one per module under `public/courses/assessing-indoor-environment-conditions/field-tools/`:
  scope and SPR worksheet, psychrometric reading log, instrument check card, sampling plan and
  chain-of-custody form, stop and escalate card, assessment report template.
- **`moduleChecks` / `explanations`:** 3 questions per teaching lesson, each with a practitioner
  "why"; options balanced (`check:quiz-balance --enforce` clean for this course).
- **`practical`:** `v1-draft/assessing-indoor-environment-conditions-assessment.json` — plan, carry
  out and report an assessment (supplied case: 1968 Ballarat rental, zone 7, unflued gas heater);
  NZ learners may relocate it to Christchurch.
- **`australian` / `licence`:** AU English, 230 V / 10 A GPO / RCD, metric, AUD with GST; NZ position
  stated alongside (HSWA 2015 s 36, WorkSafe NZ WES as guidance values, healthy homes standards,
  NZ Building Code E2/E3, IANZ, asbestos pre-2000, RCS 0.025 mg/m³, 111). No CEC claim, no IICRC
  discipline acronym, no AQF/RTO/"nationally recognised", NABERS or endorsement claim. S520 named
  only, no content claim.

## 4. Depth math (floor 5.3)

| Source | Volume | Evidenced min |
| --- | --- | --- |
| 12 lessons | ≈8,740 words ÷ 230 | ≈38 |
| Checks (36 Q) + final (20 Q) | 56 Q × 1.5 | 84 |
| **Total** | | **≈122 min** |

At 3.5 h (210 min): 58%. The practical task's real time is not counted by the audit. The L2 level
in COURSE_STANDARD §3.1 is "typically 8–14 h"; reaching that honestly needs lesson video or more
content, not a higher stated duration.

## 5. Remaining gated steps

1. Phill: clear the 6 GAPs (IEA-001 is `founder_only`, licensed S520) and confirm the four
   medium-confidence JUSTIFIED rows (research pack).
2. Build the 12 diagrams; run `npm run check:course-diagrams` and look at each on desktop and phone.
3. Make the cover image and 12 lesson images (existing plan only, no IICRC text in any prompt).
4. Optional: run `scripts/research/crosscheck.py` on the founder's Mac for the second-model record.
5. Founder sign-off → promote into `data/seed/` → per-course seed run. `cecHours` stays 0.

## 6. Guards that must stay green on every edit

`audit:course-depth --ci --seed-dir=…/v1-draft`, `check:au-english`, `check:iicrc-terminology`,
`check:iicrc-compliance`, `check:cec`, `check:standards-claims`, `check:evidence-ledgers`,
`check:quiz-balance --enforce=assessing-indoor-environment-conditions`, and (once SVGs exist)
`check:course-diagrams`.
