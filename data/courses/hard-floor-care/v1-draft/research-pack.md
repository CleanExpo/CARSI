# Research pack - CARSI Hard Floor Care (v1 DRAFT)

**Status:** DRAFT v1 for subject-matter-expert (SME) verification. This pack is the human summary of the course's evidence ledger, the machine record of every substantive claim:

`data/courses/hard-floor-care/v1-draft/evidence/evidence-ledger.jsonl` (pointed to by `meta.evidenceLedger`).

No standard or manual text was read or entered into any AI tool. Standards are referenced by name only. Anything about a standard's content is a GAP for the SME to check against a licensed copy.

## Scope decisions

- **One blended course, six modules, 13 teaching lessons.** Module 1 safe start and the three floor families; Module 2 floor identification and chemistry by compatibility; Module 3 machines and the approved setup record; Module 4 tile, stone and grout; Module 5 resilient and timber floors; Module 6 quoting, handover and the practical day. Each module ends with a check; Module 6 ends with the 20-question final exam.

- **Australia and New Zealand.** Each country is stated where rules differ. Power is a nominal 230 V; worked examples use a 10 A outlet figure. Units are metric first.

- **Credential settings.** status draft, isPublished false, cecHours 0, iicrcDiscipline null, meta.standard v1, role path carpet-and-floors, price A$495 (founder to confirm), level Foundational, category Cleaning.

- **standardLevel L2-practitioner.** The course teaches a practical task that is assessed on a supervised practical day, so L2 applies. L1 (awareness) would not cover the task and L3 (specialist) would imply assessed independent judgement on hazardous or high-value work, which this draft deliberately avoids. The pack's own three internal levels cannot be modelled in one course and are listed as an open item.

- **durationHours 3.** The stated hours cover the online part only. Floor 5.3 needs evidenced minutes of at least 50 percent of that figure; the audit measures 89 percent. The supervised practical day sits outside the stated hours. The pack's total of about 8 hours, and its 8 h 10 min against 8 h timetable discrepancy, are listed for the SME.

- **Pass mark 80 percent.** The CARSI Course Standard sets 80 percent (founder decision of 02/11/2026). The pack proposed 90 percent with six must-pass questions; the platform cannot enforce must-pass questions, so it is an open founder decision.

- **Pre-course quiz.** A separate pre-course quiz would block completion, so the 15 pre-course questions became the Module 1 check.

- **Designation.** No designation in `data/seed/designations.json` covers hard floors, so `meta.designation` is not set.

- **Asbestos is held.** Identify, presume, stop and refer. No work method is taught for suspected asbestos. The asbestos percentage in vinyl tiles, the register question and the licence class are GAP or omitted rather than stated.

- **No universal figures.** The pack's pH windows, rpm values, pad ladder, pressure figures, strip cycle and 'pH 7 to 8 before sealing' are dropped or held as GAP. One flooring maker's guide supplies attributed examples only, such as 300 rpm or lower for its own product and a neutral cleaner reading of pH 6 to 8 for that maker's cleaner.

- **No products named.** Equipment is taught by class.

- **Assets.** Thirteen diagrams are original SVG files with the CARSI wordmark; seven field downloads are Markdown. No review-pack file, DOCX, PDF, image, zip or media is committed.

## Ledger at a glance (16/11/2026)

| Status | Entries | Meaning |
| --- | ---: | --- |
| VERIFIED | 65 | A primary or named source was opened on 16/11/2026 and supports the claim (quote of 25 words or fewer). |
| JUSTIFIED | 39 | CARSI arithmetic, a labelled illustrative figure, or a course policy with stated reasoning and the best available source. |
| GAP | 25 | Not yet verifiable here. **Every GAP blocks go-live.** |

Validate with `node scripts/audit/validate-ledger.mjs data/courses/hard-floor-care/v1-draft/evidence/evidence-ledger.jsonl` (exit 0).

