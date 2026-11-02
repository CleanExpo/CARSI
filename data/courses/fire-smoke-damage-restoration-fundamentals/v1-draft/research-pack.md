# Research pack — CARSI Fire & Smoke Restoration Practitioner (v1 DRAFT)

**Status:** DRAFT v1 for Subject-Matter-Expert review. **SME: Phill McGurk** (holds the licensed
S500, S520, S700 and S540; DECISIONS #24). This pack is the human summary of the course's
**evidence ledger**:

`data/courses/fire-smoke-damage-restoration-fundamentals/v1-draft/evidence/evidence-ledger.jsonl`
(pointed to by `meta.evidenceLedger`; schema per the `course-truth` and `carsi-course-production`
skills). Phill's claim checklist is generated from it:
`docs/sign-off/fire-smoke-restoration-practitioner-sme-checklist.md`.

Standards are referenced **by name only** ("aligned to the principles of ANSI/IICRC S700:2025").
No IICRC or RIA standard or manual text was read, reproduced, paraphrased or entered into any AI
tool. The only S700 fact used is publication metadata (first edition, 2025) from iicrc.org.

## What this course is

- **Full credential course.** DECISIONS #27 ("Designation = Level 2") applies only where a
  matching Level 2 course exists. CARSI has no Level 2 fire course (the seed holds only the
  $29 *Introduction to Smoke and Soot Damage Restoration*), so this course teaches and assesses
  the discipline: 6 modules, 12 teaching lessons, 6 module checks (7 questions each), a
  12-question final check and a practical task. **Pass mark 80 %** for every module check, the
  final knowledge check and the practical task (founder decision 2 November 2026; FSP-003). `meta.courseRole` records this.
- **Designation:** `meta.designation` = "CARSI Fire & Smoke Restoration Practitioner",
  `iicrcDiscipline: null`, `cecHours: 0`. No IICRC discipline acronym is used anywhere.
- **Optional foundation:** `asbestos-awareness-for-restoration-technicians` (per
  `data/seed/designations.json`), recommended in lesson 1.1.
- **Price unchanged** (A$99). **Duration stays at 4 hours** (founder decision 2 November 2026,
  FSP-122 now JUSTIFIED). The earlier draft cut it to 3 hours because only about 111 minutes were
  evidenced (46 % of 4 h). This revision adds about 3,750 words of worked AU/NZ scenarios, field
  walk-throughs, decision points and common mistakes, plus one question per module check:
  evidenced time is now 57 % of 4 hours (audit 14/14).
- **Four job types** run through the lessons: house fire, kitchen fire, bushfire-affected
  building, and commercial (café under apartments, office floor, commercial kitchen).
- **Bushfire scope.** Bushfire ash and asbestos-in-bushfire content is taught only from AU/NZ
  regulators and health authorities (NSW EPA, SafeWork NSW, WorkSafe Victoria, EPA Victoria,
  NSW Health, the Better Health Channel, the Australian CDC, WorkSafe NZ). Lesson 1.1 states that
  CARSI's nominative S700:2025 alignment is claimed for the restoration method only, not for that material (FSP-128).
- **Australia and New Zealand** throughout (DECISIONS #35, SKILL.md §5a on PR #979). No US
  framing: the old "not covered by United States wildfire documentation" line is gone.

## Structure and ID reuse (live seed untouched; applies on promotion)

| Module (id kept) | Lessons (ids kept) |
| --- | --- |
| 1 Course objectives and the arc (`cb15d6f6…`) | 1.1 `95cfc7a4…`, 1.2 `419c93db…` |
| 2 Fire, smoke and soot behaviour (`80a88357…`) | 2.1 `0143fa19…`, 2.2 `78a8d316…` |
| 3 Hazardous materials, AU and NZ (`e44d314c…`, was live Module 7) | 3.1 `913c19c7…`, 3.2 `6fa2f113…` |
| 4 Residue, source removal and cleaning (`6ca9f4ba…`) | 4.1 `bad52a73…`, 4.2 `ae44f620…` |
| 5 Corrosion, contents and HVAC (`4d2ed64e…`) | 5.1 `7f332f1c…`, 5.2 `2d75a558…` |
| 6 Odour control, verification and job file (`7769ae6d…`) | 6.1 `d275b201…`, 6.2 `ce6abcef…` |

Retired from the live structure (recorded in `meta.retiredFromLive`): module `9e3a0974…`; lessons
`81987a19…` and `2620b4f3…`. The live final-quiz id `ce2e5ad2…` is kept with new questions;
module-check quiz ids are new. The live seed had 7 modules (over the v1 maximum of 6) and scored
2/14.

## New Zealand facts added (all VERIFIED against worksafe.govt.nz, legislation.govt.nz, epa.govt.nz or other NZ government sources)

| Topic | New Zealand position | Australian position in the same lesson |
| --- | --- | --- |
| Law and regulator | HSWA 2015, WorkSafe NZ; PCBU duty | model WHS laws (not Victoria: OHS Act 2004) |
| Asbestos build-date rule | built or renovated before **2000** | built or renovated before the **31 Dec 2003** ban (most likely before 1990); register for workplaces built before 31 Dec 2003 (Qld 1989) |
| Fire-damaged asbestos | reclassify as friable → Class A | NSW EPA: friable, Class A; WorkSafe Vic: assume friable or competent-person inspection |
| Licence classes | Class A / Class B; no licence ≤ 10 m² non-friable, cumulative over the project, no splitting (reg 56) | Class A / Class B; ≤ 10 m² non-friable (ACT: licence for any) |
| Emergency asbestos removal | licensed removalist notifies WorkSafe immediately by phone, writing within 24 h | — |
| Lead paint | presume if built in the **1980s or earlier** (WorkSafe NZ, Health NZ) | many homes before **1970** |
| Silica (RCS) | **0.025 mg/m³** since Nov 2023; WES advisory (MBIE) | **0.05 mg/m³**, mandatory, unchanged at the 1 Dec 2026 WEL switch |
| CCA ash | EPA (ERMA) guidance: do not burn CCA; disposal → check council (GAP FSP-071) | up to 10 % metals; wet, shovel, bag, landfill |
| Ozone | WES **ceiling 0.1 ppm (0.2 mg/m³)** | **peak 0.1 ppm (0.2 mg/m³)** |
| Notifiable events | notify as soon as possible, fastest means (HSWA s56); keep records 5 years | notify immediately; preserve the site |
| Electrical | 230 V / 50 Hz (Electricity (Safety) Regs 2010); RCD required in damp conditions; test-and-tag **not** a legal requirement | 230 V; RCD for portable gear (WorkSafe ACT); AS/NZS 3760:2022 |
| Poisons / emergency | 0800 764 766 / 111 | 13 11 26 / 000 |
| Consumer law | Consumer Guarantees Act 1993: reasonable care and skill, fit for purpose | ACL: acceptable care and skill, fit for stated purpose |
| Insurance | Fair Insurance Code: acknowledge in 5 business days, decide in 10; ICNZ: contact the insurer before any work | General Insurance Code of Practice; insurer in breach if its service supplier does not comply |

## Ledger at a glance (02/11/2026)

| Status | Entries | Meaning |
| --- | ---: | --- |
| VERIFIED | 106 | Source opened 02/11/2026 (Exa search/fetch), verbatim quote ≤ 25 words. 29 are New Zealand sources; 22 were reused from the Water, Mould and WHS Fundamentals ledgers (`reused_from`). FSP-130 to FSP-160 add the bushfire and scenario sources. |
| JUSTIFIED | 24 | Our arithmetic (areas, volumes, P = V × I, psychrometrics, GST) on labelled illustrative figures, CARSI's AUD pricing policy, the nominative S700 citation, the Australian asbestos assumption rule (FSP-126), scenario applications of sourced rules (FSP-129, 151, 154), the bushfire-scope statement (FSP-128) and the 4-hour duration (FSP-122). |
| GAP | 31 | Not verifiable here. **17 are standards-related** (`standards_related: true`; 16 against S700, 1 against S520); 13 are field-practice claims (2 new: FSP-155 test patch judged dry, FSP-161 white-cloth wipe test); 1 is a founder decision (FSP-003). **Every GAP must be cleared before go-live.** |

Grades: VERIFIED A1 ×6, A2 ×89, A3 ×7, B2 ×4; JUSTIFIED B2 ×21, B3 ×1, C3 ×2. No vendor page is used as
evidence. The B2 sources are the NIST FireDOC abstract (Cider 1992), Ausgrid's safety site (000),
and the CARSI Ozone course (repo source, for consistency).

Validate with `node scripts/audit/validate-ledger.mjs <ledger>` (0 violations) and
`node scripts/audit/check-mutants.mjs` (passes); a planted VERIFIED entry with no source was
rejected (exit 1) in the same session.

**SME tag.** GAP rows carry `check_owner` ("Phill (SME) — licensed S700", "… licensed S520",
"… field practice" or "Phill (founder)"), as the validator requires `check_by` to be an ISO date.
The checklist generator labels every standards claim "S700"; FSP-089 is the one to check against
**S520** instead (its reason says so).

## Open GAPs (31)

| ID | Owner | Claim (short) |
| --- | --- | --- |
| FSP-003 | founder | Designation rule: module checks + final 80 % + practical 80 % (pass mark set 02/11/2026); Practitioner-tier placement |
| FSP-010 | S700 | The fire restoration arc and its order |
| FSP-011 | field | Confirm site release (fire service, police, owner) before starting |
| FSP-025 | field | Fire-damaged wiring: supply restored only by a licensed electrician |
| FSP-031 | S700 | Burn condition → residue (fast/hot → dry; smouldering → wet) |
| FSP-033 | field | P2 as CARSI's minimum respirator for fire-residue work |
| FSP-035 | S700 | Five migration pathways |
| FSP-036 | S700 | Whole-building survey and recorded boundary |
| FSP-052 | field | Stop–isolate–hand over; clean that area only after clearance |
| FSP-071 | field | NZ disposal of CCA ash: check the council (no NZ source found) |
| FSP-081 | S700 | Four residue types and their descriptions |
| FSP-082 | S700 | Test patch, least aggressive first |
| FSP-083 | field | Residue behaviour changes with time; date each test |
| FSP-086 | S700 | Source removal before cleaning, after the hazard check |
| FSP-087 | S700 | Method by residue type |
| FSP-088 | S700 | Top-down, least-affected rooms first, filtration running |
| FSP-089 | **S520** | Mould hold-rule after firefighting water |
| FSP-093 | S700 | Corrosion window "first 24 to 48 hours" |
| FSP-094 | field | Do not power up contaminated electronics |
| FSP-095 | field | Dehumidifying slows corrosion (no RH target given) |
| FSP-097 | S700 | Three contents-triage groups; inventory first |
| FSP-098 | field | Discard heavily affected food, cosmetics, medicines |
| FSP-099 | S700 | HVAC as a pathway; what to assess |
| FSP-100 | S700 | Keep a contaminated HVAC system off until cleaned |
| FSP-102 | S700 | Odour sequence: source, clean, seal, treat, verify |
| FSP-103 | S700 | Seal porous surfaces that cannot be cleaned |
| FSP-110 | S700 | Verification checklist before handover |
| FSP-111 | field | Contemporaneous records are stronger |
| FSP-115 | field | Most fire work is inside an insurance claim |
| FSP-155 | field | Judge a test patch dry; a ring or gloss change is a fail |
| FSP-161 | field | White-cloth wipe test, recorded area by area |

## Cross-course asbestos rule (coordinator, 02/11/2026)

The Australian rule is **not** a 1990 cut-off. Lesson 3.1, the quiz, the diagrams, the field card
and the assessment now say: assume asbestos may be present in any building built or renovated
before 31 December 2003 (national ban); pre-1990 buildings are the most likely to contain it;
workplaces in buildings built before 31 December 2003 must have an asbestos register (Queensland:
before 31 December 1989; Victoria sets its own rules). New Zealand: any building built or
renovated before 2000. Sources reused from the WHS Fundamentals ledger on main (WHS-024 to
WHS-026) as FSP-123 to FSP-125; FSP-126 records the rule; FSP-127 adds the NZ asbestos
management-plan duty. No copy states or implies a post-1990 Australian building is asbestos-free.

## Consistency with the Ozone course (read, not edited; `noAiRewrite`)

- The old live lesson said hydroxyl generation is "safe for occupied spaces". **Removed.** The
  rebuild follows the Ozone course: hydroxyl is not assumed safe with people inside (Joo et al.
  2021 measured organic acids and new particles), no source shows odour removal on Australian
  jobs, and people stay out until you know what the unit produces.
- Ozone: empty, isolated space; the 0.1 ppm figure is a worker limit, not occupant clearance;
  re-entry on measured readings and the manufacturer's instructions. The NZ ceiling (0.1 ppm) was
  added and verified separately.
- The old "thermal fogging" option was dropped from the lesson rather than left unsourced.

## Corrections to the live course carried into this draft

- Asbestos: the live lesson said only "stop work … licensed asbestos removal process". The draft
  adds the fire-specific rule (fire-damaged asbestos is friable, Class A, regardless of area) for
  NSW, Victoria and NZ, with sources.
- The live course said asbestos and bushfire ash are "not covered by United States wildfire …
  documentation". That was an unsourced claim about other documents and US framing; it is gone.
- The live "first 24–48 hours" corrosion window is kept as practice wording but flagged GAP
  (FSP-093); the corrosion mechanism itself is now sourced to peer-reviewed studies.

## Open questions for Phill

1. **Designation rule (FSP-003):** pass mark is now 80 % everywhere (decided 02/11/2026);
   still to confirm: completion = all module checks + final + practical, and the Practitioner tier.
2. **Duration (FSP-122):** decided 02/11/2026: 4 hours kept, material added (57 % evidenced).
3. **S700 scope and bushfire:** decided 02/11/2026: bushfire content from AU/NZ regulators only,
   and lesson 1.1 claims the S700 alignment for the restoration method only, not for the bushfire
   material (FSP-128).
4. **NZ CCA ash disposal (FSP-071):** no NZ regulator or council page was found; supply the rule
   or keep the "check your council" wording.
5. **Electronics and corrosion (FSP-093–095):** the 24–48 h window and any RH target.
6. **P2 minimum (FSP-033):** confirm P2 as CARSI's floor for indoor residue work.

## Licence / production guardrails honoured

- `iicrcDiscipline: null`, `cecHours: 0`; no CEC claim; designation in `meta.designation`.
- Australian English, 230 V / 50 Hz, 10 A circuits, RCD, metric units, AUD (10 % GST shown).
- No standard text; standards named with edition; no absence claim about any standard.
- Diagrams: 12 SVGs, CARSI logo embedded, `check:course-diagrams` 0 findings (and a planted
  out-of-bounds label was caught, exit 1).
