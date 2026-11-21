# Research pack — CARSI Indoor Environment Assessment Practitioner (v1 DRAFT)

**Status:** DRAFT v1 for Subject-Matter-Expert review. **SME: Phill McGurk.** Not for go-live.
Linear GP-468. This pack is the human summary of the course's **evidence ledger**:

`data/courses/assessing-indoor-environment-conditions/v1-draft/evidence/evidence-ledger.jsonl`
(pointed to by `meta.evidenceLedger`; schema per the `course-truth` and `carsi-course-production`
skills and the evidence-layer template).

Standards are referenced **by name only** (AS-IICRC S520, in the description and Lesson 4.1, as the standard that takes over if
a job moves to remediation). No IICRC (or other) standard text was reproduced, paraphrased or
entered into any AI tool, and no claim is made about what any standard contains or omits.

## How the research was done (21/11/2026)

- Claims were written first, then each was checked against a primary source **opened in this
  session** with the Exa fetch tool (the session's direct web access could not resolve
  government hosts). Every VERIFIED row carries a verbatim quote of 25 words or fewer, copied from
  the fetched page text.
- The two-model cross-check runner (`scripts/research/crosscheck.py`) was **not** run: it needs the
  OpenRouter key from the founder's Mac Keychain, which this cloud session does not have. Every
  claim was instead opened by hand at its primary source. Run the runner on the Mac before go-live
  if the founder wants the second-model record.
- **Carried rows.** 14 VERIFIED rows reuse a quote from another CARSI course ledger, opened by an
  agent on the date shown (02/11, 16/11 or 20/11/2026), and were not re-opened today. Each carries
  `carried_from` naming the original row. They are all A1–A3 government or legislation pages.
- Two facts in the brief were corrected against the primary sources:
  - The 15-substance WEL transition to 1 December 2029 applies in **both Queensland and Victoria**
    (WorkSafe Queensland and WorkSafe Victoria pages), not Queensland alone.
  - For benzene, the WEL list starts on 1 December 2026 at the existing 1 ppm (3.2 mg/m³) 8-hour
    TWA, which continues until 1 June 2027, then falls to 0.2 ppm (0.7 mg/m³) (Safe Work
    Australia, 29/10/2026).
- No content was copied from LITMAS or any other provider. Scenarios, worked examples, field tools,
  questions and the practical task are original CARSI writing.

## Ledger at a glance

| Status | Rows | Meaning |
| --- | ---: | --- |
| VERIFIED | 67 | Primary source opened; quote ≤ 25 words. 53 opened 21/11/2026; 14 carried (see above). |
| JUSTIFIED | 31 | 15 are our own arithmetic on labelled illustrative figures (areas, volumes, g/kg and dew point by the Magnus approximation at 101.325 kPa, ppm to mg/m³, GST). 16 are CARSI method rules built on the verified sources (reasoning in each row). |
| GAP | 6 | Not verifiable here. **Every GAP must be cleared before go-live.** |

Grades: VERIFIED A1 ×4, A2 ×61, A3 ×1, B1 ×1 (AIOH, a professional body, used only to say it is
the peak body). JUSTIFIED rows are graded B2. No vendor page is used for any claim.

Validate: `node scripts/audit/validate-ledger.mjs <ledger>` (exit 0, 104 entries),
`node scripts/audit/check-mutants.mjs` (OK), `node scripts/check-evidence-ledger.mjs --report <ledger>`
(schema 0, orphan 0, founder 0, cut 0, gap 6).

## Sources opened and graded

