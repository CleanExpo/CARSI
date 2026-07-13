# Course update draft — Moisture Measurement & Documentation (non-CEC)

**Course:** Moisture Measurement & Documentation
**Type:** Non-CEC (no IICRC discipline / CEC-hours claim)
**Drafted:** 2026-07-12 · via nexus-copywriter standard · freshness lane: **Exa** (6 sources; Tier-1 government/standards guidance, Tier-2 restoration technical guides — 2024–2026)
**Status:** DRAFT — founder review before any DB apply. Live DB is source of truth; never seed on deploy.
**Data currency:** July 2026 — every figure/claim carries a **live source link** (see *Sources & Get the latest* below); open the link to obtain the **current** version. Where an authoritative source predates July 2026, it is the current published edition, linked so students can get any update.

---

## Block 1 · Brief context
- **Surface:** CARSI LMS course content (new "Pin vs pinless — pick the right one", "Dry standard vs drying goal", "The control-sample rule", "Read in points, not percent", "If it isn't documented, it didn't happen").
- **Brand / voice:** CARSI — Sage · educator · standards authority. Founder voice permitted.
- **Audience:** water-damage technicians and project managers measuring and documenting drying.
- **AU English; SI-first (cm/mm primary, inches bracketed); IICRC S500 cited nominatively only.**

## Block 2 · Evidence map (claim → source → tier → tag)

| # | Claim | Source | Tier | Tag |
|---|---|---|---|---|
| E1 | **Two meter families, both reading electrical response to water:** **pin (penetrating)** meters push two probes into the material and measure resistance between them — precise, depth-specific, but leave pinholes; **pinless (non-penetrating)** meters project an electromagnetic field from a plate and scan without damage, fast over large areas, but **can't tell which layer or how deep** the moisture is | Mass.gov MMD guidance; R&R Magazine; Tramex | 1/2 | [VERIFIED] |
| E2 | **Match the meter to the material:** penetrating for **timber framing, sill plates, subfloor** (push pins to full ~8 mm/⁵⁄₁₆″ depth); non-penetrating for **drywall, plaster, tile, concrete, cabinetry, minimally wet hardwood** — with the caveat that **concrete and tile read "high" even when dry**, so scan broadly and hunt for *inconsistently* higher zones rather than trusting an absolute number | R&R "How to Take Moisture Readings"; R&R "Moisture Meters 101" | 2 | [VERIFIED] |
| E3 | **The dry standard vs the drying goal are different things** (ANSI/IICRC S500, §10.6.6): the **dry standard** is the reasonable pre-loss moisture level of that material, best estimated by reading the *same* material in an unaffected area; the **drying goal** is the target you set for equipment removal — it may be **at or above** the dry standard, and must be reasonable, not an exact pre-loss number | My Clean Magazine (S500 §10.6.6); Accuserve | 1/2 | [VERIFIED] |
| E4 | **The control-sample rule:** always measure the *same* material in an unaffected ("control") location for comparison — a reading is only meaningful against a baseline. Sample gypsum from the **base of the wall upward at ~75 mm (3″) intervals** to map how far water has wicked; mark the dry line | Mass.gov MMD guidance; Tramex | 1/2 | [VERIFIED] |
| E5 | **Read in "points", not "percent":** most electrical meters are **only calibrated for wood** — a drywall/plaster/concrete reading is **comparative, not a true moisture-content %.** Communicate as points against the control ("affected wall = 99 points, unaffected = 14 points; dry when it returns to 14") to avoid implying a false precision | R&R "How to Take Moisture Readings" | 2 | [VERIFIED] |
| E6 | **Timber target: below ~20 % MC to inhibit microbial growth** (USDA Wood Handbook: framing dried to ~15 %, not exceeding 19 %); a practical safety margin is **<17 %.** A reading **within 4 points** of the drying goal is within S500's stated margin of error and can be deemed dry | Accuserve (USDA + S500) | 1/2 | [VERIFIED] |
| E7 | **Readings are affected by real-world interference:** surface coatings, salts, metals behind the material (false positives), density variation, temperature and species. Meters need **regular calibration**, the **same meter used throughout a project**, and consistent technique (same depth, even pressure) | R&R "Moisture Meters 101"; My Clean Magazine (S500 meter-limitations) | 1/2 | [VERIFIED] |
| E8 | **Documentation is the deliverable, not an afterthought:** record dry standard, material + assembly, measurement location, meter type/model, daily readings and psychrometric conditions — with **first-day and last-day photos** of the readings. "If the documentation doesn't support the conclusion, the conclusion may not survive review." Moisture mapping ties every reading to a grid location and to the drying goal | My Clean Magazine; Tramex; Accuserve | 1/2 | [VERIFIED] |
| E9 | **Meters find spots; cameras find fields.** A moisture meter only reads where you place it; an **infrared camera** finds trapped moisture behind walls/ceilings to *direct* where to meter — the two are complementary, and the drying goal is confirmed with the *meter*, not the camera | R&R "Moisture Meters 101"; Tramex | 2 | [VERIFIED] |

