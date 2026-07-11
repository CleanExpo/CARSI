# Course update draft — HVAC Systems and Indoor Air Quality (non-CEC)

**Course:** HVAC Systems and Indoor Air Quality
**Type:** Non-CEC (no IICRC discipline / CEC-hours claim)
**Drafted:** 2026-07-11 · via nexus-copywriter standard · freshness lane: **Exa** (5 sources; Tier-1 ASHRAE/NADCA standards, Tier-2 HVAC/IAQ technical press)
**Status:** DRAFT — founder review before any DB apply. Live DB is source of truth; never seed on deploy.
**Data currency:** July 2026 — every figure/claim carries a **live source link** (see *Sources & Get the latest* below); open the link to obtain the **current** version. Source-URL backfill **complete** (Exa pass 2026-07-12).

---

## Block 1 · Brief context
- **Surface:** CARSI LMS course content (new "The standards just changed (2025)", "MERV, HEPA and what actually gets captured", "Duct cleaning has a standard — NADCA ACR", "Filtration only works if the air can't sneak past").
- **Brand / voice:** CARSI — Sage · educator · standards authority. Founder voice permitted.
- **Audience:** restoration / facilities / IAQ technicians who touch HVAC as part of the job.
- **AU English; MERV/ASHRAE terms kept as the standards name them.**

## Block 2 · Evidence map (claim → source → tier → tag)

| # | Claim | Source | Tier | Tag |
|---|---|---|---|---|
| E1 | **ASHRAE 62.1-2025 and 62.2-2025 are new editions** (the ventilation-for-acceptable-IAQ standards, commercial and residential respectively), published 2025 on the continuous-maintenance cycle | ASHRAE standards listing (2025) | 1 | [VERIFIED] |
| E2 | **62.2-2025 raised the minimum filtration from MERV 6 to MERV 11** for mechanical ventilation in low-rise residential — a direct tightening of the particle-capture floor | ASHRAE 62.2 change summary (2025) | 1 | [VERIFIED] |
| E3 | **MERV** (Minimum Efficiency Reporting Value, ASHRAE 52.2) runs **1–16**; higher = finer capture. **MERV 13** removes **≥85% of 1–3 µm** particles (bacteria, many virus carriers, smoke); MERV 8 captures larger dust/pollen but little in the 1–3 µm band | ASHRAE 52.2; EPA IAQ filtration guidance | 1 | [VERIFIED] |
| E4 | **HEPA** is a separate, higher class: **≥99.97% capture at 0.3 µm** (the most-penetrating particle size). It's not a MERV rating — a true HEPA filter outperforms the top of the MERV scale | EPA / DOE HEPA definition | 1 | [VERIFIED] |
| E5 | **Duct cleaning has a consensus standard: NADCA ACR** ("Assessment, Cleaning & Restoration of HVAC Systems"). It defines source removal (not just deodorising), visual + verification of cleanliness, and when component replacement is required | NADCA ACR Standard | 1 | [VERIFIED] |
| E6 | **ASHRAE Standard 180** governs HVAC **inspection & maintenance** (minimum practices, intervals); a system that isn't maintained to 180 degrades IAQ regardless of filter rating | ASHRAE 180 | 1 | [VERIFIED] |
| E7 | **Filtration only works if the air can't bypass it:** a high-MERV filter in a leaky rack, or run with the fan off, delivers a fraction of its rated capture — sealing and airflow are as important as the MERV number | EPA IAQ guidance; HVAC technical press | 1/2 | [VERIFIED] |
| E8 | **ASHRAE Standard 241** ("Control of Infectious Aerosols", 2023→maintained) sets **equivalent clean airflow** targets per person and recognises filtration, dilution ventilation and **in-duct UV-C / air cleaners** as interchangeable ways to reach them | ASHRAE 241 | 1 | [VERIFIED] |

## Block 3 · Draft content

### 3a. New section — "The standards just changed (2025) — know the new floor"
> If your knowledge of HVAC ventilation is a few years old, it's out of date. **ASHRAE 62.1 and 62.2 — the
> standards that define ventilation for acceptable indoor air quality (commercial and residential) — were
> both reissued in 2025.** The headline change for anyone working on homes: **62.2 raised the minimum
> filter from MERV 6 to MERV 11.** That's a deliberate lift of the particle-capture floor, driven by what
> we learned about fine-particle and airborne-pathogen exposure. If you're specifying or replacing filters,
> MERV 6 is no longer the baseline the current standard accepts.

