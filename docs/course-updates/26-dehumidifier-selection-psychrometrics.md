# Course update draft — Dehumidifier Selection & Psychrometrics (non-CEC)

**Course:** Dehumidifier Selection & Psychrometrics (LGR vs Desiccant)
**Type:** Non-CEC (no IICRC discipline / CEC-hours claim)
**Drafted:** 2026-07-12 · via nexus-copywriter standard · freshness lane: **Exa** (6 sources; Tier-1 psychrometric/engineering references, Tier-2 restoration technical guides — all 2025–2026)
**Status:** DRAFT — founder review before any DB apply. Live DB is source of truth; never seed on deploy.

---

## Block 1 · Brief context
- **Surface:** CARSI LMS course content (new "GPP is the metric that doesn't lie", "LGR vs desiccant — it's physics, not preference", "The inlet-to-outlet delta test", "Size on AHAM, not saturation", "When to run both").
- **Brand / voice:** CARSI — Sage · educator · standards authority. Founder voice permitted.
- **Audience:** water-damage technicians and estimators sizing and selecting dehumidification.
- **AU English; SI-first (°C primary, °F bracketed); IICRC S500 cited nominatively only.**

## Block 2 · Evidence map (claim → source → tier → tag)

| # | Claim | Source | Tier | Tag |
|---|---|---|---|---|
| E1 | **GPP (grains per pound) is the primary drying-progress metric** because it measures the *absolute* mass of water vapour in the air and — unlike relative humidity — does **not** change with temperature. 1 lb of water = 7,000 grains. A dehumidifier can raise air temperature and show a lower RH while removing little actual moisture; GPP reveals the truth | Restoration Intel; Water Restoration Authority | 1/2 | [VERIFIED] |
| E2 | **The inlet-to-outlet GPP delta is the working-unit test:** compare GPP of air entering vs exiting a running dehumidifier. A healthy unit in active drying shows **15–30+ GPP delta**; a **delta below 5 GPP** means the unit is doing nothing meaningful — undersized, out of its temperature range, environment already dry, or a fault | Restoration Intel; Water Restoration Authority | 1/2 | [VERIFIED] |
| E3 | **Conventional refrigerant** dehumidifiers stall around **50–60 GPP** and ice below ~4–7 °C (40–45 °F). **LGR (Low-Grain Refrigerant)** pre-cools incoming air before the primary coil, extending effective removal down to **~20–25 GPP** — the range required for final structural drying. This is why LGR is the restoration workhorse and conventional units are inadequate for structural drying | Restoration Intel; upperrestoration.com | 1/2 | [VERIFIED] |
| E4 | **Desiccant** units adsorb moisture chemically (silica-gel/molecular-sieve rotor) and **have no lower temperature limit** — they remove moisture at sub-zero temperatures and drive air **below 10 GPP**, well past the LGR floor. Cost: a heated regeneration stream makes them **3–5× more expensive to run** under warm conditions, and the hot, humid exhaust **must be ducted outside** or it re-wets the drying zone | Restoration Intel; upperrestoration.com; LMCCA | 1/2 | [VERIFIED] |
| E5 | **Selection is physics, not preference:** an LGR in a ~ -2 °C (28 °F) crawl space **ices over within hours and removes nothing**; a correctly sized desiccant in the same space drives the loss to goal. Desiccant is *required* below ~7 °C (45 °F), for Class 4 (bound/deep) moisture needing sub-20 GPP, and for large commercial volumes | Restoration Intel; Water Restoration Authority | 1/2 | [VERIFIED] |
| E6 | **The most common sizing error is using the saturation-condition rating instead of the AHAM rating.** A unit advertised at 200 pints/day at saturation (32 °C/90 % RH) may deliver only ~95 pints/day at AHAM conditions (27 °C/60 % RH) — the real drying environment. Scopes built on saturation ratings are **undersized by 30–50 %** | Restoration Intel | 1 | [VERIFIED] |
| E7 | **Heat and dehumidification work as a pair, not in isolation.** Running heat without dehumidification raises RH to equilibrium; running dehumidification without heat leaves dense assemblies (concrete, hardwood subfloor) too cold to evaporate. Aggressive conditions (>27 °C / 80 °F, <25 % RH) speed evaporation but risk **wood dimensional instability and drywall cracking** — hence graduated, not maximum, drying targets | Water Restoration Authority; Restoration Intel | 1/2 | [VERIFIED] |
| E8 | **On large losses, sequence the two technologies:** LGR handles bulk evaporation in the first 24–48 h while GPP is high and its efficiency advantage applies; desiccant takes over when GPP drops below the LGR floor and the remaining moisture is locked in cold/dense materials. The daily psychrometric delta signals when to hand off | Restoration Intel; uscleaningtools.com | 1/2 | [VERIFIED] |

