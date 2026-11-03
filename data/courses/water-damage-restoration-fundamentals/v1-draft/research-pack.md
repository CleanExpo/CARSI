# Research pack — CARSI Water Restoration Practitioner (v1 DRAFT)

**Status:** DRAFT v1 for Subject-Matter-Expert (SME) verification. This pack is now the human
summary of the course's **evidence ledger** — the machine record of every substantive claim:

`data/courses/water-damage-restoration-fundamentals/v1-draft/evidence/evidence-ledger.jsonl`
(pointed to by `meta.evidenceLedger`; schema and statuses per the `course-truth` and
`carsi-course-production` skills, evidence-layer template, BACKLOG #21).

Standards are referenced **by name only** — no IICRC (or other) standard text was reproduced or
entered into any AI tool, per the IICRC AI Use Policy and CLAUDE.md.

## Ledger at a glance (after SME sign-off, 02/11/2026)

| Status | Entries | Meaning |
| --- | ---: | --- |
| VERIFIED | 34 | A source was opened on 02/11/2026 and supports the claim (verbatim quote of 25 words or fewer in the ledger): 30 Australian regulator or government pages, plus 4 Australian distributor or retailer pages for instrument availability (WRP-065 to WRP-068). |
| JUSTIFIED | 38 | 13 are our own arithmetic from a published method (psychrometrics, P = V x I), or a teaching number the lesson labels illustrative. 21 are SME confirmations (Phill McGurk, 02/11/2026): 18 confirmed as written and 3 in SME-supplied wording. 4 are the instruments' battery power (WRP-069 to WRP-072), split out on 03/11/2026 because a stockist page verifies availability only (DECISIONS #54). Reasoning is in the ledger. |
| GAP | 0 | All 21 GAPs were cleared by the SME on 02/11/2026 (see "SME sign-off" below). |

Grades (VERIFIED and JUSTIFIED entries): A1 x1, A2 x29, A3 x3, B1 x25, B2 x3, C1 x4, C3 x7. Every VERIFIED
source is a regulator, government agency or official body except Ausgrid's Electricity Safety site (B2, a
network operator's public safety pages) and four Australian distributor or retailer pages (C1). Those
vendor pages are used only for the commercial fact they are the primary record of: that a brand is sold
in Australia and runs on batteries. The 21 SME confirmations are graded B1 (practitioner source).

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

## SME sign-off (02/11/2026)

**Reviewer:** Phill McGurk, founder and SME (DECISIONS #24, #47). **Date:** 2 November 2026.
He reviewed all 21 GAP claims in the v1 draft: **18 OK, 3 Fix, 0 Cut.**

- **OK, correct as written (18):** WRP-005, 007, 008, 009, 010, 011, 012, 014, 021, 028, 029, 035,
  040, 041, 045, 049, 050, 051. Each is now JUSTIFIED (SME confirmation). The S500 claims (WRP-007,
  008, 009, 011, 012, 040) were checked against his licensed ANSI/IICRC S500:2025 copy. WRP-050, the
  mould hold-rule, is an S520 check, and he confirmed it against his licensed ANSI/IICRC S520 copy.
  None is marked VERIFIED: an SME confirmation is not an opened source.
- **Fix (3), SME-supplied wording:**
  - **WRP-036, instrument roles.** Now reads: use each instrument for what it does best. A
    non-invasive meter shows where moisture is, a pin meter measures how wet a material is, a
    thermo-hygrometer reads the air, and a thermal camera shows temperature differences worth
    checking. Confirm anything the thermal camera suggests with a moisture meter before you act.
    Changed in lesson 4.1, the Module 4 check explanations, the moisture-map field tool and the
    moisture-instruments diagram.
  - **WRP-037, instrument brands.** Now reads: Protimeter, Tramex, Delmhorst and FLIR moisture
    instruments are battery-powered and widely available in Australia. The "230 V" framing is gone.
    Australian availability was re-checked on 02/11/2026 against an Australian distributor or
    retailer page for each brand (VERIFIED, WRP-065 to WRP-068). Battery power rests on the SME's
    answer (JUSTIFIED, WRP-069 to WRP-072), with the stockist's listing as the supporting record,
    since a stockist page verifies availability only (DECISIONS #54). No brand GAP remains.
  - **WRP-058, the insurance context.** The SME rejected "most water-damage work is inside an
    insurance claim". It now reads: much water-damage work runs through an insurance claim, but
    plenty doesn't. The excess is too high, the client is self-insured or uninsured, or they choose
    to pay privately. Whoever pays, measured drying records protect you and the client. Lessons 6.1
    and 6.2, the insurance-context diagram, and five quiz items (Module 1, Module 6 and the Final
    knowledge check) no longer assume a job is insured or that insurers require something as a
    blanket rule.
- **Status:** 0 open GAPs. The draft is ready for a promotion PR into `data/seed/` (DECISIONS #48:
  Water goes live first).

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
