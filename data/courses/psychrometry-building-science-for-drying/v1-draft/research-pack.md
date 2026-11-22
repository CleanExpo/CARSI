# Research pack — CARSI Building Science Foundations (v1 DRAFT)

**Course:** `psychrometry-building-science-for-drying` · Linear GP-471.
**Status:** DRAFT v1 for Subject-Matter-Expert review. **SME: Phill McGurk.** This pack is the
human summary of the course evidence ledger:

`data/courses/psychrometry-building-science-for-drying/v1-draft/evidence/evidence-ledger.jsonl`
(pointed to by `meta.evidenceLedger`; schema per the `course-truth` and `carsi-course-production`
skills).

Standards are referenced **by name only**. ANSI/IICRC S500:2025 is named once, in the description.
No IICRC (or other) standard text was read, reproduced, paraphrased or entered into any AI tool.
The psychrometric formulas come from public US National Weather Service worksheets, NIST data and
the CC BY 4.0 ABCB Condensation in buildings handbook, never from a standard.

## What this course is

- The live seed entry is published (10 modules, 41 lessons, 8 h stated) and met 4 of 14 Course
  Standard floors. This draft rebuilds it to Course Standard v1 as a **staging draft only**.
  `data/seed/` is untouched; the live course stays as it is until SME and founder sign-off.
- Level `L1-foundation`, role paths `water-and-drying` and `new-technician`. No designation
  (`meta.designation: null`), `iicrcDiscipline: null`, `cecHours: 0`, price AUD 99 unchanged.
- It teaches the physics under drying. The CARSI Structural Drying Practitioner draft
  (`meta.foundationCourse` points here) applies it with equipment, power budgets and electrical
  safety, so this draft does not re-teach WHS, equipment selection or electrical-safety rules.
- Brief points from GP-471 honoured: WME and g/kg are taught as process observations; no
  absolute EMC target (lesson 3.2 sets the dry standard from unaffected material on the job);
  moisture findings are kept separate from mould presence and exposure (lessons 1.1, 3.2, 4.2,
  the assessment and the field tools); condensation and thermal bridging are shown in a
  Queensland (Brisbane, climate zone 2) summer and a contrasting Canberra (climate zone 7) winter.

## Structure

| Module | Teaching lessons | Check |
| --- | --- | --- |
| 1 Moist air | 1.1 The four numbers, and why RH alone misleads · 1.2 Doing the calculation | 6 Q |
| 2 Evaporation | 2.1 The vapour pressure difference · 2.2 Choosing the lever by climate | 6 Q |
| 3 Materials | 3.1 Oven-dry MC, meters and WME · 3.2 EMC: no universal dry number | 6 Q |
| 4 Heat and condensation | 4.1 U-values and inside surface temperature · 4.2 The condensation check | 6 Q |
| 5 Ventilation and envelope | 5.1 ACH and CO2 decay · 5.2 Ventilate or dehumidify · 5.3 NCC and NZ rules | 9 Q |
| 6 Climate and monitoring | 6.1 BoM and NIWA climate data · 6.2 Daily monitoring and grain depression | 6 Q + final 20 Q |

13 teaching lessons (609 to 722 words each, 9,579 words), 39 module-check questions, a
20-question final (pass 80 %), six field tools, and an optional applied task (5 x 20 points,
pass 80 %). The applied task is not a Course Standard floor for an L1 course without a
designation; the founder decides whether to publish it.

## Ids: reused and retired

- Course id `3e86eb42…` kept. Module ids kept and re-purposed: `1ce29a59…` (M1), `d9e45b1d…`
  (M2), `6363915c…` (M3), `620582e3…` (M4), `7ad62d39…` (M5), `7e55944e…` (M6).
