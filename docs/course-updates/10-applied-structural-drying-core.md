# Course update draft — Applied Structural Drying — Core Concepts (non-CEC)

**Course:** Applied Structural Drying — Core Concepts
**Type:** Non-CEC (no IICRC discipline / CEC-hours claim)
**Drafted:** 2026-07-11 · via nexus-copywriter standard · freshness lane: **Exa** (5 sources; Tier-1 IICRC S500 + Tier-2 restoration technical press)
**Status:** DRAFT — founder review before any DB apply. Live DB is source of truth; never seed on deploy.
**Data currency:** July 2026 — every figure/claim must carry a **live source link** so students can open it and obtain the **current** version. **This draft predates the URL-in-sources standard: its sources are named in the Block 2 evidence map but not yet linked — queued for the source-URL backfill pass (see README).**

---

## Block 1 · Brief context
- **Surface:** CARSI LMS course content (new "Drying is vapour-pressure management", "GPP: the number that doesn't lie", "LGR vs desiccant", "When is it dry?").
- **Brand / voice:** CARSI — Sage · educator · standards authority. Founder voice permitted.
- **Audience:** restoration technicians learning structural-drying science.
- **AU English; °F/GPP kept where the S500 defines them, °C in brackets.**

## Block 2 · Evidence map (claim → source → tier → tag)

| # | Claim | Source | Tier | Tag |
|---|---|---|---|---|
| E1 | Drying works by **manipulating the vapour-pressure differential**: moisture moves from high to low vapour pressure, so sustaining a low-vapour-pressure environment pulls moisture out of materials into the air where the dehu captures it | Restoration Intel structural-drying guide (2026) | 2 | [VERIFIED] |
| E2 | **Warm air holds more moisture** — a cubic foot at 70°F holds >2× the moisture of 40°F air; heat accelerates evaporation by widening the vapour-pressure gap, not by drying materials directly. S500 target drying-zone temp **70–90°F (21–32°C)** for refrigerant dehus | Restoration Intel; IICRC S500 | 2/1 | [VERIFIED] |
| E3 | **GPP (grains per pound)** = absolute water-vapour mass per pound of dry air (1 lb water = 7,000 grains). Unlike RH it's temperature-independent, so it's the **primary progress metric** | Restoration Intel | 2 | [VERIFIED] |
| E4 | A working dehu shows an **inlet-to-outlet delta of 15–30+ GPP**; a **delta below 5 GPP** means it's at its limit (or the air's already dry / unit undersized / out of temp range / faulty) | Restoration Intel | 2 | [VERIFIED] |
| E5 | **LGR vs desiccant:** conventional refrigerant dehus stop removing meaningful moisture ~50–60 GPP; **LGR** (double-cooling) works down to ~20–25 GPP — the range needed for final drying; **desiccant** uses chemical adsorption, has *no lower temperature limit* and removes moisture below 20 GPP | Restoration Intel | 2 | [VERIFIED] |
| E6 | **Airflow changes by phase:** ~600 FPM during constant-rate (surface evaporation) drying, then **drop to ~150 FPM** in the falling-rate phase (deep-migration limited) and add heat/dehumidification — excessive airflow can *impede* drying dense low-permeance materials | C&R Magazine on S500 Ch.12 (2025) | 2 (on Tier-1 standard) | [VERIFIED] |
| E7 | **Dry standard vs drying goal:** dry standard = estimated pre-loss moisture (measure the same material in an unaffected room); drying goal = the target the restorer sets (at or above the dry standard) that prevents microbial growth. Done = all monitored materials **within 2–4% of the dry-standard reference** | MyClean/C&R Magazine on S500 §10.6.6 (2026) | 2 | [VERIFIED] |
| E8 | The **S500 2026 revision tightens verification**: the drying goal must be documented at the outset, the verification method specified, and the final reading tied back to the goal. Concrete slabs need **ASTM F2170** in-situ RH probes before flooring reinstall | Tygart Media (2026); Restoration Intel | 2 | [VERIFIED] |

## Block 3 · Draft content

### 3a. New section — "Drying is vapour-pressure management (not just blowing air)"
> Structural drying isn't "point fans at it and wait." It's applied physics: moisture always moves from
> high vapour pressure to low vapour pressure. Your whole job is to *build and hold* a low-vapour-pressure
> environment so moisture is pulled out of the wet materials into the air, where the dehumidifier can
> capture and remove it. Heat helps — but not because it dries materials directly. Warm air simply holds
> more moisture (air at 70°F holds more than twice what it holds at 40°F), which keeps the vapour-pressure
> gap steep. The S500 puts the sweet spot at 70–90°F (21–32°C) for refrigerant dehumidifiers.