## Block 3 · Draft content

### 3a. New section — "GPP is the metric that doesn't lie"
> Relative humidity is a liar on a drying job — not because it's wrong, but because it moves with temperature.
> Warm the air and RH drops even if you've removed no water at all. The metric that can't be fooled is **grains
> per pound (GPP)** — the *absolute* mass of water vapour in a pound of dry air (1 pound of water = 7,000
> grains). GPP doesn't care about temperature, so it's the honest measure of drying progress. Track RH if you
> like, but make decisions on GPP.

### 3b. New section — "The inlet-to-outlet delta test"
> Want to know if a running dehumidifier is actually earning its rental? Read the GPP of the air going *in* and
> the air coming *out*. A healthy unit in an active drying chamber shows a **15–30+ GPP delta**. A **delta under
> 5 GPP** is a machine doing nothing meaningful — it's either undersized for the volume, operating outside its
> effective temperature range, sitting in an environment that's already near goal, or faulty. This one reading
> tells you more than the badge on the front.

### 3c. New section — "LGR vs desiccant — it's physics, not preference"
> The two technologies remove water by completely different mechanisms, and that dictates where each wins:
> - **Conventional refrigerant** condenses water on a cold coil. It stalls around **50–60 GPP** and ices below
>   roughly **4–7 °C (40–45 °F)** — inadequate for structural drying.
> - **LGR (Low-Grain Refrigerant)** pre-cools the incoming air before the main coil, so it keeps pulling water
>   down to **~20–25 GPP** — the range you need to finish a structural dry. This is the industry workhorse.
> - **Desiccant** adsorbs water onto a silica-gel rotor, then bakes it off into an exhaust stream. It has **no
>   lower temperature limit** and reaches **below 10 GPP** — past where any refrigerant unit has quit.
>
> The tell: an LGR in a **-2 °C (28 °F)** crawl space ices up within hours and removes nothing; a correctly
> sized desiccant in the same space drives the loss to goal. Match the machine to the conditions, not to habit.

### 3d. New section — "Size on AHAM, not saturation"
> The single most expensive scoping mistake is reading the *saturation* rating off the spec sheet. Manufacturers
> quote two numbers: **saturation** (measured at ~32 °C / 90 % RH — a wet, unrealistic peak) and **AHAM**
> (measured at ~27 °C / 60 % RH — close to a real drying chamber). A unit that says "200 pints/day" at
> saturation may deliver only **~95 pints/day** at AHAM. Size your job on the AHAM figure, or you'll under-deploy
> by **30–50 %**, the material moisture will plateau, and the mould clock keeps running. Divide your total
> required removal by each unit's **AHAM** capacity — never its saturation headline.

### 3e. New section — "When to run both, and why heat matters"
> Big losses aren't an either/or. Run **LGR first** for the bulk evaporation in the first 24–48 hours while GPP
> is high and refrigerant efficiency is at its best; bring in **desiccant** once GPP drops below the LGR floor
> and the last of the water is locked in cold, dense materials like concrete and hardwood. The daily
> **psychrometric delta** tells you when to hand off. And remember heat and dehumidification are a *pair* — heat
> without dehumidification just raises RH; dehumidification without heat leaves dense assemblies too cold to
> release moisture. Push too hard (over 27 °C / 80 °F, under 25 % RH) and you risk cupping timber and cracking
> drywall — which is why the goal is *graduated* drying, not maximum evaporation.

### 3f. "Interesting fact" hook
> A dehumidifier can make a room *feel* drier while removing almost no water. Because it warms the air as it
> runs, the relative-humidity gauge falls — but the actual mass of water vapour (the GPP) barely moves. That's
> the trap that leaves "dry-looking" walls quietly feeding mould in the cavity. The professionals' fix is a
> reading you can't fake: compare the grains of moisture going *into* the machine with the grains coming *out*.
> If the difference is under 5, the machine is theatre, not drying.