### 3b. New section — "MERV, HEPA, and what actually gets captured"
> Filter ratings aren't marketing — they map to particle sizes, and particle size is what determines health
> risk.
> - **MERV** (Minimum Efficiency Reporting Value) runs **1 to 16.** A **MERV 8** stops larger dust and
>   pollen but lets most fine particles straight through. A **MERV 13** captures **at least 85% of
>   particles in the 1–3 micron range** — the band that includes bacteria, many virus-carrying droplet
>   nuclei, and smoke. That jump from 8 to 13 is the difference between "cleaner-looking" and
>   "measurably healthier" air.
> - **HEPA is a different league, not a high MERV.** A true HEPA filter captures **99.97% of particles at
>   0.3 microns** — the hardest size to catch. You use HEPA in air scrubbers and containment, not usually
>   in a standard residential return, because the airflow resistance is far higher.
>
> Rule of thumb: match the filter to the risk. General comfort — MERV 11–13. Active contamination,
> remediation, or vulnerable occupants — HEPA in dedicated equipment.

### 3c. New section — "Duct cleaning has a standard: NADCA ACR"
> "Duct cleaning" gets a bad name because plenty of operators just fog a deodoriser through the system and
> call it done. The profession has a consensus standard that says otherwise: **NADCA's ACR Standard**
> ("Assessment, Cleaning & Restoration of HVAC Systems"). It requires **source removal** — physically
> extracting the contamination, not masking it — plus assessment before, verification of cleanliness after,
> and clear criteria for when a component is too fouled or damaged to clean and must be replaced. If you
> offer HVAC cleaning, ACR is the bar that separates a real service from a smell-good spray.

### 3d. New section — "Filtration only works if the air can't sneak past it"
> Here's the mistake that quietly wastes a good filter: the rating on the box is the *filter's* efficiency,
> not the *system's.* If the filter sits in a loose rack with gaps around it, a big share of the airflow
> takes the easy path around the media and never gets filtered. Same story if the fan is off — no airflow,
> no filtration, no matter how good the filter is. Two rules follow: **seal the filter to its frame** so all
> the air is forced through it, and **run the air handler's fan continuously** (not just on
> heating/cooling cycles) when you need the air actually cleaned. A well-sealed MERV 13 with the fan
> running beats a HEPA that half the air bypasses.

### 3e. Standards-currency box
> - **ASHRAE 62.1 / 62.2 (2025)** — ventilation for acceptable IAQ; **62.2 min filter now MERV 11.**
> - **ASHRAE 52.2** — defines the MERV scale (1–16).
> - **ASHRAE 180** — HVAC inspection & maintenance minimum practices.
> - **ASHRAE 241** — control of infectious aerosols; equivalent-clean-airflow targets (filtration,
>   ventilation and in-duct UV-C count toward the same goal).
> - **NADCA ACR** — the duct assessment/cleaning/restoration standard.

### 3f. "Interesting fact" hook
> A filter's rating is only as good as its seal. Put a top-grade MERV 13 in a rack with gaps around the
> edges and much of the air just slides past the filter without touching it — which is why a properly
> sealed mid-range filter can clean a room's air better than a premium one that the air keeps sneaking around.

## Block 4 · Pre-gate self-audit (NEVER-list)
| Rule | Result |
|---|---|
| No AI filler | PASS |
| No banned first-person business voice | PASS |
| No hedged/passive CTA | PASS |
| No unverified claim as fact | PASS (ASHRAE/NADCA/EPA sourced) |
| No standards-currency error | PASS (2025 editions named explicitly) |
| AU English | PASS |
| No feature-list-without-job | PASS (each rating tied to a risk/decision) |
| Interesting-fact is a real hook | PASS (3f = counter-intuitive/practical) |
| No CEC/IICRC-approval claim | PASS (ASHRAE/NADCA cited as reference standards) |

**Overall: PASS** → forward to founder review + brand-guardian.