### 3b. New section — "GPP: the number that doesn't lie"
> Relative humidity fools people, because it changes with temperature — warm the air and RH drops even if
> you removed no water. **Grains per pound (GPP)** is the honest metric: it's the actual *mass* of water
> vapour in the air (one pound of water = 7,000 grains) and it doesn't move with temperature. Track GPP as
> your primary progress signal. And check your dehumidifier is earning its keep by comparing the GPP going
> *in* to the GPP coming *out*: a healthy unit in an active job shows a **15–30+ GPP delta**. A delta
> **under 5** is a warning — the unit's at its limit, undersized, out of its temperature range, or the room
> is already near goal.

### 3c. New section — "LGR vs desiccant: know where each one dies"
> - **Conventional refrigerant dehus** quit removing meaningful moisture around **50–60 GPP** — the coil
>   can't get cold enough to condense below that.
> - **LGR (Low-Grain Refrigerant)** pre-cools the incoming air, extending effective removal down to
>   **~20–25 GPP** — which is exactly the dry range final structural drying needs. LGR is the professional standard.
> - **Desiccant** units adsorb moisture chemically instead of condensing it, so they have **no lower
>   temperature limit** and keep pulling moisture below 20 GPP and in cold conditions where LGRs have stopped.
>
> Match the machine to the phase: LGR for most jobs; desiccant when you need to push into very low GPP or work cold.

### 3d. New section — "Airflow isn't set-and-forget"
> Air movement changes as the job progresses. Early on (the *constant-rate* phase) surface moisture is
> evaporating fast, and roughly **600 FPM** of airflow is optimal. As the surface dries and the slow
> deep-migration (*falling-rate*) phase begins, more airflow stops helping — **drop to ~150 FPM** and lean
> on heat and dehumidification to keep the vapour-pressure gap open. On dense, low-permeance materials,
> too much airflow can actually slow you down.

### 3e. New section — "When is it dry? (say it with data)"
> "Dry" is not a feeling and not a number of equipment-days. Set a **dry standard** — measure the same
> material in an unaffected part of the building. Set a **drying goal** at or above that standard, chosen to
> prevent microbial growth. The job is done when every monitored material reads **within 2–4% of the
> dry-standard reference** — verified with a contact meter at the same marked points, a stable low-GPP
> psychrometric reading, and written documentation. For concrete slabs, that means **ASTM F2170** in-situ
> humidity probes before any flooring goes back down. Under the S500 2026 revision, the goal and the
> verification method must be documented from day one — "I wrote *dry* in the file" doesn't survive review.

### 3f. "Interesting fact" hook
> A dehumidifier can make a room's humidity reading *drop* while removing almost no water — because warming
> the air lowers the relative-humidity number without touching the actual moisture in it. That's why the
> pros ignore RH as their scoreboard and watch grains per pound instead: it's the one number the machine can't fake.

## Block 4 · Pre-gate self-audit (NEVER-list)
| Rule | Result |
|---|---|
| No AI filler | PASS |
| No banned first-person business voice | PASS |
| No hedged/passive CTA | PASS |
| No unverified claim as fact | PASS (S500 + technical press sourced) |
| AU English, metric bracketed | PASS |
| No feature-list-without-job | PASS (each spec tied to a drying decision) |
| Interesting-fact is a real hook | PASS (3f = myth-buster/revealed-insight) |
| No CEC/IICRC-approval claim | PASS (S500 cited as reference standard) |

**Overall: PASS** → forward to founder review + brand-guardian.

## Block 5 · Considered & rejected
1. **Full psychrometric-chart tutorial** — rejected for a core course; the GPP-as-primary-metric and the
   dehu-delta check are the field-usable payload, chart-reading is a deeper module.
2. **Equipment-sizing formulas (pint/AHAM ratings)** — rejected; the transferable science (vapour pressure,
   GPP, LGR/desiccant crossover) matters more than memorising sizing tables that vary by unit.

## Conversion / learning hypothesis (M-2)
- **Metric:** quiz pass-rate on "GPP not RH" and "within 2–4% of dry standard" + usefulness rating.
- **Target:** +5 pts over 30 days post-apply.
- **Kill threshold:** revert added sections if usefulness drops.
- **Next variant:** if flat, add an interactive GPP/psychrometric mini-calculator spec.

## Sources & Get the latest — student-facing (data current as at July 2026)

> **For students — get the latest:** the sources behind each claim are named in the **Block 2 evidence map** above. Data compiled **July 2026**; standards, statistics and product specs change, so always open the current published source before relying on a figure.
>
> ⚠️ **URL backfill pending.** This is an early-template draft — the canonical live-source **links** have not yet been added. It is queued for the July-2026 source-URL currency pass; do not publish to students until each source carries a clickable link to its current version.

## Apply notes
- Confirm slug + `id` in live DB (title "Applied Structural Drying — Core Concepts). **Do not brand with the
  "ASD" acronym or "-aligned" — banned by the CARSI designation rule (founder 2026-07-10); `iicrcDiscipline: null`.**
  S500 is cited nominatively only, which the rule permits.
- Reflects the S500 2026 verification tightening (see cross-cutting note in README).
- Target `lms_lessons.content` / new module; no deploy-time seeder. `brand-guardian` before publish.
