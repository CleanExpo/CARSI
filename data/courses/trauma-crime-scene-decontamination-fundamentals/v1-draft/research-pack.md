# Research pack — CARSI Trauma & Biohazard Decontamination Practitioner (v1 DRAFT)

**Status:** DRAFT v1 for Subject-Matter-Expert review. **SME: Phill McGurk** (holds the licensed
S500, S520, S700 and S540; DECISIONS #24). This pack is the human summary of the course's
**evidence ledger**:

`data/courses/trauma-crime-scene-decontamination-fundamentals/v1-draft/evidence/evidence-ledger.jsonl`
(pointed to by `meta.evidenceLedger`; schema per the `course-truth` and `carsi-course-production`
skills). Phill's claim-by-claim list is `docs/sign-off/trauma-biohazard-practitioner-sme-checklist.md`.

Standards are referenced **by name only** (aligned to the principles in ANSI/IICRC S540:2023). No
IICRC standard text, IICRC manual or RIA manual was read, paraphrased or entered into any AI tool
(DECISIONS #25). Only the edition was looked up, from the public ANSI webstore listing.

## What this course is

- **Full credential course.** DECISIONS #27 ("designation = Level 2") applies only where a matching
  Level 2 course exists. The catalogue has no trauma or biohazard Level course, so this course
  teaches the content and carries the practical task and the designation exam
  (`meta.courseRole`).
- **Australia and New Zealand** (DECISIONS #35, production skill §5a). Every lesson states the NZ
  position where it differs. No US framing: the live entry's "bloodborne pathogen" wording is gone;
  the course uses the Australian Immunisation Handbook's "blood, body fluids" and "standard
  precautions".
- Credential fields: `iicrcDiscipline: null`, `meta.designation` = CARSI Trauma & Biohazard
  Decontamination Practitioner, `cecHours: 0`, `priceAud` unchanged at **A$99**.

## Changes from the live seed entry (seed untouched; applies on promotion)

- **7 modules / 14 lessons → 6 modules / 12 teaching lessons**, each to the seven-part pattern, plus
  6 module checks (42 questions) and a 15-question final designation exam.
- **Pass mark 80% everywhere** (founder decision 02/11/2026): every module check, the practical task
  and the final designation exam pass at 80% (`passPercentage`, `passThreshold`, `meta.passMarks`,
  lesson 1 and the final lesson).
- **`durationHours` stays 4** (founder decision 02/11/2026). An earlier draft cut it to 3 because
  evidenced time at 4 h was 47%. The 02/11/2026 depth pass added about 3,840 words of worked AU/NZ
  scenarios, decision points and common-mistake sections inside the existing lessons, plus one
  question per module check; evidenced time is now 58% of 4 h (floor 50%).
- **Removed claims:** "APVMA/TGA-registered products" (the TGA page lists disinfectants regulated by
  the APVMA as excluded goods; surface disinfectant claims for this work are a TGA matter, so the
  course now teaches the TGA specific-claim and ARTG rule); "aligns to the awareness principles";
  US "bloodborne pathogen" framing.
- **Kept ids:** course id, 6 module ids (re-titled) and 10 lesson ids. **New ids:** 2 lessons
  (sharps; verification and job file), 6 module-check quizzes, the final quiz and its lesson, the
  assessment. **Retired:** module `3c5aa5e3…`; lessons `fc0825ab…`, `cd149343…`, `d716b0e9…`,
  `66e30cf7…` (listed in `meta.retiredFromLive`). The live `introCaptionsUrl` (an expiring signed
  HeyGen URL) is dropped from the draft meta; `introVideoUrl` is kept.

## Ledger at a glance (02/11/2026, after the 4-hour depth pass)

| Status | Entries | Meaning |
| --- | ---: | --- |
| VERIFIED | 108 | Source opened on 02/11/2026 through Exa (search extract or fetch); quote of 25 words or fewer. |
| JUSTIFIED | 23 | CARSI arithmetic on labelled illustrative figures (areas, dilutions, volumes, time windows), worked scenarios that apply VERIFIED entries, the nominative S540 citation, and the founder's 80% pass-mark decision (TBP-006). |
| GAP | 28 | Not verifiable here. **Every GAP must be cleared before go-live.** |

Grades: VERIFIED A1 x23, A2 x82, A3 x1, B1 x1 (ANSI webstore, edition only), B2 x1 (Healthify NZ).
No vendor page is used. The standards GAPs carry `check_owner: "Phill (SME) — licensed S540"`
(the validator requires `check_by` to be a date, so the owner sits in its own field).

## New Zealand facts added (all VERIFIED unless marked)

| Topic | NZ position | Source |
| --- | --- | --- |
| Primary duty | HSWA 2015 s 36: PCBU ensures health and safety so far as is reasonably practicable; duty extends to others put at risk | legislation.govt.nz; WorkSafe NZ |
| Duties not transferable | HSWA 2015 s 31 | legislation.govt.nz |
| Hierarchy of controls | GRWM Regulations 2016 r 6, PPE last; WorkSafe NZ: PPE not the first or only control | legislation.govt.nz; WorkSafe NZ |
| PPE provision | GRWM r 15: the PCBU directing the work provides PPE | legislation.govt.nz |
| Hepatitis B | Recommended, not funded, for occupational risk; funded after needle-stick injury; some employment roles need serology | Health NZ Immunisation Handbook ch 9 |
| Disinfectants | EPA NZ approves and classifies hazardous substances, WorkSafe enforces; Cleaning Products (Subsidiary Hazard) Group Standard 2020 lists antimicrobial products; home disinfectants are hazardous substances | WorkSafe NZ; EPA NZ; Healthify (B2) |
| Disinfectant claims | No ARTG-equivalent claim register stated: **GAP TBP-066**, taught as "check with EPA NZ and the supplier" | — |
| Sharps containers | AS/NZS 23907:2023 approved by the NZ Standards Approval Board on 01/10/2025 | Standards Australia store |
| Healthcare waste | NZS 4304:2002 covers classification to disposal; each regional and local authority has its own plans; trade waste bylaws reference NZS 4304 | Standards NZ; Tararua DC bylaw (A3) |
| Notifiable events | HSWA s 23: medical treatment within 48 hours of exposure to a substance, and serious infection from work involving contact with human blood or bodily substances; s 56: notify as soon as possible by the fastest means; keep records 5 years | legislation.govt.nz; WorkSafe NZ |
| Psychosocial | HSWA defines health as physical and mental health; businesses must manage psychosocial risks; frequency, duration, intensity | WorkSafe NZ |
| Asbestos | Any building built or renovated before 2000 could contain asbestos (AU rule taught beside it: assume possible before 31/12/2003 ban, pre-1990 most likely) | WorkSafe NZ; Safe Work Australia model Code; NSW Government Asbestos |
| Numbers | 111; Healthline 0800 611 116; 1737; National Poisons Centre 0800 764 766 | Health NZ; poisons.co.nz |

## Australian facts by topic (VERIFIED)

- **Law:** model WHS laws in all jurisdictions except Victoria; Victorian OHS Act 2004; PCBU primary
  duty covers others such as visitors; eliminate, otherwise minimise; PPE and admin least effective;
  the PCBU gives PPE and the worker does not pay; RCD 30 mA for outlets up to 20 A.
- **Health:** major BBVs (healthdirect); exposure routes, first aid, no PEP for hepatitis C, PEP for
  HIV and hepatitis B (Queensland Health); 30-second wash (healthdirect); PEP within 72 hours (ASHM
  2025); hepatitis B occupational recommendation, 3-dose schedule, serology 4 to 8 weeks
  (Australian Immunisation Handbook).
- **PPE:** AS/NZS 1716, surgical masks for splashes only, particulate filters (WorkSafe Qld); fit test
  and fit check, facial hair (SafeWork SA); AS/NZS 2161.10 gloves (NSW Health PD2020_049).
- **Cleaning and claims:** clean before disinfecting, contact time, never mix, high to low (Department
  of Health ICEG, Dec 2023); specific claims need ARTG listing; exempt disinfectants (TGA).
- **Waste:** NSW special waste, AS/NZS 3816 labelling (the Regulation names the 1998 edition; NSW
  Health lists 2018), no compaction vehicle, rigid lidded transport containers, Schedule 1 tracking;
  Victoria R100 permit, lawful place, 50 L no-fee exemption, Waste Tracker; bags two-thirds full,
  sharps never in bags (NSW Health); sharps not in rubbish or recycling (WorkSafe ACT).
- **Notifiable incidents:** model WHS Regulations r 699 infection from contact with blood or body
  substances is a serious illness (AustLII); treatment within 48 hours of exposure to a substance,
  including blood (Safe Work Australia handbook, Dec 2025); notify immediately and preserve the site
  (Safe Work Australia); NSW triggers for blood and needlestick exposures: HIV PEP, or hepatitis B
  vaccine plus HBIG for a non-immune person, within 48 hours, or a resulting infection (SafeWork NSW).
- **SWMS:** required for high risk construction work, which includes work likely to disturb asbestos
  (Safe Work Australia); an administrative control (WorkSafe WA); a generic SWMS must be reviewed for
  the site (SafeWork NSW).
- **Psychosocial:** health includes psychological health; Part 3.1 and Part 3.2 Division 11; model
  regs apply once implemented; traumatic events or materials and its controls (Safe Work Australia);
  Victorian Psychological Health Regulations 2025 from 01/12/2025 (WorkSafe Victoria); Lifeline 13 11
  14, Beyond Blue 1300 22 4636, 000; healthdirect 1800 022 222; Poisons 13 11 26.

## Open GAPs (28)

| ID | Owner | Claim (short) | Action |
| --- | --- | --- | --- |
| TBP-003 | Phill — licensed S540 | Course job sequence consistent with S540:2023 | substantiate |
| TBP-050 | Phill — licensed S540 | Three zones and one-way movement consistent with S540:2023 | substantiate |
| TBP-051 | Phill — licensed S540 | Porous saturated materials usually removed; non-porous cleaned | substantiate |
| TBP-107 | Phill — licensed S540 | Handover verification check consistent with S540:2023 | substantiate |
| TBP-007 | Phill | Work starts only after police (and coroner) release and on authority | substantiate |
| TBP-008 | Phill | Low-profile arrival practice | substantiate |
| TBP-040 | Phill | Hidden fluid migration and heat strain as hazards | substantiate |
| TBP-048 | Phill | Donning and doffing order, double gloving | substantiate |
| TBP-052 | Phill | 300 mm cut-out margin; mist and wipe; wrap mattresses in the room | substantiate |
| TBP-066 | Phill | NZ: no ARTG-equivalent claim register (taught as "check EPA NZ") | substantiate |
| TBP-073 | Phill | Sharps search technique set | substantiate |
| TBP-090 | Phill | Other AU jurisdictions and NZ councils taught as "check your regulator" | substantiate |
| TBP-105 | Phill | Crew controls and warning signs | substantiate |
| TBP-108 | Phill | Job-record photography practice (privacy law not researched) | substantiate |
| TBP-122 | Phill | Contemporaneous records are stronger evidence | substantiate |
| TBP-127 | founder | Practitioner tier (split from TBP-006; pass marks now JUSTIFIED by founder decision) | substantiate |
| TBP-128 | Phill | First-call question set; firm quote only after the site walk | substantiate |
| TBP-130 | Phill | Neighbour script; soiled keepsakes bagged for the family to decide | substantiate |
| TBP-132 | Phill | Unsealable cut means a task outside the contaminated zone; near misses recorded | substantiate |
| TBP-140 | Phill | Exposure walk-through practice (buddy, driven to ED, item recorded) | substantiate |
| TBP-146 | Phill | NZ written task plan; suspected-asbestos lining: clean without cutting, sample first | substantiate |
| TBP-147 | Phill | Clean-zone phone tub and runner; torn-glove response; 30-minute blocks on hot days | substantiate |
| TBP-150 | Phill | Floorboard lift, clean-or-replace decision | substantiate |
| TBP-152 | Phill | Surface dries before contact time: smaller sections, re-wet, check SDS | substantiate |
| TBP-154 | Phill | Syringe with liquid placed whole; items police ask to keep | substantiate |
| TBP-156 | Phill | Waste storage awaiting collection; rinse water and drains | substantiate |
| TBP-157 | Phill | Debrief format; apprentice's first job | substantiate |
| TBP-158 | Phill | Lingering odour means find the source; photographs carry a scale | substantiate |

## Hours

Teaching words 12,249 as the audit counts them (12 lessons, about 880 to 1,280 words each) / 230
wpm = 53 min; 57 questions x 1.5 min = 85.5 min; total about 139 min = 58% of 240 min (4 h).

## Diagrams

Twelve hand-written SVGs in `public/courses/trauma-crime-scene-decontamination-fundamentals/diagrams/`,
one per teaching lesson, each with the CARSI wordmark and the standard footer:
`course-roadmap`, `conduct-on-site`, `bbv-exposure-routes`, `exposure-response`,
`hierarchy-of-controls`, `ppe-don-doff`, `work-zones`, `clean-then-disinfect`, `sharps-handling`,
`clinical-waste-chain`, `psychosocial-controls`, `job-file-handover`. `check:course-diagrams`: 12
files, 0 findings; each was also rendered and looked at.

## Field tools

`public/courses/trauma-crime-scene-decontamination-fundamentals/field-tools/`: first-attendance card
(M1), exposure response card (M2), risk assessment, SWMS and PPE sheet (M3), zones, removal and
disinfection log (M4), sharps and clinical waste checklist (M5), crew wellbeing and handover
checklist (M6).

## Notes for the SME

- Content is deliberately non-graphic. Scenarios describe the site and the task, never the person.
- Product brands are not named. The course teaches the claim check (ARTG / EPA NZ) instead, so no
  dated product-availability check was needed.
- AS/NZS 3816 edition: NSW regulation 113 names 1998; NSW Health policy lists 2018. The course tells
  learners to check which their contractor and regulator apply.
- Sharps containers: AS/NZS 23907:2023 replaced AS 4031 and AS/NZS 4261, but regulators may
  reference the old standards on their own timeline (WorkSafe ACT still does).
