# v1 upgrade blueprint — CARSI Building Science Foundations

**Course:** `psychrometry-building-science-for-drying` · title "CARSI Building Science
Foundations: Psychrometry, Moisture and Condensation" · Linear GP-471.
**Designation:** none (`meta.designation: null`; `iicrcDiscipline: null`; `cecHours: 0`).
**Standard:** `docs/content/COURSE_STANDARD.md`.
**Audit of the live seed entry:** 4/14 (missing meta, struct, depth, modchk, explain, dl, 7part,
words, visual, metric).
**Audit of the v1 draft:** 14/14 applicable floors (`practical` is n/a for an L1 course without a
designation): `node scripts/audit-course-depth.mjs --ci --seed-dir=data/courses/psychrometry-building-science-for-drying/v1-draft`, exit 0.

> Build spec. The authored draft is in `./v1-draft/` (a staging fixture, not `data/seed/`).
> Going live is gated: SME (Phill) sign-off → founder sign-off → promote into seed → manual
> per-course seed run.

## 1. Metadata (floor 5.1)

| Field | Live seed | v1 draft |
| --- | --- | --- |
| `meta.standard` | — | `v1` |
| `meta.standardLevel` | — | `L1-foundation` (founder to confirm, GAP PSY-122) |
| `meta.rolePaths` | — | `["water-and-drying", "new-technician"]` |
| `durationHours` | 8 | **4**, matched to evidenced volume (54 %); founder to confirm (GAP PSY-121) |
| `status` / `isPublished` | published / true | draft / false (staging fixture only) |
| `meta.retiredFromSeedOnPromotion` | — | 4 module ids, 27 lesson ids |
| kept | id, slug, title, `priceAud` 99, `cecHours` 0, `iicrcDiscipline` null, `designationProgram`, `pathway`, `introVideoUrl`, `thumbnailUrl`, `linearIssue` GP-471, `level`, `category`, tags | unchanged |
| dropped | `introCaptionsUrl` (expiring signed URL), old `humanReview` | — |

## 2. Structure (floor 5.2): 6 modules, each ≥3 lessons

| Module | Lessons |
| --- | --- |
| M1 Moist air | 1.1 Four numbers, RH misleads · 1.2 The calculation · Module 1 check |
| M2 Evaporation | 2.1 Vapour pressure difference · 2.2 Lever by climate · Module 2 check |
| M3 Materials | 3.1 Oven-dry MC, meters, WME · 3.2 EMC and the dry standard · Module 3 check |
| M4 Heat and condensation | 4.1 U-values, surface temperature · 4.2 Condensation check · Module 4 check |
| M5 Ventilation and envelope | 5.1 ACH, CO2 decay · 5.2 Ventilate or dehumidify · 5.3 NCC and NZ rules · Module 5 check |
| M6 Climate and monitoring | 6.1 Climate data · 6.2 Daily monitoring, grain depression · Module 6 check · Final knowledge check |

## 3. Per-floor work

- **`lessonPattern` / `lessonWords` / `visual` / `metricExample`:** all 13 teaching lessons use the
  seven parts, 609–722 words, one SVG referenced by filename (briefs in the research pack, not yet
  built), and a worked metric example (°C, %RH, hPa, g/kg, m², m³, m³/h, L/s, L/h, W, A at 230 V).
  Each ends with `<h3>Sources for this lesson</h3>` generated from that lesson's VERIFIED ledger rows.
- **`fieldDownloads`:** one per module under `public/courses/psychrometry-building-science-for-drying/field-tools/`:
  four-numbers card, evaporation lever worksheet, material moisture and dry-standard sheet,
  surface condensation check card, ventilation and air-change worksheet, climate and daily
  monitoring log.
- **`moduleChecks` / `explanations`:** 3 questions per teaching lesson (6/6/6/6/9/6), every one
  with an explanation; every option in a question has the same word count
  (`check:quiz-balance --enforce=psychrometry-building-science-for-drying` exit 0).
- **`finalQuiz`:** 20 questions, pass 80 % (quiz id `02f50dfb…` kept, questions replaced).
- **`practical`:** n/a at L1 without a designation. An optional applied task is in
  `v1-draft/psychrometry-building-science-for-drying-assessment.json` (5 x 20 points, pass 80 %);
  founder decides whether to publish it.
- **`australian` / `licence`:** AU English, 230 V / 50 Hz (both countries), metric, AUD; no CEC
  claim; no IICRC discipline acronym; S500 named only; no statement of what any standard requires.
- **NZ:** Building Code E2.3.4, E3.2 and E3.3.1, Healthy Homes heating and ground-moisture
  barrier rules, NZ 230 V / 50 Hz, NIWA climate data, all VERIFIED against legislation.govt.nz
  and NIWA.

## 4. Depth math (floor 5.3)

| Source | Volume | Evidenced min |
| --- | --- | --- |
| 13 lessons | 9,579 words ÷ 230 | ~41.6 |
| Checks (39 Q) + final (20 Q) | 59 Q × 1.5 | ~88.5 |
| **Total** | | **~130 min** |

At 4 h (240 min): 54 %. No content was added to inflate the number.

## 5. Remaining gated steps

1. Phill: clear the 4 SME GAPs (2 tagged licensed S500/S520, 2 field practice).
2. Founder: confirm hours (PSY-121) and level/pathway (PSY-122); decide on the applied task.
3. Coordinator: build the 13 SVGs and the lesson images (founder minimum §4.1); `npm run check:course-diagrams`.
4. Humanizer pass; founder sign-off.
5. Promote into `data/seed/` and retire the ids in `meta.retiredFromSeedOnPromotion`; re-run
   `check:course-standard`, `check:au-english`, `check:iicrc-terminology`,
   `check:iicrc-compliance`, `check:standards-claims`, `check:cec` there.
6. Manual per-course seed run; publish remains founder-gated.
