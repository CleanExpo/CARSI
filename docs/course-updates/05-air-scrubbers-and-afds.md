# Course update draft — Using Air Scrubbers and AFDs to Improve Job Site Air Quality (non-CEC)

**Course:** Using Air Scrubbers and AFDs to Improve Job Site Air Quality
**Type:** Non-CEC (no IICRC discipline / CEC-hours claim)
**Drafted:** 2026-07-11 · via nexus-copywriter standard · freshness lane: **Exa** (5 sources; Tier-1 IICRC S520 + CDC, Tier-2 trade)
**Status:** DRAFT — founder review before any DB apply. Live DB is source of truth; never seed on deploy.
**Data currency:** July 2026 — every figure/claim carries a **live source link** (see *Sources & Get the latest* below); open the link to obtain the **current** version. Source-URL backfill **complete** (Exa pass 2026-07-12).

---

## Block 1 · Brief context
- **Surface:** CARSI LMS course content (new "Scrubber vs negative-air", "The number that matters (ACH)" and a worked sizing example).
- **Brand / voice:** CARSI — Sage · educator · standards authority. Founder voice permitted.
- **Audience:** restoration / remediation technicians placing air-filtration devices on job sites.
- **AU English; imperial units kept where the standards/formulas are US-defined (CFM, sq ft), metric where natural.**

## Block 2 · Evidence map (claim → source → tier → tag)

| # | Claim | Source | Tier | Tag |
|---|---|---|---|---|
| E1 | An **AFD** filtering + recirculating air is an **air scrubber**; one filtering + creating negative pressure is a **negative air machine** — same core machine (fan + HEPA), different setup | IICRC S520 standard (definitions) | 1 (standard) | [VERIFIED] |
| E2 | **HEPA** = removes **99.97% of particles at 0.3 microns** | IICRC S520 | 1 | [VERIFIED] |
| E3 | IICRC **S520 minimum is 4 ACH** (air changes per hour), higher as conditions demand; **6 ACH is a practical baseline** for non-excessive contamination; **S500 points to S520** for AFD guidance on water jobs | IICRC S520 + Reets Drying Academy (Apr 2026) | 1/2 | [VERIFIED] |
| E4 | **Sizing formula:** CFM required = (room volume in ft³ × ACH) ÷ 60. Worked: a 10,000 ft³ space at 6 ACH needs **1,000 CFM**; a 600-CFM unit covers 1,000 ÷ 600 = **1.67 → round up to 2 units** | Reets Drying Academy; US Cleaning Tools calculator | 2 | [VERIFIED] |
| E5 | **Application-specific ACH:** general air cleaning ~2–4; mould remediation 4–6 (S520); asbestos 4 min + **negative pressure** (EPA 40 CFR 763); active construction/demolition 6–12 (ICRA) | US Cleaning Tools (citing S520/EPA/ICRA) | 2 (citing Tier-1) | [VERIFIED] |
| E6 | **CDC air-change table:** at 6 ACH it takes ~46 min to clear 99% of an airborne contaminant (~69 min for 99.9%); at 12 ACH ~23 min — proves why ACH is a *time-to-clean* lever, not just a number | CDC Infection Control Appendix B (Table B.1) | 1 (CDC) | [VERIFIED] |
| E7 | On a **potentially contaminated cavity**, use negative pressure with an in-line HEPA before exhausting into the structure; **never positively pressurise a contaminated cavity** (spreads contamination) | IICRC S520 §5.6 | 1 | [VERIFIED] |
| E8 | **Filter cadence:** pre-filters every 1–3 days (daily in heavy dust), secondary weekly–monthly, HEPA 6–12 months; a clogged pre-filter kills CFM and prematurely loads the expensive HEPA | US Cleaning Tools guide | 2 | [VERIFIED] |

## Block 3 · Draft content

### 3a. New section — "Same machine, two jobs: scrubber vs negative-air"
> An air-filtration device (AFD) is a fan pulling air through a HEPA filter. What you *call* it depends
> only on how you set it up. Run it recirculating filtered air back into the room and it's an **air
> scrubber** — you're cleaning the air. Duct its exhaust outside a sealed containment and it becomes a
> **negative air machine** — now the room sits at lower pressure than everywhere around it, so
> contaminated air flows *in* and can't leak out. Mould and asbestos work needs the negative-pressure
> setup; general air cleaning doesn't. HEPA itself means one thing: 99.97% of particles at 0.3 microns.

### 3b. New section — "The number that actually matters: ACH"
> Everything about sizing comes down to **air changes per hour (ACH)** — how many times you filter the
> whole room's air volume each hour. IICRC S520 sets a **minimum of 4**, and **6 is the sensible
> baseline** for a job without heavy contamination. It's a *time* lever: the CDC's own figures show 6
> ACH clears 99% of an airborne contaminant in about 46 minutes, while 12 ACH does it in about 23. More
> air changes, faster clean — which is why heavily contaminated or occupied-adjacent jobs run higher.