- Lesson ids kept and re-purposed (13): `596778a2…`, `12a4443e…`, `d22b54e2…`, `de581cf9…`,
  `f48efa5a…`, `9d6f184b…`, `e7dd8da4…`, `fce81c98…`, `72261aa3…`, `384cc2c0…`, `102a0311…`,
  `2581fed0…`, `fb69b393…`. Final quiz lesson `48c428f8…` and final quiz id `02f50dfb…` kept,
  with new questions.
- New ids: six module-check lessons and six module-check quizzes (name-based UUIDs), and the
  assessment `4c450cd2…`.
- Retired on promotion (listed in `meta.retiredFromSeedOnPromotion`): 4 modules (`297c6f0d…`,
  `c8ff8ddf…`, `0a0f12be…`, `ee924aa3…`) and 27 lessons (the old reference cards, the safety and
  standards-map lessons, and the topics merged into the 13 kept lessons).
- Dropped from the draft meta: `introCaptionsUrl` (an expiring signed HeyGen URL) and the old
  `humanReview` record (it described the live copy). `introVideoUrl`, `thumbnailUrl`, `pathway`,
  `priceComparison` and `linearIssue` kept.

## Ledger at a glance (21/11/2026)

| Status | Rows | Meaning |
| --- | ---: | --- |
| VERIFIED | 79 | Primary source opened on 21/11/2026 (Exa fetch or search contents); quote of 25 words or fewer copied from the opened text. |
| JUSTIFIED | 38 | CARSI arithmetic with working shown (NWS formulas at 1013.25 hPa, ideal gas law, P = V x I, ACH, MC, EMC lookups), labelled illustrative scenario figures, or a mechanism explained in CARSI's words. |
| GAP | 6 | Not verifiable by an agent. **Every GAP must be cleared before go-live.** |

Each lesson ends with "Sources for this lesson", generated from that lesson's VERIFIED rows only.
The research route in the skill (`scripts/research/crosscheck.py`, two models via OpenRouter) was
not run: its key lives in the founder's Mac Keychain and is not available in this cloud session.
Every VERIFIED row was instead opened directly and its quote copied from the page.

Formula check: the NWS formulas reproduce the ABCB handbook's own worked example (7 °C and 70 %RH
gives a dew point of 1.9 °C and 30.0 %RH once heated to 20 °C, row PSY-017), which is the
evidence that they are good enough for this course.

## Open GAPs (6)

| ID | Owner | Claim (short) | Action |
| --- | --- | --- | --- |
| PSY-033 | Phill (SME), licensed S520 | Stop and plan under mould training before any air mover runs where growth is visible or suspected (lesson 2.2, field tool 2) | substantiate |
| PSY-066 | Phill (SME), field practice | Condensation-or-leak pattern questions (lesson 4.2, field tool 4) | substantiate |
| PSY-115 | Phill (SME), field practice | A collapsing depression while still wet points to the unit (lesson 6.2, field tool 6) | substantiate |
| PSY-118 | Phill (SME), licensed S500 | The course framing (dry standard from unaffected material, g/kg monitoring) sits comfortably with ANSI/IICRC S500:2025, named in the description | substantiate |
| PSY-121 | founder | Stated length 4 h (live entry says 8 h) | substantiate |
| PSY-122 | founder | `L1-foundation`, and the foundation step for the Water and Structural Drying Practitioner designations | substantiate |

JUSTIFIED rows the SME should read with care (medium or low confidence): PSY-030 (airflow and the
boundary layer), PSY-038 and PSY-039 (pin meter calibration and WME; only vendor pages state
them), PSY-045 (dry-standard method wording), PSY-054 (Rsi = 0.13 m²·K/W assumption; ISO 6946 is
paid and was not opened), PSY-065 (lining near 22 °C in a room held at 21 °C, a labelled
estimate), PSY-114 (refrigerant depression shrinking as the room dries).

## Sources opened and graded (21/11/2026)