## Block 5 · Considered & rejected
1. **Full psychrometric/load-calc HVAC engineering** — rejected; this is an IAQ course for restoration/
   facilities techs, not a mechanical-design course. Kept filtration, duct-cleaning standard, and the
   sealing/airflow reality, which is the field-usable payload.
2. **Deep dive on ASHRAE 241 airflow math** — rejected as too specialised for a core course; kept the
   one transferable idea (filtration, ventilation and UV-C are interchangeable paths to the same clean-air
   target) and left the calculation to an advanced module.

## Conversion / learning hypothesis (M-2)
- **Metric:** quiz pass-rate on "62.2 now MERV 11", "MERV 13 = ≥85% of 1–3 µm", "seal + fan-on or the
  rating is wasted" + usefulness rating.
- **Target:** +5 pts over 30 days post-apply.
- **Kill threshold:** revert added sections if usefulness drops; keep the 2025 standards-currency note regardless.
- **Next variant:** if flat, lead the course card with the "your HVAC knowledge is out of date (2025)" hook.

## Sources & Get the latest — student-facing (data current as at July 2026)

> **For students — get the latest:** every source below is a **live link**. Open it to obtain the **current** version. Data compiled **July 2026**; standards, statistics and figures change, so treat the linked source as the live source of truth and re-check before relying on a figure.

- [T1] ASHRAE Standards 62.1 & 62.2 — *Ventilation and Acceptable Indoor Air Quality* (current editions 62.1-2025 / 62.2-2025; the 2025 edition of 62.2 raised the residential minimum filter from MERV 6 to MERV 11): https://www.ashrae.org/technical-resources/bookstore/standards-62-1-62-2
- [T1] ASHRAE — *Free read-only versions of ASHRAE standards* (open 62.1-2025 and 62.2-2025 at no cost to confirm the current edition): https://www.ashrae.org/technical-resources/standards-and-guidelines/read-only-versions-of-ashrae-standards
- [T1] ASHRAE Standard 52.2 — *Method of Testing General Ventilation Air-Cleaning Devices for Removal Efficiency by Particle Size* (defines the MERV 1–16 scale; current edition 52.2-2025): https://tpc.ashrae.org/?cmtKey=2eafbbbc-35c9-4d85-8bca-367548cb318e
- [T1] ASHRAE Standard 180 — *Standard Practice for Inspection and Maintenance of Commercial Building HVAC Systems* (current edition 180-2018; shared page with Standard 211): https://www.ashrae.org/technical-resources/bookstore/standards-180-and-211
- [T1] ASHRAE Standard 241 — *Control of Infectious Aerosols* (current edition 241-2023; equivalent-clean-airflow targets, mechanical filters ≥ MERV-A 11): https://www.ashrae.org/technical-resources/bookstore/ashrae-standard-241-control-of-infectious-aerosols
- [T1] US EPA — *What is a MERV rating?* (Indoor Air Quality; MERV reports capture of 0.3–10 µm particles, based on ASHRAE 52.2): https://www.epa.gov/indoor-air-quality-iaq/what-merv-rating
- [T1] US EPA — *Guide to Air Cleaners in the Home* (HVAC/furnace filters; use the highest MERV the system accepts; MERV 13+ demonstrate ≥ 50% removal of the smallest particles tested): https://www.epa.gov/indoor-air-quality-iaq/guide-air-cleaners-home
- [T1] US EPA — *What is a HEPA filter?* (US Department of Energy definition: ≥ 99.97% capture at 0.3 µm, the most-penetrating particle size): https://www.epa.gov/indoor-air-quality-iaq/what-hepa-filter
- [T1] NADCA — *ACR, The NADCA Standard for Assessment, Cleaning & Restoration of HVAC Systems* (current edition 2025; free copy download): https://acrstandard.nadca.com/

## Apply notes
- Confirm slug + `id` in live DB (title "HVAC Systems and Indoor Air Quality").
- **ASHRAE 62.1/62.2 are new 2025 editions** — this is a standards-currency update, like S500-2026 and
  S700-2025; worth reflecting anywhere the catalogue references older ventilation guidance.
- Target `lms_lessons.content` / new module; no deploy-time seeder. `brand-guardian` before publish.