## Sources opened this session (16/11/2026)

| Source | Verified claims |
| --- | ---: |
| [Australian stone supplier guide, How to clean natural stone without damaging it](https://www.tnstone.com.au/resources/how-to-clean-natural-stone/) | 7 |
| [Australasian Timber Flooring Association, Floor care and maintenance (2016, hosted by Resene)](https://www.resene.com/archspec/datasheets/ProSelect-tech-info/pdf/ATFA-Floor-Care-and-maintenance.pdf) | 13 |
| [Godfrey Hirst, Maintenance Recommendations for Commercial Sheet Vinyl, Australia / New Zealand (August 2022)](https://res.cloudinary.com/gh/image/upload/v1/products/488344/docs/care-and-maintenance/guide.pdf) | 20 |
| [NSW Government, When was asbestos banned in Australia?](https://www.asbestos.nsw.gov.au/safety/safety-in-the-home/when-was-asbestos-banned-in-australia) | 2 |
| [WorkSafe New Zealand, Asbestos in Aotearoa New Zealand](https://www.worksafe.govt.nz/topic-and-industry/asbestos/asbestos-information-for-homeowners/asbestos-in-aotearoa-new-zealand/) | 4 |
| [Safe Work Australia, Model Code of Practice: How to manage and control asbestos in the workplace](https://www.safeworkaustralia.gov.au/system/files/documents/1705/mcop-how-to-manage-and-control-asbestos-in-the-workplace-v1.pdf) | 3 |
| [Safe Work Australia, Duties of a PCBU](https://www.safeworkaustralia.gov.au/law-and-regulation/duties-under-whs-laws/duties-pcbu) | 1 |
| [New Zealand Legislation, Health and Safety at Work Act 2015, section 36](https://www.legislation.govt.nz/act/public/2015/0070/latest/DLM5976895.html) | 1 |
| [Safe Work Australia, Manage the risks](https://www.safeworkaustralia.gov.au/duties-tool/construction/pcbu/manage-risks) | 1 |
| [Safe Work Australia, Safety data sheets](https://www.safeworkaustralia.gov.au/safety-topic/hazards/chemicals/safety-data-sheets) | 2 |
| [Safe Work Australia, Slips, trips and falls](https://www.safeworkaustralia.gov.au/safety-topic/hazards/slips-trips-and-falls) | 1 |
| [NSW Poisons Information Centre, About](https://www.poisonsinfo.nsw.gov.au/about) | 1 |
| [SafeWork NSW, Electrical inspection and testing](https://www.safework.nsw.gov.au/hazards-a-z/electrical-and-power/electrical-inspection-and-testing) | 2 |
| [ACO Drain, Understanding slip resistance (secondary summary of AS 4586)](https://acodrain.com.au/understanding-slip-resistance/) | 0 (opened; both claims held as GAP) |
| [Inland Revenue New Zealand, GST](https://www.ird.govt.nz/gst) | 1 |
| [ATO, How GST works](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/how-gst-works) | (same claim as the Inland Revenue row) |
| [National Poisons Centre New Zealand, Contact](https://poisons.co.nz/contact/) | 1 |
| [New Zealand Police, 111 Emergency Services](https://www.police.govt.nz/call-111) | 1 |
| [NSW EPA, Guidance for stormwater management: the drain is just for rain](https://www.epa.nsw.gov.au/Your-environment/Water/The-drain-is-just-for-rain) | 4 |

## Open GAPs

25 GAP entries are listed with their reasons in `docs/sign-off/hard-floor-care-practitioner-sme-checklist.md`, together with the open decisions. Held pack questions are listed there too.

## Tool notes

- `check:quiz-balance` and `check:sources` scan only the seed folder and docs, so they do not see this draft folder. The balance rules were applied by the build and re-checked with the guard's own exported function.

- `check:course-diagrams` needs a Playwright browser; run it with the browser path variable unset if the default path has no browser installed.