## Block 3 · Draft content

### 3a. New section — "Pin vs pinless — pick the right one"
> There are two meter families, and they answer different questions. A **pin (penetrating)** meter pushes two
> probes into the material and measures the electrical resistance between them — precise, tells you the moisture
> at a *specific depth*, but it leaves pinholes. A **pinless (non-penetrating)** meter projects a field from a
> flat plate and scans without a mark — fast across a whole wall, but it **can't tell you which layer is wet or
> how deep the water goes.** Use the pinless to *find* the problem quickly, and the pin to *confirm* it at depth.
> Neither is "better" — they're different tools for different moments in the job.

### 3b. New section — "Match the meter to the material"
> - **Penetrating (pins):** timber framing, sill plates, subfloor. Push the pins to full depth (~8 mm / ⁵⁄₁₆″).
> - **Non-penetrating (plate):** drywall, plaster, tile, concrete, cabinetry, minimally wet hardwood.
>
> One trap worth memorising: **concrete and ceramic tile read "high" even when they're dry.** Don't chase the
> absolute number on those materials — scan a large area and look for zones reading *inconsistently* higher than
> the rest. And watch for metal behind drywall: it throws a false positive on a pinless meter every time.

### 3c. New section — "Dry standard vs drying goal"
> These two terms get used interchangeably and shouldn't be. The **dry standard** is your best estimate of what
> that material read *before* the loss — you find it by measuring the *same* material somewhere the water never
> reached. The **drying goal** is the target you'll dry *to* before pulling equipment. The goal can sit **at or
> above** the dry standard: not every material has to return to an exact pre-loss number to be acceptable — it
> has to reach a level that returns the assembly to acceptable condition and inhibits mould. For timber, that's
> **below ~20 % MC** (a practical margin is under 17 %), and a reading **within 4 points** of goal counts as dry.

### 3d. New section — "The control-sample rule"
> A single reading means nothing on its own — it only means something against a baseline. So the discipline is:
> for every affected material, measure the **same material in an unaffected area** (the control). On a wet wall,
> start at the **base and work upward at about 75 mm (3″) intervals** until the reading matches the control —
> that's how far the water wicked, and it tells you where to cut. Mark the dry line. Then return to the *exact
> same spots* each day so you're tracking a trend, not comparing apples to oranges.

### 3e. New section — "Read in points, not percent — and document everything"
> Here's a precision trap: most electrical moisture meters are **only calibrated for wood.** When you press one
> on drywall, plaster or concrete, the number is **comparative, not a true moisture percentage.** So talk in
> **points**, not percent: "the affected wall is at 99 points, the unaffected drywall is at 14 — we'll call it
> dry when it's back to 14." It's honest and it's defensible. Then document like the file will be read by a
> stranger: dry standard, material and location, **meter type and model**, daily readings, psychrometric
> conditions, and **first-day and last-day photos** of the actual readings. If the documentation doesn't support
> the conclusion, the conclusion may not survive review — and the callback is yours.

### 3f. "Interesting fact" hook
> Ask a restorer what a wall "reads" and the good ones will answer in **points, not percent** — because almost
> every moisture meter on the truck is actually calibrated for *wood*. Point it at drywall or concrete and the
> number isn't a real moisture percentage at all; it's a relative signal that's only meaningful next to a
> baseline reading of the same dry material nearby. It's why concrete can read alarmingly "wet" when it's bone
> dry, and why the professional's answer to "is it dry?" is never a single number — it's a documented *trend*
> back to the control.