### 3c. New section — "Sizing it right (the formula, worked)"
> **CFM you need = (room volume in cubic feet × ACH) ÷ 60.**
> Take a 10,000 ft³ space you want at 6 ACH: (10,000 × 6) ÷ 60 = **1,000 CFM**. If your scrubber is
> rated 600 CFM, then 1,000 ÷ 600 = 1.67 — so you place **two units**, not one. Do this on paper before
> you set up and your equipment count is defensible in the file, your documentation is stronger, and you
> get paid for the gear you actually installed.
>
> **ACH by job type:** general air cleaning 2–4 · mould remediation 4–6 (S520) · asbestos 4+ with
> negative pressure (EPA) · active construction/demolition 6–12 (ICRA).

### 3d. Field-discipline box
> - **Never positively pressurise a contaminated cavity** — you'll push contamination into clean space.
>   Draw cavity air out under negative pressure through an in-line HEPA before exhausting into the structure.
> - **Change pre-filters early and often** (every 1–3 days, daily in demolition dust). A clogged pre-filter
>   quietly kills your CFM — so your real ACH drops below what you documented — and it wears out the costly HEPA early.
> - **Match the setup to the job:** recirculate to clean air; duct-out to contain.

### 3e. "Interesting fact" hook
> Two identical machines sitting side by side can do opposite jobs — one cleans the air, the other locks
> contamination inside a room — and the only difference is where you point the exhaust hose. Get that one
> decision wrong on a mould job and your "air scrubber" is quietly pushing spores into the rest of the house.

## Block 4 · Pre-gate self-audit (NEVER-list)
| Rule | Result |
|---|---|
| No AI filler | PASS |
| No banned first-person business voice | PASS |
| No hedged/passive CTA | PASS (imperative box + formula) |
| No unverified claim as fact | PASS (S520/CDC/EPA cited; figures sourced) |
| AU English | PASS (imperial kept only where the standard/formula defines it) |
| No feature-list-without-job | PASS (every figure ties to a placement decision) |
| Interesting-fact is a real hook | PASS (3e = contrarian/stakes) |
| No CEC/IICRC-approval claim | PASS (S520/S500 cited as reference standards only) |

**Overall: PASS** → forward to founder review + brand-guardian.

## Block 5 · Considered & rejected
1. **Air-scrubber product roundup** — rejected; sizing *method* + the ACH formula travel across every
   brand and don't date, unlike a model list.
2. **Metric-only rewrite** (m³, L/s) — rejected for now; the S520/CDC formulas and unit ratings are
   CFM/ft³-defined, so converting would introduce rounding error against the sources. Flagged for a
   possible metric companion note.

## Conversion / learning hypothesis (M-2)
- **Metric:** quiz pass-rate on the ACH sizing formula + usefulness rating.
- **Target:** +5 pts over 30 days post-apply.
- **Kill threshold:** revert added sections if usefulness drops; keep the cavity/negative-pressure safety rule regardless.
- **Next variant:** if flat, add an interactive CFM calculator widget spec.

## Sources & Get the latest — student-facing (data current as at July 2026)

> **For students — get the latest:** every source below is a **live link**. Open it to obtain the **current** version. Data compiled **July 2026**; standards, statistics and figures change, so treat the linked source as the live source of truth and re-check before relying on a figure.

- [T1] IICRC S520 (E1, E2, E3, E7) — *ANSI/IICRC S520 Standard for Professional Mold Remediation* (Fourth Edition: 2024 — current; official IICRC page, cited nominatively): https://iicrc.org/s520/
- [T2] Reets Drying Academy (E3, E4) — *How to Calculate Air Filtration Devices (AFDs) the Right Way* (published Apr 2026): https://reetsdryingacademy.com/blog/how-to-calculate-air-filtration-devices-afds-the-right-way/
- [T2] US Cleaning Tools — calculator (E4) — *Air Scrubber Calculator* (live tool; ACH/CFM sizing): https://uscleaningtools.com/pages/air-scrubber-calculator
- [T2] US Cleaning Tools — guide (E5, E8) — *What Are Air Exchanges Per Hour (ACH)?* (published Feb 2026; application ACH + filter cadence): https://uscleaningtools.com/blogs/guides/air-exchanges-per-hour
- [T1] CDC (E6) — *Guidelines for Environmental Infection Control in Health-Care Facilities — Appendix B. Air, Table B.1 (ACH and time to remove airborne contaminants)*: https://www.cdc.gov/infection-control/hcp/environmental-control/appendix-b-air.html
- [T1] EPA / 40 CFR 763 (E5, asbestos) — *eCFR Title 40 Part 763 — Asbestos* (current consolidated regulation text): https://www.ecfr.gov/current/title-40/part-763
- [T2] ICRA (E5, active construction/demolition) — *ASHE ICRA 2.0 Matrix of Precautions for Construction, Renovation and Operations* (current toolkit): https://www.ashe.org/icra2

## Apply notes
- Confirm slug + `id` in live DB (title "Using Air Scrubbers and AFDs to Improve Job Site Air Quality").
- Target `lms_lessons.content` / new module; no deploy-time seeder. `brand-guardian` before publish.
