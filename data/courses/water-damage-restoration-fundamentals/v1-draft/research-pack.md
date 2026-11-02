# Research pack — CARSI Water Restoration Practitioner (v1 DRAFT)

**Status:** DRAFT v1 for Subject-Matter-Expert (SME) verification. This pack is now the human
summary of the course's **evidence ledger** — the machine record of every substantive claim:

`data/courses/water-damage-restoration-fundamentals/v1-draft/evidence/evidence-ledger.jsonl`
(pointed to by `meta.evidenceLedger`; schema and statuses per the `course-truth` and
`carsi-course-production` skills, evidence-layer template, BACKLOG #21).

Standards are referenced **by name only** — no IICRC (or other) standard text was reproduced or
entered into any AI tool, per the IICRC AI Use Policy and CLAUDE.md.

## Ledger at a glance (pilot pass, 02/11/2026)

| Status | Entries | Meaning |
| --- | ---: | --- |
| VERIFIED | 30 | An Australian regulator or government page was opened on 02/11/2026 and supports the claim (verbatim quote of 25 words or fewer in the ledger). |
| JUSTIFIED | 13 | Our own arithmetic from a published method (psychrometrics, P = V x I), or a teaching number the lesson labels illustrative. Reasoning is in the ledger. |
| GAP | 21 | Not yet verifiable from here. **Every GAP below must be cleared before the course goes live.** |

Grades (VERIFIED and JUSTIFIED entries): A1 x1, A2 x29, A3 x3, B2 x3, C3 x7. Every VERIFIED source is a
regulator, government agency or official body except Ausgrid's Electricity Safety site (B2, a
network operator's public safety pages); no vendor page is used as evidence.

Validate the ledger with `node scripts/audit/validate-ledger.mjs <ledger>` (it must exit 0), and
run `node scripts/audit/check-mutants.mjs` in the same session.

## Sources opened and graded (02/11/2026)

| Source | Grade | Supports |
| --- | --- | --- |
| Safe Work Australia — Principles that apply to WHS duties | A2 | eliminate, else minimise, so far as reasonably practicable; duties not transferable |
| Safe Work Australia — Duties of a PCBU | A2 | PCBU primary duty of care |
| Safe Work Australia — Manage the risks; Managing risks (hierarchy) | A2 | elimination is best; substitute, isolate, engineering next; administrative controls and PPE least effective |
| SafeWork NSW — Electrical inspection and testing | A2 | equipment inspected and tested by a competent person |
| SafeWork SA — Inspection and testing of electrical equipment | A2 | AS/NZS 3760:2022 (current edition named by the regulator) |
| WorkSafe ACT — Residual current devices | A2 | portable gear on an RCD; workplace RCD trips at no more than 30 mA (socket outlets up to 20 A) |
| NSW Government — Voltage optimisation fact sheet | A3 | Australian supply at 230 V (+10 % to −6 %) |
| Ausgrid, Electricity Safety — Electrical equipment | B2 | 50 Hz; 000 (network operator, not a regulator) |
| Electrical Safety Office Queensland — Safety switches | A3 | circuit breakers cut power on too much current |
| NSW Poisons Information Centre | A2 | 13 11 26 |
| SafeWork SA — Fit testing and fit checking of RPE | A2 | fit test before first use and after a facial change; fit check each time; hood-type alternative |
| Safe Work Australia — Model WHS laws | A2 | model laws implemented in all jurisdictions except Victoria |
| WorkSafe Victoria — OHS Act and regulations; Information for employers | A2 | OHS Act 2004 is Victoria's main WHS law; employers eliminate or reduce risks so far as reasonably practicable |
| NSW Resources Regulator — Facial hair and RPE fact sheet (March 2024) | A2 | facial hair prevents a seal; poor fit means less than the expected protection |
| Bureau of Meteorology — Definitions for 9am and 3pm statistics | A2 | dew point; relative humidity depends on temperature |
| ACCC — Consumer rights and guarantees | A2 | automatic guarantees; due care and skill; fit for stated purpose |
| Australian Taxation Office — How GST works | A1 | GST 10 % |

Psychrometric values were recomputed with the Hyland-Wexler formulation at 101.325 kPa:
24 °C/70 %RH = 13.10 g/kg (dew point 18.2 °C); 24 °C/55 %RH = 10.24 g/kg; 30 °C/60 %RH =
16.04 g/kg; 24 °C/45 %RH = 8.36 g/kg. The course calls this "specific humidity"; strictly it is
the humidity ratio (per kg of dry air), about 1 % different at these values — SME to decide
whether to rename it.

## Corrections made in this pass

- **Lesson 6.1:** 24 °C/55 %RH was given as about 9.9 g/kg; the arithmetic gives 10.2 g/kg, and
  lesson 4.1 gives the same condition as about 10 g/kg. Corrected to about 10.2 g/kg.
- **Lesson 3.2, Module 3 check, PPE card, assessment:** the draft treated a *fit check* as if it
  were a *fit test*. Regulators require a fit test before first use and a fit check each time the
  respirator goes on (SafeWork SA). Copy now says fit-tested and fit-checked.
- **Lesson 3.2, Module 3 check, PPE card:** "a leaking mask gives close to 0 % of its rated
  protection" was unsourced; replaced with the regulator's wording — a poorly fitting respirator
  does not give its expected level of protection (NSW Resources Regulator).
- **Lesson 3.2:** the facial-hair alternative is now "a respirator that does not rely on a face
  seal, such as a hood-type powered respirator" (SafeWork SA).
- **Lesson 3.1:** "an RCD is designed to trip at about 30 mA" is now "at a workplace, an RCD on a
  socket outlet up to 20 A must trip at no more than 30 mA" (WorkSafe ACT).
- **PPE card:** the hierarchy line now includes *isolate* alongside substitute and engineering
  (Safe Work Australia).
- **Review of PR #966 (CodeRabbit, each finding checked against the source before fixing):**
  - *Lesson 3.1:* said the model WHS laws were adopted by "your state regulator"; Victoria has not
    implemented them (Safe Work Australia). The Melbourne lesson now names Victoria's OHS Act 2004
    and WorkSafe Victoria (WRP-060 to WRP-062).
  - *Lesson 3.2, PPE card:* fit testing is also required after a facial change that could affect
    the seal, or a new make or model (SafeWork SA, WRP-059). The card's "facial hair breaks the
    seal" now matches the regulator: facial hair along the sealing surface stops it sealing.
  - *Module 3 check:* the PPE answer and explanations now keep the fit-check requirement.
  - *Lessons 5.x and 6.1, Module 5 and 6 checks, worksheet, assessment:* "inside g/kg lower than
    outside proves drying" was wrong. The evidence is a g/kg drop across the dehumidifier plus
    material readings trending to the dry standard; outside g/kg is context (WRP-063, WRP-064).
  - *Attribution:* electricitysafety.com.au is Ausgrid's site, not Energy Safe Victoria's;
    corrected and regraded A3 to B2.
- **Every S500 citation** now names its edition, ANSI/IICRC S500:2025, per the estate ruling
  (GP-560; `course-truth` Stage 5). No section number is cited.

## Open GAPs for the SME (21) — each must be cleared before go-live

| ID | Claim (short) | Action |
| --- | --- | --- |
| WRP-005 | Wet materials support microbial growth, corrosion, swelling, delamination over hours and days | substantiate |
| WRP-007 | The ordered restoration arc | substantiate |
| WRP-008 | Category 1/2/3 descriptions and example sources | substantiate (licensed S500:2025 copy) |
| WRP-009 | Category can worsen over time; when unsure treat as worse | substantiate (licensed S500:2025 copy) |
| WRP-010 | Stuck toilet flush puts about 15 L down (6 L pan + 9 L cistern) | **rewrite** (check against WELS-rated cisterns) |
| WRP-011 | Urine without faeces is typically Category 2 | substantiate (licensed S500:2025 copy) |
| WRP-012 | Class 1–4 descriptions, incl. Class 2 wicking to roughly 300 mm | substantiate (licensed S500:2025 copy) |
| WRP-014 | Humid tropics make the same class harder to dry | substantiate |
| WRP-021 | Hazards usually recorded in a SWMS or job safety analysis | substantiate |
| WRP-028 | Hazard catalogue (biological, structural, confined space, heat) | substantiate |
| WRP-029 | PPE sets by category; P2 as minimum for aerosols | substantiate (AS/NZS 1715 / state health) |
| WRP-035 | More than 1 m² of sewage-contaminated material triggers P2 | substantiate (CARSI threshold, unsourced) |
| WRP-036 | Instrument roles; confirm thermal hits with a meter | substantiate |
| WRP-037 | Protimeter, Tramex, Delmhorst, FLIR available in AU (checked 2026-07-09) | substantiate (re-check AU distributor, 230 V models) |
| WRP-040 | Dry standard from an unaffected reference; complete when reached and stable | substantiate (licensed S500:2025 copy) |
| WRP-041 | Timber equilibrium differs with local climate | substantiate |
| WRP-045 | Four drying levers; airflow without dehumidification stalls | substantiate |
| WRP-049 | Several outlets in a room often share one breaker | substantiate |
| WRP-050 | Mould hold-rule: no air movers on visible mould until clearance | substantiate (licensed mould-remediation standard, SME) |
| WRP-051 | Records made at the time are what an assessor or court accepts | substantiate (or soften) |
| WRP-058 | Most AU water work sits inside an insurance claim; insurers expect measured evidence | substantiate |

Illustrative teaching numbers (hose 2 L/min, 4.5 A / 1.2 A draws, $1200 AUD job) are JUSTIFIED
with low confidence and stay labelled illustrative in the lessons; confirm or replace with real
rating-plate and rate-card figures.

## Licence / production guardrails honoured

- `iicrcDiscipline: null`, `cecHours: 0`; no claim that the course earns or awards CECs; the
  credential is carried in `meta.designation` ("CARSI Water Restoration Practitioner"), a CARSI
  Southern Hemisphere Restoration Designation.
- Australian English, 230 V / 50 Hz / 10 A GPO / RCD, metric units, AUD, and AS/NZS + Safe Work
  Australia framing throughout.
- Standards named only, with edition; no standard text entered into any AI tool.