| Source | Grade | Rows |
| --- | --- | ---: |
| ABCB, Condensation in buildings handbook, NCC 2025 edition (CC BY 4.0) | A1 | 22 |
| ABCB NCC Navigator, Understanding NCC climate zones | A1 | 6 |
| Bureau of Meteorology: 9am/3pm definitions; Brisbane 040913; Canberra Airport Comparison 070014 | A1 | 14 |
| NZ Legislation: Building Regulations 1992 Schedule 1; Healthy Homes Standards 2019; Electricity (Safety) Regulations 2010 | A1 | 8 |
| NIST: SP 811 Appendix B.8; CODATA gas constant; Chemistry WebBook (water) | A1 | 6 |
| US National Weather Service wxcalc worksheets (vapour pressure, mixing ratio) | A2 | 3 |
| USDA FPL Wood Handbook ch. 4 (2021 and 2010) | A2 | 7 |
| YourHome: Glazing; Condensation | A2 | 6 |
| Batterman (2017) and McNeill and others (2022), open-access peer-reviewed | A2 | 4 |
| NSW Government voltage fact sheet; NIWA National Climate Database | A2 | 2 |
| Electricity Safety (AU 50 Hz) | B2 | 1 |

No vendor page supports a VERIFIED row. The Protimeter WME guide is named only as the best
available source on two JUSTIFIED rows.

## Not done (needs the coordinator or founder)

1. **Diagrams.** Each lesson references an SVG under
   `public/courses/psychrometry-building-science-for-drying/diagrams/` that does not exist yet.
   Briefs (all numbers are in the lesson's "Do it in metric" and the ledger):
   - `four-numbers.svg` (1.1): the Brisbane lounge, two readings, same 13.3 g/kg and 18.4 °C dew point.
   - `vapour-pressure-steps.svg` (1.2): T → es → e → w chain, with the dew-point return arrow.
   - `vapour-pressure-difference.svg` (2.1): wet wall layer at 23.4 hPa versus room air at 16.4 hPa.
   - `two-levers-by-climate.svg` (2.2): Canberra 0.3 / 4.6 / 10.2 hPa; Brisbane 8.4 / 16.8 / 17.2 hPa.
   - `oven-dry-method.svg` (3.1): 58.4 g wet, 50.0 g dry, 16.8 % MC.
   - `emc-by-room.svg` (3.2): three rooms, 8.5 / 11.7 / 16.0 % EMC.
   - `window-surface-temperature.svg` (4.1): U 6.2 gives 3.4 °C, U 3.1 gives 10.7 °C.
   - `condensation-check-two-climates.svg` (4.2): Canberra window and Brisbane cooled wall.
   - `co2-decay.svg` (5.1): 1800 to 900 ppm in 30 min, outdoor 420 ppm, 2.1 ACH against 5.4 rated.
   - `ventilate-or-dehumidify.svg` (5.2): Brisbane 14.9 vs 14.2 g/kg; NZ 10.3 vs 5.7 g/kg.
   - `envelope-au-nz.svg` (5.3): NCC zones 1 to 8 strip with example cities; NZ subfloor barrier and 18 °C.
   - `climate-two-cities.svg` (6.1): mean minimum against estimated dew point, Brisbane and Canberra.
   - `grain-depression.svg` (6.2): inlet 11.19, outlet 6.49, depression 4.70 g/kg.
   Build to the diagram rules in the skill (800-wide viewBox, CARSI logo, nothing cut off) and run
   `npm run check:course-diagrams`. The `visual` floor passes today on the `<img>` tag alone.
2. **Lesson images and cover.** The founder minimum (19/11/2026) asks for a lesson-specific
   OpenAI image in every teaching lesson, captioned "AI illustration, not a site photo". None were
   made (no image generation was run in this session). The existing `thumbnailUrl` is kept.
3. **Humanizer pass** and human sign-off.
4. **Promotion** into `data/seed/` (catalogue entry, quiz, optional assessment), retiring the ids
   above, then re-running every guard against the seed.