## Block 4 · Pre-gate self-audit (NEVER-list)
| Rule | Result |
|---|---|
| No AI filler | PASS |
| No banned first-person business voice | PASS |
| No hedged/passive CTA | PASS |
| No unverified claim as fact | PASS (government MMD guidance + USDA + trade sources) |
| AU English, SI-first with imperial bracketed | PASS (mm primary; inches bracketed) |
| No feature-list-without-job | PASS (each meter/step tied to a measurement decision) |
| Interesting-fact is a real hook | PASS (3f = points-not-percent / wood-calibration reveal) |
| No CEC/IICRC-approval claim | PASS (S500 §10.6.6 cited nominatively only; `iicrcDiscipline: null`) |
| No discipline-acronym branding | PASS (no WRT/ASD/etc.) |
| No reproduced standard text | PASS (S500 §10.6.6 referenced by concept only, not quoted beyond a brief attributed reference) |
| US-specific data flagged | PASS (EPA 24–48 h and USDA are US-sourced; AU Safe Work / ABCB sidebar in Apply notes) |

**Overall: PASS** → forward to founder review + brand-guardian.

## Block 5 · Considered & rejected
1. **Reproducing the Mass.gov step-by-step carpet sampling grid and EPA 24–48 h remove-and-replace rule as
   procedure** — kept as *concept* (control sample, wick-mapping, act within 24–48 h) but not lifted verbatim;
   the numeric remove/replace thresholds are US public-health guidance and are flagged illustrative, with the
   AU equivalent (Safe Work Australia / ABCB) to be set by the founder.
2. **Specific meter brands/models (Tramex ME5, Hygro-i2, combo meters)** — trimmed to the *categories*
   (pin / pinless / combo / RH probe); brand specifics date and vary by market.
3. **Full moisture-map report format** — referenced as a documentation practice, not templated; the LMS may
   already have a mapping module, so avoid duplication until confirmed.

## Conversion / learning hypothesis (M-2)
- **Metric:** quiz pass-rate on "pin vs pinless use-cases", "dry standard ≠ drying goal", "control-sample
  rule", "points not percent", "timber <20 % MC / within 4 points = dry" + usefulness rating.
- **Target:** +5 pts over 30 days post-apply.
- **Kill threshold:** revert added sections if usefulness drops.
- **Next variant:** if flat, lead with the points-not-percent hook (3f) as the course spine.

## Sources & Get the latest — student-facing (data current as at July 2026)

> **For students — get the latest:** every source below is a **live link**. Open it to obtain the **current** version. Data compiled **July 2026**; standards, statistics and product specs change, so treat the linked source as the live source of truth and re-check a figure before relying on it.
- [T1] Mass.gov — *Use of Moisture Measuring Devices for Evaluating Water Damage in Buildings*: https://www.mass.gov/info-details/use-of-moisture-measuring-devices-for-evaluating-water-damage-in-buildings
- [T1/2] My Clean Magazine — *Dry Standards and Drying Goals in Water Damage Restoration* (S500 §10.6.6, 2026-05): https://mycleanmagazine.com/the-importance-of-moisture-targets-dry-standards-and-drying-goals-defined/
- [T2] R&R Magazine — *Moisture Meters 101: Choosing, Using and Maintaining the Right Tools* (2025-06): https://www.randrmagonline.com/articles/91429-moisture-meters-101-choosing-using-and-maintaining-the-right-tools
- [T2] R&R Magazine — *How to Take Moisture Readings for Water Mitigation* (2024-07): https://www.randrmagonline.com/articles/90909-how-to-take-moisture-readings-for-water-mitigation
- [T2] Accuserve — *Setting Drying Targets Utilizing the New S500* (USDA Wood Handbook + S500-2021): https://www.accuserve.com/blog/setting-drying-targets-utilizing-the-new-s500
- [T2] Tramex Meters — *Moisture Detection and Moisture Mapping*: https://tramexmeters.com/learn/moisture-detection-and-moisture-mapping

## Apply notes
- Confirm slug + `id` in live DB (title covering moisture measurement / metering / drying documentation).
  `iicrcDiscipline: null`; S500 §10.6.6 referenced **nominatively only** (concept, not quoted) — no discipline
  acronym branding, no CEC-hours claim. If applying ever creates a NEW catalogue row, ship `cecHours: 0`.
- **AU localisation before publish:** depths already mm-first (inches bracketed). The **EPA 24–48 h** dry-or-
  discard window and **USDA** timber targets are **US-sourced, illustrative** — pair with **Safe Work Australia**
  and **ABCB/AS** guidance; ATFA is a valid AU published-resource for timber-floor drying goals (named in S500's
  own reference list).
- Overlaps with the Infrared Thermography course (draft 02) on IR-camera use — keep the boundary (02 = thermal
  imaging technique; 27 = contact metering + documentation) if both apply.
- Target `lms_lessons.content` / new module; no deploy-time seeder. `brand-guardian` before publish.
