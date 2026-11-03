# Research pack — CARSI Contaminated-Water Practitioner (v1 DRAFT)

**Status:** DRAFT v1 for SME (Phill) verification, built 02/11/2026. This pack is the human summary of the
course's **evidence ledger**, the machine record of every substantive claim:

`data/courses/category-3-sewage-black-water-remediation/v1-draft/evidence/evidence-ledger.jsonl` (pointed to by `meta.evidenceLedger`; schema and statuses per
the `course-truth` and `carsi-course-production` skills).

**Scope decisions applied**

- **Full credential course, not a wrapper.** DECISIONS #27 (designation = Level 2) applies only where a matching
  Level 2 course exists. No Level 2 contaminated-water course is in the catalogue, so this course teaches the
  whole discipline and carries the practical task and the designation exam. Optional foundation course (from
  `data/seed/designations.json`): `asbestos-awareness-for-restoration-technicians`.
- **Australia and New Zealand** (DECISIONS #35, carsi-course-production §5a on PR #979). Where NZ law, regulators
  or thresholds differ, the NZ position is stated beside the Australian one and verified against a primary NZ
  source (legislation.govt.nz, worksafe.govt.nz, healthnz.govt.nz / healthed.govt.nz). Pricing stays AUD.
- **Standards:** named only, with edition (ANSI/IICRC S500:2025, AS/NZS 1716, AS/NZS 3760:2022). No IICRC or RIA
  text was read or entered into any AI tool. Every claim about what S500 says is a GAP for Phill's licensed copy.
- **Credential fields:** `iicrcDiscipline: null`, `cecHours: 0`, designation in `meta.designation`, price
  unchanged (A$99), slug and course id unchanged. `durationHours` stays 4.

## Ledger at a glance

| Status | Entries | Meaning |
| --- | ---: | --- |
| VERIFIED | 108 | A regulator, legislation, government health or official page was opened on 02/11/2026 and supports the claim (verbatim quote of 25 words or fewer in the ledger). |
| JUSTIFIED | 16 | Our own arithmetic, a labelled illustrative teaching number, the nominative S500:2025 citation, or a fact read from this repository. Reasoning is in the ledger. |
| GAP | 43 | Not yet verifiable from here. **Every GAP must be cleared before go-live.** 9 are standards claims for the licensed S500:2025 copy. |

Grades (VERIFIED and JUSTIFIED entries): A1 x11, A2 x88, A3 x7, B2 x5, C3 x13. No vendor
page is used as evidence. Ausgrid’s Electricity Safety site (B2) is used only for the 000 number. Nine Australian
sources were carried from the Water and Mould v1 ledgers, where they were opened the same day (WorkSafe ACT RCDs,
SafeWork SA fit testing and AS/NZS 3760, NSW Resources Regulator facial hair, WorkSafe Queensland RPE, SafeWork NSW
mould, Queensland Health mould, Electrical Safety Office Queensland, ACCC, ATO); each quote is unchanged.

Validate: `node scripts/audit/validate-ledger.mjs data/courses/category-3-sewage-black-water-remediation/v1-draft/evidence/evidence-ledger.jsonl` (must exit 0) and
`node scripts/audit/check-mutants.mjs` in the same session.

## New Zealand positions added (each VERIFIED against a primary NZ source)

| NZ fact | Australian counterpart |
| --- | --- |
| HSWA 2015 s 36: the PCBU holds the primary duty of care | Model WHS Act PCBU duty; Victoria OHS Act 2004 |
| GRWM Regulations 2016 reg 6: hierarchy of controls, PPE for the risk that remains | Safe Work Australia hierarchy |
| GRWM Regulations 2016 reg 15: the PCBU directing the work provides PPE | — |
| HSWA s 23: a serious infection from work with micro-organisms or human bodily substances is notifiable | Model WHS Regulations reg 699 |
| Notify WorkSafe as soon as possible (0800 030 040); keep records five years; preserve the site | Notify the WHS regulator immediately |
| Asbestos rule of thumb: built or renovated before 2000 | Assume it if built or renovated before 31 December 2003, when the national ban took effect; most likely if before 1990 |
| RPE fit testing at first issue, then at least yearly or after facial change (WorkSafe NZ, per AS/NZS 1715:2009) | Before first use and after facial change (SafeWork SA) |
| Hepatitis A recommended but not funded for sewage workers; may be employer-funded (NZ Immunisation Handbook) | Hepatitis A and tetanus recommended (Australian Immunisation Handbook) |
| Current HSNO-compliant SDS mandatory for each hazardous substance in the workplace | SDS copies in the hazardous chemicals register |
| Mains 230 V at 50 Hz (Electricity (Safety) Regulations 2010); RCD among the protections for hand-held appliances in damp situations (reg 89); WorkSafe NZ: all site equipment RCD-protected | AU 230 V; workplace RCD 30 mA |
| Stormwater empties untreated into streams and the sea (Watercare); stormwater discharges prohibited (Auckland Stormwater Bylaw); trade waste agreement for higher-risk trade waste (Auckland Trade Waste Bylaw); one-off discharges may need provisional consent (Watercare) | EPA Victoria trade waste agreement; Sydney Water approval |
| Sanitary plumbing and drainlaying restricted to authorised persons (PGD Act 2006 ss 8 and 10) | Licensed plumber (GAP: AU source not yet opened) |
| Consumer Guarantees Act 1993: reasonable care and skill, fit for purpose | ACL due care and skill |
| National Poisons Centre 0800 764 766; emergency 111; Healthline 0800 611 116 | 13 11 26; 000 |
| Health NZ: assume floodwater holds sewage; no water blasters (aerosols); detergent then disinfect; 500 mL bleach in 10 L, 10–30 min | NSW Health clean then disinfect; Qld Health floodwater |

## Sources opened and graded (02/11/2026)

| Source | Grade | Ledger entries |
| --- | --- | --- |
| [NSW Health, Staying healthy during and after flood](https://www.health.nsw.gov.au/emergency_preparedness/weather/Pages/staying-healthy-during-and-after-flood.aspx) | A2 | CWP-005, CWP-058, CWP-087, CWP-098, CWP-104 |
| [Health New Zealand, Floods and health](https://www.healthnz.govt.nz/health-topics/keeping-healthy/protecting-health-natural-disaster/floods-and-health) | A2 | CWP-006, CWP-007, CWP-023, CWP-069, CWP-108, CWP-142 |
| [Queensland Health, Beware of health risks lurking in floodwaters and mud (11/03/2025)](https://www.health.qld.gov.au/newsroom/news/beware-of-health-risks-lurking-in-seq-floodwaters-and-mud) | A2 | CWP-011, CWP-012, CWP-015, CWP-018 |
| [Health New Zealand (HealthEd), Cleaning up a flooded home HE2949](https://healthed.govt.nz/products/cleaning-up-a-flooded-home-he2949) | A2 | CWP-013, CWP-017, CWP-079, CWP-080, CWP-088, CWP-096, CWP-099, CWP-105, CWP-106, CWP-107 |
| [Queensland Government, Leptospirosis](https://www.qld.gov.au/health/condition/infections-and-parasites/bacterial-infections/leptospirosis) | A2 | CWP-014 |
| [Australian Immunisation Handbook, Vaccination for people at occupational risk](https://immunisationhandbook.health.gov.au/contents/vaccination-for-special-risk-groups/vaccination-for-people-at-occupational-risk) | A2 | CWP-019, CWP-089 |
| [Health New Zealand, Immunisation Handbook: Hepatitis A](https://www.healthnz.govt.nz/health-professionals/guidance-standards/topic/immunisation/immunisation-handbook/hepatitis-a) | A2 | CWP-020 |
| [NSW Poisons Information Centre, About](https://www.poisonsinfo.nsw.gov.au/about) | A2 | CWP-021 |
| [National Poisons Centre (University of Otago), Contact](https://poisons.co.nz/contact/) | A2 | CWP-022 |
| [Ausgrid, Electricity Safety: Electrical equipment](https://www.electricitysafety.com.au/home-and-school/electrical-equipment) | B2 | CWP-024, CWP-064 |
| [WorkSafe New Zealand, Notify WorkSafe](https://www.worksafe.govt.nz/notifications/notify-worksafe/) | A2 | CWP-025, CWP-046, CWP-065 |
| [Safe Work Australia, Model WHS laws](https://www.safeworkaustralia.gov.au/law-and-regulation/model-whs-laws) | A2 | CWP-027 |
| [Safe Work Australia, Duties of a PCBU](https://www.safeworkaustralia.gov.au/law-and-regulation/duties-under-whs-laws/duties-pcbu) | A2 | CWP-028 |
| [Safe Work Australia, Principles that apply to work health and safety duties](https://www.safeworkaustralia.gov.au/law-and-regulation/duties-under-whs-laws/principles-apply-work-health-and-safety-duties) | A2 | CWP-029, CWP-030 |
| [WorkSafe Victoria, Occupational Health and Safety Act and regulations](https://www.worksafe.vic.gov.au/occupational-health-and-safety-act-and-regulations) | A2 | CWP-031 |
| [Health and Safety at Work Act 2015 (NZ), s 36 Primary duty of care](https://www.legislation.govt.nz/act/public/2015/0070/latest/DLM5976894.html) | A1 | CWP-032 |
| [Safe Work Australia, Managing risks (hierarchy of control measures)](https://www.safeworkaustralia.gov.au/safety-topic/industry-and-business/agriculture/managing-risks) | A2 | CWP-033 |
| [Safe Work Australia, Manage the risks](https://www.safeworkaustralia.gov.au/duties-tool/construction/pcbu/manage-risks) | A2 | CWP-034, CWP-067 |
| [Health and Safety at Work (General Risk and Workplace Management) Regulations 2016 (NZ), reg 6 Hierarchy of control measures](https://www.legislation.govt.nz/regulation/public/2016/0013/latest/DLM6727382.html) | A1 | CWP-035 |
| [Health and Safety at Work (General Risk and Workplace Management) Regulations 2016 (NZ), reg 15 PCBU to provide PPE](https://legislation.govt.nz/regulation/public/2016/0013/latest/DLM6727318.html) | A1 | CWP-036, CWP-082 |
| [Safe Work Australia, Safe work method statement for high risk construction work (information sheet)](https://www.safeworkaustralia.gov.au/system/files/documents/1703/information-sheet-safe-work-method-statement.pdf) | A2 | CWP-037 |
| [Safe Work Australia, High risk construction work requiring a SWMS](https://www.safeworkaustralia.gov.au/duties-tool/construction/hazards-information/high-risk-construction-work-requiring-swms) | A2 | CWP-038 |
| [Work Health and Safety Regulations 2011 (Cth), reg 699 Prescribed serious illnesses (AustLII)](https://classic.austlii.edu.au/au/legis/cth/consol_reg/whasr2011327/s699.html) | A2 | CWP-041 |
| [Safe Work Australia, Incident notification](https://www.safeworkaustralia.gov.au/book/health-care-and-social-assistance/managing-whs-risks/incident-notification) | A2 | CWP-042 |
| [Health and Safety at Work Act 2015 (NZ), s 23 Meaning of notifiable injury or illness](https://www.legislation.govt.nz/act/public/2015/0070/latest/DLM5976868.html) | A1 | CWP-043 |
| [WorkSafe New Zealand, What events need to be notified?](https://www.worksafe.govt.nz/notifications/what-events-need-to-be-notified/) | A2 | CWP-044, CWP-045 |
| [WorkSafe New Zealand, Asbestos in Aotearoa New Zealand](https://www.worksafe.govt.nz/topic-and-industry/asbestos/asbestos-information-for-homeowners/asbestos-in-aotearoa-new-zealand/) | A2 | CWP-047, CWP-137 |
| [NSW Government (asbestos.nsw.gov.au), When was asbestos banned in Australia?](https://www.asbestos.nsw.gov.au/safety/safety-in-the-home/when-was-asbestos-banned-in-australia) | A2 | CWP-048, CWP-136 |
| [NSW Government, Voltage optimisation fact sheet](https://www.energy.nsw.gov.au/sites/default/files/2022-08/2016_04_NSW_VoltageOptimisationFactsheet.pdf) | A3 | CWP-050, CWP-150 |
| [Electricity (Safety) Regulations 2010 (NZ)](https://www.legislation.govt.nz/regulation/public/2010/0036/latest/whole.html) | A1 | CWP-051, CWP-052, CWP-057, CWP-151 |
| [WorkSafe ACT, Residual current devices](https://www.worksafe.act.gov.au/health-and-safety-portal/safety-by-industry/electrical-and-electronics/residual-current-devices) | A2 | CWP-053, CWP-054, CWP-154 |
| [SafeWork SA, Inspection and testing of electrical equipment](https://www.safework.sa.gov.au/workplaces/electrical/inspection-and-testing-of-electrical-equipment) | A2 | CWP-055 |
| [WorkSafe New Zealand, Electrical safety on small construction sites](https://www.worksafe.govt.nz/dmsdocument/41-electrical-safety-on-small-construction-sites/) | A2 | CWP-056 |
| [Safe Work Australia, Asbestos overview](https://www.safeworkaustralia.gov.au/safety-topic/hazards/asbestos/overview) | A2 | CWP-060, CWP-135 |
| [Safe Work Australia, Model Code of Practice: Confined spaces](https://www.safeworkaustralia.gov.au/system/files/documents/1705/mcop-confined-spaces-v3.pdf) | A2 | CWP-061, CWP-062 |
| [WorkSafe Queensland, Respiratory protective equipment](https://www.worksafe.qld.gov.au/safety-and-prevention/creating-safe-work/managing-risks/personal-protective-equipment-ppe/respiratory-protective-equipment-rpe) | A2 | CWP-070 |
| [SafeWork SA, Fit testing and fit checking of RPE](https://safework.sa.gov.au/workers/respiratory-protective-equipment/fit-testing-and-fit-checking-of-rpe) | A2 | CWP-071, CWP-072, CWP-073, CWP-076 |
| [WorkSafe New Zealand, Respiratory protective equipment: advice for businesses](https://www.worksafe.govt.nz/topic-and-industry/personal-protective-equipment-ppe/respiratory-protective-equipment/advice-for-businesses/) | A2 | CWP-074, CWP-075 |
| [NSW Resources Regulator, Facial hair and respiratory protective equipment fact sheet](https://www.resources.nsw.gov.au/sites/default/files/2024-04/fact-sheet-facial-hair-and-respiratory-protective-equipment.pdf) | A2 | CWP-077 |
| [TGA, Understanding regulation of disinfectants, sterilants and sanitary products](https://www.tga.gov.au/resources/guidance/understanding-regulation-disinfectants-sterilants-and-sanitary-products) | A2 | CWP-110, CWP-111, CWP-112, CWP-113 |
| [WorkSafe New Zealand, Safety data sheets](https://www.worksafe.govt.nz/topic-and-industry/hazardous-substances/managing/safety-data-sheets/) | A2 | CWP-114, CWP-115 |
| [Safe Work Australia, Using safety data sheets](https://www.safeworkaustralia.gov.au/safety-topic/hazards/chemicals/safety-data-sheets/using-safety-data-sheets) | A2 | CWP-116 |
| [EPA Victoria, Publication 980.1 (stormwater fact sheet)](https://www.epa.vic.gov.au/sites/default/files/epa/publications/980-1.pdf) | A2 | CWP-119 |
| [Watercare (Auckland), Wastewater FAQs](https://www.watercare.co.nz/residents/help-and-support/wastewater-faqs) | A3 | CWP-120, CWP-126 |
| [Auckland Council, Trade Waste Bylaw 2013](https://www.aucklandcouncil.govt.nz/en/plans-policies-bylaws-reports-projects/bylaws/trade-waste-bylaw.html) | A2 | CWP-121, CWP-125 |
| [EPA Victoria, Preventing stormwater pollution: a guide for industry](https://vgls.sdp.sirsidynix.net.au/client/search/asset/1148606) | A2 | CWP-122 |
| [Sydney Water, Commercial trade wastewater](https://www.sydneywater.com.au/your-business/managing-trade-wastewater/commercial-trade-wastewater.html) | A3 | CWP-123 |
| [Australian Business Licence and Information Service, Approval to dispose of waste and trade wastewater (NSW)](https://ablis.business.gov.au/service/nsw/approval-to-dispose-of-waste-and-trade-wastewater/39521) | A2 | CWP-124 |
| [Watercare (Auckland), Trade waste agreements](https://www.watercare.co.nz/business/help-and-support/trade-waste/trade-waste-agreements) | A3 | CWP-127 |
| [Plumbers, Gasfitters, and Drainlayers Act 2006 (NZ)](https://www.legislation.govt.nz/act/public/2006/74/en/latest/) | A1 | CWP-130 |
| [NSW Government, Storm and flood clean-up assistance and advice](https://www.nsw.gov.au/emergency/floods/recover/clean-up-advice) | A2 | CWP-134 |
| [NSW Health, Beware of environmental health risks in flood clean up (25/03/2021)](https://www.health.nsw.gov.au/news/Pages/20210325_01.aspx) | A2 | CWP-141 |
| [Queensland Health, Mould (public health advice)](https://www.health.qld.gov.au/public-health/disaster/public-health-advice/mould) | A2 | CWP-148 |
| [SafeWork NSW, Mould](https://www.safework.nsw.gov.au/hazards-a-z/mould) | A2 | CWP-149 |
| [Electrical Safety Office Queensland, Safety switches](https://www.electricalsafety.qld.gov.au/electrical-safety-home/safety-switches) | A3 | CWP-152 |
| [ACCC, Consumer rights and guarantees](https://www.accc.gov.au/consumers/buying-products-and-services/consumer-rights-and-guarantees) | A2 | CWP-160, CWP-161 |
| [Consumer Protection (MBIE), Consumer Guarantees Act](https://www.consumerprotection.govt.nz/general-help/consumer-laws/consumer-guarantees-act) | A2 | CWP-162 |
| [Australian Taxation Office, How GST works](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/how-gst-works) | A1 | CWP-163 |

## Open GAPs for the SME (43) — each must be cleared before go-live

Generated checklist: `docs/sign-off/contaminated-water-practitioner-sme-checklist.md`.

| ID | Lesson | Claim (short) | Action |
| --- | --- | --- | --- |
| CWP-002 (S500) | L1.1 | Category 1 is clean water from a sanitary source, Category 2 is significantly contaminated (grey) water, and Category 3 is grossly contaminated (black) water that can carry harmful bacteria, viruses, parasites and chemicals. | substantiate |
| CWP-003 (S500) | L1.1 | Sewage beyond the trap, surcharging sewers, failed on-site systems, flood and rising water, and Category 1 or 2 water that has stood or passed through contaminated material are Category 3 sources. | substantiate |
| CWP-004 (S500) | L1.1 | Category 1 or 2 water can become Category 3 with time and contact with contaminated material; when unsure, the worse category is called. | substantiate |
| CWP-008 | L1.1 | Treating black water as grey can make people sick, while treating grey water as black mainly costs efficiency. | substantiate |
| CWP-009 (S500) | L1.1 | Drying a contaminated structure before decontamination locks the problem in and can spread it. | substantiate |
| CWP-016 | L1.2 | Every control blocks one or more of the three exposure routes (swallowing, skin and eyes, breathing). | substantiate |
| CWP-039 | L2.1 | Many restorers write a SWMS for every Category 3 job; whether a strip-out is construction work is a question for the regulator. | substantiate |
| CWP-040 | L2.1 | In New Zealand, the risk assessment is recorded in the format the PCBU uses (for example a task analysis), with WorkSafe NZ guidance checked for the task. | substantiate |
| CWP-059 | L2.2 | A wet ceiling holding water can collapse; nobody works in its drop zone until it is propped or drained. | substantiate |
| CWP-063 | L2.2 | A tight subfloor or septic tank may be a confined space; entry needs a trained crew and a permit system. | substantiate |
| CWP-068 | L3.1 | A P2 or higher respirator is the CARSI minimum for hands-on Category 3 work, stepped up where the assessment calls for it. | substantiate |
| CWP-078 | L3.1 | Goggles or a face shield, a fluid-resistant coverall, inner plus outer gloves, and cleanable waterproof boots form the CARSI hands-on Category 3 PPE set. | substantiate |
| CWP-081 | L3.1 | Coveralls and respirators add heat stress on hot days, so breaks, water and a cool clean area are planned. | substantiate |
| CWP-084 | L3.2 | Decontamination done badly moves contamination to clean areas, vehicles and skin, undoing the job. | substantiate |
| CWP-085 | L3.2 | Three zones (dirty, transition, clean) with one-way traffic through the transition zone. | substantiate |
| CWP-086 | L3.2 | PPE removal order: gross soil off, outer gloves, coverall inside out, boots, goggles then respirator by the straps, inner gloves last, then wash hands and face. | substantiate |
| CWP-090 | L3.2 | Hard tools are cleaned and disinfected before leaving the transition zone or bagged; extraction hoses are contaminated inside and out; vehicles carry dirty gear in a separate cleanable area. | substantiate |
| CWP-091 | L3.2 | After a needle-stick, cut through a glove or splash to eyes or mouth: stop, decontaminate, wash, seek medical advice the same day, record and report. | substantiate |
| CWP-093 (S500) | L4.1 | Strip-out and extraction throw contamination into the air and onto surfaces, so containment comes before disturbance. | substantiate |
| CWP-094 | L4.1 | An HVAC return in the affected area is switched off and sealed before work starts. | substantiate |
| CWP-095 | L4.1 | An AFD with HEPA filtration exhausting the work area to outside keeps it at slightly lower pressure so leaks flow inwards; doorway sheeting bowing inwards shows it is working. | substantiate |
| CWP-097 (S500) | L4.1 | Porous materials soaked with Category 3 water (carpet and underlay, plasterboard, insulation, particleboard, upholstery) are generally removed and discarded; non-porous materials are usually cleaned, disinfected and kept; semi-porous materials are judged case by case. | substantiate |
| CWP-100 | L4.1 | Plasterboard is cut above the highest point water or wicking reached, confirmed with a moisture meter. | substantiate |
| CWP-101 | L4.1 | Removal is what lowers the hazard; cleaning follows removal, not instead of it. | substantiate |
| CWP-103 | L4.2 | Cleaning removes soil, film and most micro-organisms; disinfectant cannot reach organisms protected under dirt. | substantiate |
| CWP-109 | L4.2 | Mixing bleach with acids or ammonia-based cleaners can release dangerous gases. | substantiate |
| CWP-117 | L4.2 | Semi-porous materials that stay are cleaned, disinfected and dried, and reassessed for removal if they cannot be cleaned to a sound surface. | substantiate |
| CWP-128 | L5.1 | Liquid-waste collection uses a contractor holding whatever licence or permit the state EPA or regional council requires, with a docket kept. | substantiate |
| CWP-129 | L5.1 | Pumping into a gully trap or toilet is a discharge to sewer and can overload a drain that may be the cause of the problem. | substantiate |
| CWP-131 | L5.1 | In Australia, repairs to sanitary plumbing and drains are licensed work for a licensed plumber or drainer. | substantiate |
| CWP-133 | L5.2 | Contaminated porous material and PPE are bagged or wrapped where they come out, double-bagged, sealed and taken out through the transition zone to a covered skip. | substantiate |
| CWP-138 | L5.2 | Asbestos waste goes to a facility licensed to take it; mixing it into the general skip contaminates the whole load. | substantiate |
| CWP-139 | L5.2 | Each solid-waste stream gets a docket (facility, date, weight or volume, vehicle or contractor); insurers and loss adjusters ask for them. | substantiate |
| CWP-140 | L5.2 | A neighbour’s waste in your skip becomes your load at the weighbridge; keep the skip covered and controlled. | substantiate |
| CWP-144 (S500) | L6.1 | On a Category 3 job drying comes after decontamination: contain, remove, clean and disinfect, verify clean, then dry. | substantiate |
| CWP-145 | L6.1 | Air movers across dirty material spread it; heat and airflow on a contaminated surface can make contamination harder to remove. | substantiate |
| CWP-146 (S500) | L6.1 | Drying sets a dry standard from unaffected material of the same type and monitors to it with a moisture meter and thermo-hygrometer. | substantiate |
| CWP-147 | L6.1 | Mould rule: no air movers across mouldy surfaces; AFDs and dehumidifiers until the mould is cleaned and cleared. | substantiate |
| CWP-153 | L6.1 | Several outlets in a room often share one circuit. | substantiate |
| CWP-156 (S500) | L6.2 | A Category 3 job is finished when the area is verified clean, dry and safe; clearance criteria for Category 3 are confirmed against ANSI/IICRC S500:2025 and the job scope. | substantiate |
| CWP-157 | L6.2 | Verify-clean checklist: porous material removed, surfaces visibly clean, cleaning and disinfection recorded, containment intact until checked, photographs. | substantiate |
| CWP-158 | L6.2 | An occupational hygienist can add an independent check where the client, insurer or job complexity calls for it. | substantiate |
| CWP-159 | L6.2 | Records made at the time are what a loss adjuster, regulator or court is most likely to accept. | substantiate |

Illustrative teaching numbers (room sizes, depths, 2 L per wash, 4 air changes per hour, a 1:20 label, current
draws of 4.5 A and 2.5 A, a 1.5 bulking factor, a $4,800 job) are JUSTIFIED with their arithmetic and stay
labelled illustrative in the lessons. Phill may confirm or replace them with real rating-plate and rate-card
figures.

## What changed from the seeded draft

- Rebuilt from 7 single-concept modules (14 short lessons, one 10-question check, 4 h stated) to 6 modules,
  13 seven-part lessons, 6 module checks, a 20-question final exam and a practical task, to Course Standard v1.
- New Zealand added throughout (law, regulator, notification, asbestos date, fit testing, vaccines, SDS,
  stormwater and trade waste, plumbing licensing, consumer law, phone numbers).
- The old copy's "Australian-registered (APVMA/TGA) products" is now precise: the TGA regulates hard-surface
  disinfectants (listed if they make a specific claim such as virucidal), and some sanitisers sit with the APVMA.
- The old copy's "plumbing interfaces with AS/NZS 3500" was cut: no source opened, and New Zealand plumbing
  compliance runs through its Building Code. Licensed-plumbing duty is stated instead.
- The pass mark is 80 % across all module checks, the practical task and the final exam (founder decision,
  02/11/2026: 80 % across the board for every CARSI designation course).

## Licence and production guardrails honoured

- `iicrcDiscipline: null`, `cecHours: 0`; no claim that the course earns or awards CECs; no IICRC discipline
  acronym; no wording that implies the IICRC approves or accredits this course; no IICRC mark.
- Australian English, 230 V / 50 Hz / 10 A GPO / RCD, metric units, AUD with GST, AS/NZS and regulator framing
  for both countries. No US framing.
- No absence claims about any standard. Standards named only, with edition.