## Block 4 · Pre-gate self-audit (NEVER-list)
| Rule | Result |
|---|---|
| No AI filler | PASS |
| No banned first-person business voice | PASS |
| No hedged/passive CTA | PASS |
| No unverified claim as fact | PASS (engineering + trade sources, 2025–2026) |
| AU English, SI-first with imperial bracketed | PASS (°C primary; °F/pints in brackets) |
| No feature-list-without-job | PASS (each spec tied to a selection/sizing decision) |
| Interesting-fact is a real hook | PASS (3f = RH-falls-while-GPP-holds reveal) |
| No CEC/IICRC-approval claim | PASS (S500 cited nominatively only; `iicrcDiscipline: null`) |
| No discipline-acronym branding | PASS (no WRT/ASD/etc.; "LGR" is equipment, not an IICRC designation) |
| US-specific data flagged | PASS (115 V units / °F ratings noted as US-market; AU 230 V + AS/NZS sidebar in Apply notes) |

**Overall: PASS** → forward to founder review + brand-guardian.

## Block 5 · Considered & rejected
1. **Specific unit make/model + pricing (Phoenix, Abatement, Bry-Air, USD figures)** — rejected as course
   content: US models on 115 V and USD pricing are the wrong market. Kept only the *category* physics
   (refrigerant / LGR / desiccant). AU 230 V availability + AUD pricing is a separate founder-set field.
2. **Pints-per-cubic-foot dehumidifier sizing chart (LMCCA)** — cited as a *method* (divide volume by the
   class factor) but not reproduced as a lookup table; the exact factors vary by source and by S500 edition,
   and pasting a table risks staleness. Method-over-table.
3. **Full psychrometric-chart walkthrough (dew point, wet-bulb, enthalpy)** — deferred to the Infrared
   Thermography / core-drying courses to avoid duplication; this course stays on *equipment selection*.

## Conversion / learning hypothesis (M-2)
- **Metric:** quiz pass-rate on "GPP vs RH", "the <5 GPP delta means", "LGR floor ~20–25 GPP", "size on AHAM
  not saturation", "desiccant below 7 °C" + usefulness rating.
- **Target:** +5 pts over 30 days post-apply.
- **Kill threshold:** revert added sections if usefulness drops.
- **Next variant:** if flat, lead with the inlet/outlet-delta test (3b) as the practical spine.

## Sources (verifiable audit trail — Exa-retrieved 2026-07-12)
- [T1] Restoration Intel — *Structural Drying Systems: Psychrometrics, Equipment Sizing, and LGR vs. Desiccant* (2026-03): https://restorationintel.com/structural-drying-systems-psychrometrics-lgr-desiccant-guide/
- [T1] Water Restoration Authority — *Psychrometrics in Water Restoration*: https://waterrestorationauthority.com/psychrometrics-in-water-restoration
- [T2] Upper Restoration — *LGR vs. Desiccant Dehumidifiers: Choosing the Right Tech for Commercial Water Damage* (2026-02): https://upperrestoration.com/lgr-vs-desiccant-dehumidifiers-choosing-the-right-tech-for-commercial-water-damage/
- [T2] US Cleaning Tools — *Desiccant vs LGR Dehumidifiers | Restoration Guide 2026* (2026-02): https://uscleaningtools.com/blogs/guides/desiccant-vs-lgr-dehumidifiers
- [T2] US Cleaning Tools — *LGR vs Desiccant Dehumidifiers: Contractor's Buying Guide* (2025-12): https://uscleaningtools.com/blogs/news/lgr-vs-desiccant-dehumidifiers-which-do-you-need
- [T2] LMCCA — *Water Restoration: Dehumidification* (PDF, sizing method): https://lmcca.org/wp-content/uploads/2017/07/Water-Restoration-Dehumidication.pdf

## Apply notes
- Confirm slug + `id` in live DB (title covering dehumidifier selection / psychrometrics / drying science).
  `iicrcDiscipline: null`; S500 referenced **nominatively only** ("aligned to ANSI/IICRC S500") — no discipline
  acronym branding, no CEC-hours claim. If applying ever creates a NEW catalogue row, ship `cecHours: 0`.
- **AU localisation before publish (MUST):** temperatures already °C-first; convert any residual pints/day to
  **litres/day** (1 pint ≈ 0.47 L) and any USD to **AUD** at publish; specify **230 V / 50 Hz / 10 A GPO**
  units available in Australia (US 115 V models are illustrative of the *technology*, not the SKU). Add an
  **AS/NZS + Safe Work Australia** sidebar; the Australian Timber Flooring Association (ATFA) is a valid AU
  published-resource for wood-floor drying goals (it is named in S500's own reference list).
- Overlaps with core-drying / thermography courses on psychrometrics — keep this one on *equipment selection*.
- Target `lms_lessons.content` / new module; no deploy-time seeder. `brand-guardian` before publish.