| Source | Grade | Read | Rows |
| --- | --- | --- | --- |
| enHealth guidance, Potential health effects of mould in the environment (Australian Centre for Disease Control) | A2 | 21/11/2026 | IEA-002, 003, 012, 049, 050, 051, 052, 084 |
| Better Health Channel (Victorian Department of Health), Mould and your health | A2 | 21/11/2026 | IEA-009, 010 |
| Safe Work Australia, New WEL to apply from 1 December 2026 | A2 | 21/11/2026 | IEA-064, 065 |
| Safe Work Australia, Reduced WEL for benzene from 1 June 2027 (29/10/2026) | A2 | 21/11/2026 | IEA-066, 067 |
| WorkSafe Queensland, Workplace Exposure Limits | A2 | 21/11/2026 | IEA-068 |
| WorkSafe Victoria, Workplace exposure limits FAQ | A2 | 21/11/2026 | IEA-069, 071, 091 |
| WorkSafe New Zealand, Workplace exposure standards and BEIs | A2 | 21/11/2026 | IEA-072, 073, 074 |
| WorkSafe New Zealand, Dangers of carbon monoxide | A2 | 21/11/2026 | IEA-077 to 080, 082 |
| ABCB, NCC 2025 Volume One Part F6 (F6P3, F6V1) | A1 | 21/11/2026 | IEA-039 |
| ABCB, Indoor Air Quality Verification Methods handbook (NCC 2022 v4.1, May 2023) | A2 | 21/11/2026 | IEA-038, 040, 041 |
| ABCB, Understanding NCC climate zones | A2 | 21/11/2026 | IEA-015 to 018 |
| ABCB, NCC 2025 condensation mitigation changes | A2 | 21/11/2026 | IEA-019 |
| ABCB, Condensation in buildings handbook (2023) | A2 | 02/11/2026 (carried) | IEA-013, 020 |
| Bureau of Meteorology, climate statistics definitions | A2 | 21/11/2026 | IEA-026, 027 |
| Tenancy Services (NZ MBIE), healthy homes ventilation standard | A2 | 21/11/2026 | IEA-022, 023 |
| Tenancy Services (NZ MBIE), healthy homes moisture ingress and drainage standard | A2 | 21/11/2026 | IEA-024 |
| NZ Legislation, Building Code (Building Regulations 1992 Sch 1) | A1 | 20/11/2026 (carried) | IEA-021 |
| NZ Legislation, HSWA 2015 section 36 | A1 | 16/11/2026 (carried; Act contents re-opened 21/11/2026) | IEA-007 |
| NATA, What is accreditation? | A2 | 21/11/2026 | IEA-057, 058 |
| IANZ, What is accreditation? | A2 | 21/11/2026 | IEA-059, 060 |
| Mitchell et al., REACH trial ATP results, *Infection, Disease and Health* (peer-reviewed, Australian) | A2 | 21/11/2026 | IEA-046, 047, 048 |
| Safe Work Australia, Asbestos overview | A2 | 21/11/2026 | IEA-086, 087 |
| WorkSafe New Zealand, Asbestos in Aotearoa New Zealand | A2 | 21/11/2026 | IEA-089 |
| NSW Government asbestos website, When was asbestos banned | A2 | 02/11/2026 (carried) | IEA-088 |
| Safe Work Australia, WES for respirable crystalline silica | A2 | 21/11/2026 | IEA-090 |
| WorkSafe New Zealand, Silica dust in the workplace | A2 | 21/11/2026 | IEA-093 |
| WorkSafe New Zealand, engineered stone prevention activities | A2 | 02/11/2026 (carried) | IEA-092 |
| AIOH home page | B1 | 21/11/2026 | IEA-094 |
| Product Safety Australia (ACCC), Carbon monoxide safety | A2 | 02/11/2026 (carried) | IEA-083 |
| WorkSafe Victoria, Bushfire recovery asbestos clean-up | A2 | 02/11/2026 (carried) | IEA-103 |
| Dept of Health, Bushfire smoke fact sheet (PM2.5) | A2 | 02/11/2026 (carried) | IEA-043 |
| NSW Government, Voltage optimisation fact sheet (230 V) | A3 | 02/11/2026 (carried) | IEA-035 |
| WorkSafe ACT, Residual current devices | A2 | 02/11/2026 (carried) | IEA-036 |
| NZ Legislation, Electricity (Safety) Regulations 2010 (230 V) | A1 | 02/11/2026 (carried) | IEA-037 |
| WorkSafe New Zealand, Notify WorkSafe (111) | A2 | 02/11/2026 (carried) | IEA-085 |
| ATO, How GST works | A2 | 02/11/2026 (carried) | IEA-062 |

## Exposure figures: how the course uses them

Every exposure figure in the course is source-tagged with jurisdiction, date, units and averaging
time, and is stated to be a workplace limit, **never** a residential safe-occupancy or clearance
threshold (IEA-041, IEA-071, IEA-076).

| Figure | Jurisdiction / source | Applies | Used in |
| --- | --- | --- | --- |
| WES → WEL; harmonised transition ends 30/11/2026; WEL from 1/12/2026 as implemented | Australia, Safe Work Australia | 1/12/2026 | L5.1 |
| Benzene 1 ppm (3.2 mg/m³) 8-h TWA until 1/6/2027; 0.2 ppm (0.7 mg/m³) from 1/6/2027 | Australia, Safe Work Australia (29/10/2026) | dated | L5.1, Q5, final |
| 15 substances on transition until 1/12/2029 | Queensland (WorkSafe Qld); Victoria (WorkSafe Vic) | to 1/12/2029 | L5.1, Q5, final |
| 9 reviewed chemicals start in WEL at current WES values | Australia (WorkSafe Vic FAQ) | 1/12/2026 | L5.2 |
| RCS 0.05 mg/m³ 8-h TWA | Australia, Safe Work Australia | current | L5.2, final |
| RCS 0.025 mg/m³ | New Zealand, WorkSafe NZ (Nov 2023) | current | L5.2 |
| CO 20 ppm WES-TWA (8 h); 35 ppm symptom line | New Zealand, WorkSafe NZ (16th edition value GAP IEA-081) | current | L5.2, Q6 |
| NZ WES are guidance values, 16th edition from July 2026 | New Zealand, WorkSafe NZ | July 2026 | L5.1 |
| CO2 850 ppm 8 h; CO 90 ppm 15 min (F6V1, Class 2, 3, 5, 6, 9b, 9c, Class 4 part) | Australia, NCC 2025 Vol One | NCC 2025 | L3.2, L5.2 (building verification method, not a health limit) |

