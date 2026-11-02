# Research pack — CARSI Structural Drying Practitioner (v1 DRAFT)

**Status:** DRAFT v1 for Subject-Matter-Expert (SME) verification by Phill (DECISIONS #24). This pack is the
human summary of the course's **evidence ledger**, the machine record of every substantive claim:

`data/courses/structural-drying-fundamentals/v1-draft/evidence/evidence-ledger.jsonl`
(pointed to by `meta.evidenceLedger`; schema per the `course-truth` and `carsi-course-production` skills).

Standards are referenced **by name only** (aligned to the principles in ANSI/IICRC S500:2025; AS/NZS 3760:2022
named). No IICRC standard, IICRC manual or RIA manual was read by or entered into any AI tool (CLAUDE.md,
DECISIONS #25). Anything about a standard's content is a GAP for Phill to check against his licensed copy.

## Scope decisions

- **Full credential course.** There is no Level 2 Structural Drying course in the catalogue, so DECISIONS #27
  (designation = Level 2 wrapper) does not apply. This course teaches the content and carries the practical
  task and the 20-question designation exam. The optional foundation step stays
  `psychrometry-building-science-for-drying` (designations.json).
- **Australia and New Zealand** (DECISIONS #35, SKILL §5a). NZ positions are stated wherever they differ and
  every NZ fact was verified on legislation.govt.nz or worksafe.govt.nz (one on the University of Otago's
  National Poisons Centre site). No US framing.
- **Credential settings unchanged:** `iicrcDiscipline: null`, `meta.designation` set, `cecHours: 0`,
  price A$99 (unchanged), duration 4 h (unchanged). No CEC claim anywhere in the copy.
- **No products named.** Equipment is taught by class (refrigerant, LGR, desiccant, air mover, air filtration
  device), with the instruction to source 230 V / 50 Hz units through Australian or New Zealand distributors.
  No brand availability check was therefore needed.

## Ledger at a glance (02/11/2026)

| Status | Entries | Meaning |
| --- | ---: | --- |
| VERIFIED | 49 | A primary source was opened on 02/11/2026 and supports the claim (quote of 25 words or fewer). |
| JUSTIFIED | 18 | Our arithmetic (psychrometrics, P = V x I, mass balance, unit conversion) or a labelled illustrative figure. |
| GAP | 29 | Not yet verifiable here; **9 are standards claims** for Phill's licensed copy. **Every GAP blocks go-live.** |

Grades (VERIFIED and JUSTIFIED): A1 x8, A2 x33, A3 x6, B2 x17, C3 x3. No vendor page is used as evidence. Validate with
`node scripts/audit/validate-ledger.mjs <ledger>` (exit 0) and `node scripts/audit/check-mutants.mjs`.

## New Zealand facts verified (18)

| ID | Claim | Source |
| --- | --- | --- |
| SDP-006 | In New Zealand, HSWA 2015 s 36 places the primary duty of care on the PCBU, so far as is reasonably practicable. | [New Zealand Legislation, Health and Safety at Work Act 2015, section 36](https://www.legislation.govt.nz/act/public/2015/0070/latest/DLM5976895.html) |
| SDP-008 | In New Zealand, any building built or renovated before 2000 could contain asbestos. | [WorkSafe New Zealand, Asbestos in Aotearoa New Zealand](https://www.worksafe.govt.nz/topic-and-industry/asbestos/asbestos-information-for-homeowners/asbestos-in-aotearoa-new-zealand/) |
| SDP-011 | In New Zealand a Class B (or Class A) licence is needed to remove more than 10 m² of non-friable asbestos. | [New Zealand Legislation, Health and Safety at Work (Asbestos) Regulations 2016, regulation 56](https://legislation.govt.nz/regulation/public/2016/0015/latest/DLM6729225.html) |
| SDP-012 | You cannot tell whether a material contains asbestos by looking at it. | [WorkSafe New Zealand, Asbestos in the home](https://www.worksafe.govt.nz/topic-and-industry/asbestos/asbestos-information-for-homeowners/asbestos-in-the-home/) |
| SDP-017 | New Zealand regulation 6 of the GRWM Regulations 2016 places PPE last in the hierarchy of control measures. | [New Zealand Legislation, Health and Safety at Work (General Risk and Workplace Management) Regulations 2016, regulation 6](https://www.legislation.govt.nz/regulation/public/2016/0013/latest/DLM6727382.html) |
| SDP-056 | WorkSafe New Zealand lists space heaters and oil or gas heaters among carbon monoxide sources; carbon monoxide has no colour, smell or taste. | [WorkSafe New Zealand, Dangers of carbon monoxide](https://www.worksafe.govt.nz/topic-and-industry/fumes/carbon-monoxide-invisible-and-deadly/) |
| SDP-057 | New Zealand’s workplace exposure standard for carbon monoxide is 20 ppm as an 8-hour time-weighted average. | [WorkSafe New Zealand, Dangers of carbon monoxide](https://www.worksafe.govt.nz/topic-and-industry/fumes/carbon-monoxide-invisible-and-deadly/) |
| SDP-062 | New Zealand standard low voltage is a nominal 230 V AC. | [New Zealand Legislation, Electricity (Safety) Regulations 2010](https://legislation.govt.nz/regulation/public/2010/0036/latest/whole.html) |
| SDP-063 | New Zealand supply frequency is 50 Hz. | [New Zealand Legislation, Electricity (Safety) Regulations 2010, regulation 29](https://www.legislation.govt.nz/regulation/public/2010/0036/latest/DLM2763654.html) |
| SDP-070 | In New Zealand testing and tagging is not mandatory; equipment must be electrically safe and maintained in a safe condition. | [WorkSafe New Zealand, Testing and tagging electrical appliances](https://www.worksafe.govt.nz/topic-and-industry/electricity/testing-and-tagging-electrical-appliances/) |
| SDP-071 | In New Zealand, testing and tagging to AS/NZS 3760 is an option for a business to show compliance. | [WorkSafe New Zealand, Testing and tagging electrical appliances](https://www.worksafe.govt.nz/topic-and-industry/electricity/testing-and-tagging-electrical-appliances/) |
| SDP-072 | Under New Zealand’s Electricity (Safety) Regulations 2010, in-service appliances and leads must be RCD-protected in certain circumstances such as damp conditions. | [WorkSafe New Zealand, Ensuring safety of plug-in electrical appliances](https://www.worksafe.govt.nz/about-us/news-and-media/ensuring-safety-of-plug-in-electrical-appliances/) |
| SDP-074 | In New Zealand a generator must never be used indoors where people are present, including an internal garage. | [WorkSafe New Zealand, Using portable generators after a natural event or emergency](https://www.worksafe.govt.nz/topic-and-industry/natural-events-and-emergencies/using-portable-generators-after-a-natural-event-or-emergency/) |
| SDP-081 | New Zealand’s Consumer Guarantees Act 1993 s 28 guarantees services are carried out with reasonable care and skill. | [New Zealand Legislation, Consumer Guarantees Act 1993, section 28](https://www.legislation.govt.nz/act/public/1993/0091/latest/DLM312839.html) |
| SDP-083 | In New Zealand a PCBU must notify WorkSafe as soon as possible after becoming aware of a notifiable event. | [WorkSafe New Zealand, What events need to be notified?](https://www.worksafe.govt.nz/notifications/what-events-need-to-be-notified/) |
| SDP-084 | In New Zealand a work death is reported to WorkSafe immediately on 0800 030 040. | [WorkSafe New Zealand, Notify WorkSafe](https://www.worksafe.govt.nz/notifications/notify-worksafe/) |
| SDP-088 | In New Zealand the PCBU must obtain the current safety data sheet for a hazardous substance from its manufacturer, importer or supplier. | [New Zealand Legislation, Health and Safety at Work (Hazardous Substances) Regulations 2017](https://www.legislation.govt.nz/regulation/public/2017/0131/latest/whole.html) |
| SDP-089 | New Zealand’s National Poisons Centre number is 0800 764 766 (0800 POISON). | [National Poisons Centre (University of Otago), Calling us](https://poisons.co.nz/poisons-centre-info/calling-us/) |

## Where Australia and New Zealand differ (as taught)

| Topic | Australia | New Zealand |
| --- | --- | --- |
| WHS law | Model WHS laws (all jurisdictions except Victoria); Victoria: OHS Act 2004 | HSWA 2015 s 36; GRWM Regulations 2016 r 6 (hierarchy) |
| Asbestos date | Assume it in any building built or renovated before 31 December 2003 (national ban); before 1990 most likely. Register duty: before 31 December 2003 (Queensland: before 31 December 1989) | Built or renovated before 2000 |
| Asbestos licence | Class B above 10 m² non-friable; ACT: no homeowner or tradesperson removal | Class B (or A) above 10 m² non-friable (Asbestos Regulations 2016 r 56) |
| Testing and tagging | Equipment in hostile conditions regularly inspected and tested by a competent person (AS/NZS 3760:2022) | Not mandatory; equipment must be electrically safe; AS/NZS 3760 is one way to show it |
| RCD | Portable gear at work on an RCD; socket RCD up to 20 A trips at no more than 30 mA | RCD protection in certain circumstances such as damp conditions (Electricity (Safety) Regulations 2010) |
| Carbon monoxide | Never run generators or fuel heaters indoors (ESO Queensland, ACCC); limit: check Safe Work Australia | Same rule (WorkSafe NZ); WES-TWA 20 ppm |
| Consumer law | ACL: due care and skill | Consumer Guarantees Act 1993 s 28: reasonable care and skill |
| Notifiable events | Follow the state or territory regulator | Notify WorkSafe as soon as possible; death: 0800 030 040 |
| Poisons | 13 11 26 | 0800 764 766 |
| Mains | 230 V, 50 Hz | 230 V, 50 Hz |

## Sources opened and graded (02/11/2026)

| Source | Grade | Ledger IDs |
| --- | --- | --- |
| [Safe Work Australia, Duties of a PCBU](https://www.safeworkaustralia.gov.au/law-and-regulation/duties-under-whs-laws/duties-pcbu) | A2 | SDP-003 |
| [Safe Work Australia, Model WHS laws](https://www.safeworkaustralia.gov.au/law-and-regulation/model-whs-laws) | A2 | SDP-004 |
| [WorkSafe Victoria, Occupational Health and Safety Act and regulations](https://www.worksafe.vic.gov.au/occupational-health-and-safety-act-and-regulations) | A2 | SDP-005 |
| [New Zealand Legislation, Health and Safety at Work Act 2015, section 36](https://www.legislation.govt.nz/act/public/2015/0070/latest/DLM5976895.html) | A1 | SDP-006 |
| [SafeWork NSW, Class B asbestos removal licence](https://www.safework.nsw.gov.au/licences-and-registrations/licences/class-b-asbestos-removal-licence) | A2 | SDP-007, SDP-009 |
| [Safe Work Australia, Asbestos (construction duties tool)](https://www.safeworkaustralia.gov.au/duties-tool/construction/hazards-information/asbestos) | A2 | SDP-095, SDP-096 |
| [WorkSafe New Zealand, Asbestos in Aotearoa New Zealand](https://www.worksafe.govt.nz/topic-and-industry/asbestos/asbestos-information-for-homeowners/asbestos-in-aotearoa-new-zealand/) | A2 | SDP-008 |
| [Asbestos and Silica Safety and Eradication Agency, Householders and home renovators](https://www.asbestossafety.gov.au/about-asbestos/practical-guidance/householders-and-home-renovators) | A2 | SDP-010 |
| [New Zealand Legislation, Health and Safety at Work (Asbestos) Regulations 2016, regulation 56](https://legislation.govt.nz/regulation/public/2016/0015/latest/DLM6729225.html) | A1 | SDP-011 |
| [WorkSafe New Zealand, Asbestos in the home](https://www.worksafe.govt.nz/topic-and-industry/asbestos/asbestos-information-for-homeowners/asbestos-in-the-home/) | A2 | SDP-012 |
| [Safe Work Australia, Manage the risks](https://www.safeworkaustralia.gov.au/duties-tool/construction/pcbu/manage-risks) | A2 | SDP-016 |
| [New Zealand Legislation, Health and Safety at Work (General Risk and Workplace Management) Regulations 2016, regulation 6](https://www.legislation.govt.nz/regulation/public/2016/0013/latest/DLM6727382.html) | A1 | SDP-017 |
| [USDA Forest Products Laboratory, Wood Handbook, chapter 12: Drying and control of moisture content](https://www.fpl.fs.usda.gov/documnts/fplgtr/fplgtr113/ch12.pdf) | A2 | SDP-093, SDP-094 |
| [Bureau of Meteorology, Definitions for 9am and 3pm statistics](https://www.bom.gov.au/climate/cdo/about/definitions9and3.shtml) | A2 | SDP-022, SDP-023 |
| [Australian Building Codes Board, Condensation in buildings handbook (2023)](https://www.abcb.gov.au/sites/default/files/resources/2023/Condensation-in-buildings-handbook.pdf) | A2 | SDP-027, SDP-031 |
| [Hawaii Natural Energy Institute, University of Hawaii, Desiccant dehumidification literature and technology review](https://www.hnei.hawaii.edu/wp-content/uploads/Desiccant-Dehumidification-Literature-and-Technology-Review.pdf) | A3 | SDP-042, SDP-043 |
| [McGahey and Harriman, Desiccants: benefits for the second century of air-conditioning (Texas A&amp;M repository)](https://hdl.handle.net/1969.1/6695) | B2 | SDP-044 |
| [ACCC Product Safety Australia, Carbon monoxide safety](https://www.productsafety.gov.au/about-us/product-safety-news/news/carbon-monoxide-safety) | A2 | SDP-055 |
| [WorkSafe New Zealand, Dangers of carbon monoxide](https://www.worksafe.govt.nz/topic-and-industry/fumes/carbon-monoxide-invisible-and-deadly/) | A2 | SDP-056, SDP-057 |
| [NSW Government, Voltage optimisation fact sheet](https://www.energy.nsw.gov.au/sites/default/files/2022-08/2016_04_NSW_VoltageOptimisationFactsheet.pdf) | A3 | SDP-060 |
| [Ausgrid, Electricity Safety: Electrical equipment](https://www.electricitysafety.com.au/home-and-school/electrical-equipment) | B2 | SDP-061 |
| [New Zealand Legislation, Electricity (Safety) Regulations 2010](https://legislation.govt.nz/regulation/public/2010/0036/latest/whole.html) | A1 | SDP-062 |
| [New Zealand Legislation, Electricity (Safety) Regulations 2010, regulation 29](https://www.legislation.govt.nz/regulation/public/2010/0036/latest/DLM2763654.html) | A1 | SDP-063 |
| [Electrical Safety Office Queensland, Safety switches](https://www.electricalsafety.qld.gov.au/electrical-safety-home/safety-switches) | A3 | SDP-065 |
| [WorkSafe ACT, Residual current devices](https://www.worksafe.act.gov.au/health-and-safety-portal/safety-by-industry/electrical-and-electronics/residual-current-devices) | A2 | SDP-066, SDP-067 |
| [SafeWork NSW, Electrical inspection and testing](https://www.safework.nsw.gov.au/hazards-a-z/electrical-and-power/electrical-inspection-and-testing) | A2 | SDP-068 |
| [SafeWork SA, Inspection and testing of electrical equipment](https://www.safework.sa.gov.au/workplaces/electrical/inspection-and-testing-of-electrical-equipment) | A2 | SDP-069 |
| [WorkSafe New Zealand, Testing and tagging electrical appliances](https://www.worksafe.govt.nz/topic-and-industry/electricity/testing-and-tagging-electrical-appliances/) | A2 | SDP-070, SDP-071 |
| [WorkSafe New Zealand, Ensuring safety of plug-in electrical appliances](https://www.worksafe.govt.nz/about-us/news-and-media/ensuring-safety-of-plug-in-electrical-appliances/) | A2 | SDP-072 |
| [Electrical Safety Office Queensland, Generators](https://www.electricalsafety.qld.gov.au/electrical-equipment/generators) | A3 | SDP-073 |
| [WorkSafe New Zealand, Using portable generators after a natural event or emergency](https://www.worksafe.govt.nz/topic-and-industry/natural-events-and-emergencies/using-portable-generators-after-a-natural-event-or-emergency/) | A2 | SDP-074 |
| [ACCC, Consumer rights and guarantees](https://www.accc.gov.au/consumers/buying-products-and-services/consumer-rights-and-guarantees) | A2 | SDP-079, SDP-080 |
| [New Zealand Legislation, Consumer Guarantees Act 1993, section 28](https://www.legislation.govt.nz/act/public/1993/0091/latest/DLM312839.html) | A1 | SDP-081 |
| [Australian Taxation Office, How GST works](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/how-gst-works) | A1 | SDP-082 |
| [WorkSafe New Zealand, What events need to be notified?](https://www.worksafe.govt.nz/notifications/what-events-need-to-be-notified/) | A2 | SDP-083 |
| [WorkSafe New Zealand, Notify WorkSafe](https://www.worksafe.govt.nz/notifications/notify-worksafe/) | A2 | SDP-084 |
| [New Zealand Legislation, Health and Safety at Work (Hazardous Substances) Regulations 2017](https://www.legislation.govt.nz/regulation/public/2017/0131/latest/whole.html) | A1 | SDP-088 |
| [National Poisons Centre (University of Otago), Calling us](https://poisons.co.nz/poisons-centre-info/calling-us/) | A3 | SDP-089 |
| [NSW Poisons Information Centre, About](https://www.poisonsinfo.nsw.gov.au/about) | A2 | SDP-090 |

The Australian sources (SafeWork NSW, SafeWork SA, WorkSafe ACT, WorkSafe Victoria, Safe Work Australia, the
NSW voltage fact sheet, Ausgrid, ESO Queensland safety switches, ACCC, ATO, NSW Poisons) are the same pages the
Water Restoration Practitioner ledger opened on 02/11/2026; the quotes were re-used for identical claims.

## Psychrometric values (computed, JUSTIFIED)

Hyland-Wexler saturation pressure at 101.325 kPa; humidity ratio in g/kg dry air:
20 °C/80 % = 11.7 (dew point 16.4 °C); 26 °C/55 % = 11.6 (16.3 °C); 22 °C/75 % = 12.4 (17.4 °C; about 59 %RH at
26 °C); 22 °C/70 % = 11.6 (16.3 °C); 22 °C/50 % = 8.2; 16 °C/85 % = 9.6; 30 °C/30 % = 7.9; 24 °C/60 % = 11.2
(15.8 °C); 12 °C/85 % = 7.4 (9.6 °C); 20 °C/60 % = 8.7 (12.0 °C); 20 °C/45 % = 6.5; 32 °C/28 % = 8.3;
29 °C/75 % = 19.0; 9 °C/90 % = 6.4; 18 °C/65 % = 8.4; 27 °C/62 % = 13.9; 27 °C/50 % = 11.1.
Dehumidifier removal = airflow x 1.2 kg/m³ x depression (g/kg) x 24 / 1000 (L/day).

## What changed from the old draft (seed v0)

- Rebuilt from 7 modules x 2 lessons with a ten-question knowledge check to 6 modules, 12 teaching lessons, 6 module
  checks (7 questions each), a 20-question final designation exam and a five-criterion practical task.
- Added New Zealand throughout; removed nothing Australian.
- Every lesson now carries the seven-part pattern, a CARSI diagram, a metric worked example, a field tool and a
  sources list generated from the ledger (VERIFIED rows only).
- The old draft's "align to the principles of professional applied structural drying practice" phrasing was
  replaced with a nominative S500:2025 alignment line, with alignment itself a GAP for Phill.

## Open questions for Phill

1. **Standards (9 GAPs):** check each against licensed S500:2025 (and S520 for the mould hold rule).
   The course deliberately gives no air-mover ratio, dehumidifier sizing chart or dry-standard tolerance. Should
   any be added, in your own words?
2. **Drying arc and system names:** do "closed / open / heat-assisted" and the seven-stage arc match how you
   teach it?
3. **8 A review flag** on the power worksheet: keep, change, or drop?
4. **15 A plug guidance:** confirm, or point to an electrical-regulator page so it can be VERIFIED.
5. **Duration:** the course is still 4 h at 53.9 % evidenced share; the practical task adds real time. Keep 4 h?
6. **Foundation step:** keep the psychrometry course optional (designations.json), or make it required?