## Open GAPs — SME / founder sign-off needed before go-live

| Row | Claim | Owner | Action |
| --- | --- | --- | --- |
| IEA-001 | Edition of AS-IICRC S520 named (nominative only); `founder_only` | Phill (SME) — licensed S520 | substantiate |
| IEA-054 | Interpreting spore-trap results against outdoor and unaffected-indoor comparison samples; spore-trap method limits | Phill (SME); occupational hygienist review | substantiate |
| IEA-056 | New Zealand public-health position on household mould testing (lesson currently says "check your public health service and local council") | Phill (SME) | substantiate |
| IEA-070 | Queensland amending regulation for the WEL list and 15-substance transition actually made (WorkSafe Qld guidance states it; a practitioner source said on 12/11/2026 the regulation was not yet on the register) | Phill (SME); founder | substantiate |
| IEA-081 | NZ CO WES-TWA still 20 ppm in the 16th edition (July 2026) | Phill (SME) | substantiate |
| IEA-102 | Named instrument models available in AU and NZ (draft names types only; any brand needs a dated C1 availability check) | Phill (SME) | substantiate |

Also for the SME to confirm (JUSTIFIED, medium confidence): IEA-004 (four-stage method), IEA-008
(source-pathway-receptor frame), IEA-033 (thermo-hygrometer practice), IEA-044 (particle counter
limits).

## Diagram briefs (SVGs not yet built)

Each teaching lesson references one SVG under
`public/courses/assessing-indoor-environment-conditions/diagrams/`. They are **not built** in this
draft. Build each to the production-skill diagram rules (viewBox `0 0 800 H`, CARSI wordmark
`<image x="656" y="14" width="120" height="31">` top-right, footer
`CARSI · Indoor Environment Assessment Practitioner · schematic, not to scale`) and pass
`npm run check:course-diagrams`. No IICRC text or mark in any diagram.

| File | Lesson | Brief |
| --- | --- | --- |
| assessment-four-stages.svg | 1.1 | Written question → observe → measure → interpret → recommend → report, one card each, with "record each stage separately". |
| source-pathway-receptor.svg | 1.2 | Auckland case: source (Unit 4 shower leak), pathway (shared cavity, gaps at power points), receptor (Unit 5 occupant); under each link the reading that tests it. |
| building-moisture-system.svg | 2.1 | One house section twice: zone 2 humid summer (vapour inward to air-conditioned surfaces) and zone 7 winter (vapour outward to cold walls and ceiling); sources: people 7–22 kg/day, leaks, ground. |
| dew-point-and-surfaces.svg | 2.2 | Vertical °C scale: room 18 °C, dew point 12.4 °C, ceiling corner 12 °C in the shaded condensation band; side panel 9.0 vs 8.5 g/kg. |
| moisture-reading-grid.svg | 3.1 | 3.0 m wall elevation, points every 0.5 m at 300 mm and 1,000 mm (P1–P7 ×2), wet zone 1.5 m × 0.6 m, separate reference point on hallway wall. |
| indicator-instruments.svg | 3.2 | Three cards (CO2 monitor, particle counter, ATP luminometer): "can tell you" / "cannot tell you". |
| sampling-decision.svg | 4.1 | Decision path: mould visible? → written question? → comparison planned? → sample plan; "no" branches end at "do not sample". |
| chain-of-custody.svg | 4.2 | Timeline: label and photo → collect (time, flow) → hand-over to courier (signed) → laboratory receipt (signed) → report attached as issued. |
| limits-are-not-thresholds.svg | 5.1 | Two columns: workplace limits (workers, jurisdiction, date, units, averaging time) vs home assessment (references, outdoors, trends), divided by "not a residential threshold"; source-tag example below. |
| stop-and-escalate.svg | 5.2 | Four stop cards: CO, suspect asbestos, silica dust, outside competency; each with first action and referral; 000 / 111 in the header. |
| report-structure.svg | 6.1 | Ten-part report spine; facts (observations, measurements, lab results) on the left, opinion (interpretation, recommendations) on the right, arrows from facts to opinion. |
| one-finding-many-readers.svg | 6.2 | One finding card centre; five readers around it (occupant, owner or landlord, property manager, insurer, occupational hygienist or IEP), "same facts, different words". |

## Not done in this draft (COURSE_STANDARD §4.1 minimum deliverable)

- Cover image and the 12 lesson-specific images (OpenAI image model on an existing plan) — not
  made. `thumbnailUrl` is the existing seed image.
- The 12 diagrams above — briefs only.
- Narration — optional, needs a founder-approved cost quote.
