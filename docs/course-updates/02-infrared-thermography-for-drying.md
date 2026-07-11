# Course update draft — Introduction to Infrared Thermography for Drying (non-CEC)

**Course:** Introduction to Infrared Thermography for Drying
**Type:** Non-CEC (no IICRC discipline / CEC-hours claim)
**Drafted:** 2026-07-11 · via nexus-copywriter standard · freshness lane: **Exa** (5 sources; Tier-1 ASTM/IICRC-standard + Tier-2 industry)
**Status:** DRAFT — founder review before any DB apply. Live DB is source of truth; never seed on deploy.

---

## Block 1 · Brief context
- **Surface:** CARSI LMS course content (new "How it actually works", "Limits" and "Best-practice protocol" sections).
- **Brand / voice:** CARSI — Sage · educator · standards authority. Founder voice permitted.
- **Audience:** restoration technicians using thermal cameras on water-damage jobs.
- **AU English, metric-first (°C, with °F in brackets where the standard is US-defined).**

## Block 2 · Evidence map (claim → source → tier → tag)

| # | Claim | Source | Tier | Tag |
|---|---|---|---|---|
| E1 | The current standard for building IR thermography is **ASTM E3216**, updated in 2026 (E3216-26); it stresses IR must be correlated with direct measurement to confirm conclusions | ASTM store — store.astm.org/e3216-26.html | 1 (standards body) | [VERIFIED] |
| E2 | Thermal cameras **do not detect water** — they detect surface-temperature anomalies from evaporative cooling; wet materials read cooler as moisture evaporates | Water Restoration Authority; Advanced Restoration CO (2026-04) | 2 | [VERIFIED] |
| E3 | A working temperature differential of **≥ ~5.6°C (10°F)** between wet and dry (or in/out) is needed; below it, anomalies fall within the camera's noise floor (high false-negative rate). ASTM C1153 governs roof scans | Water Restoration Authority; ASTM C1153 via SGH paper | 1/2 | [VERIFIED] |
| E4 | IICRC **S500** frames thermal imaging as a *supporting* tool in a multi-instrument protocol; IR images alone are **not** accepted as proof the dry standard was met — moisture-meter readings in drying logs remain the primary evidence | Water Restoration Authority (citing IICRC S500) | 2 (citing Tier-1 standard) | [VERIFIED] |
| E5 | Reflective / low-emissivity surfaces (foil-faced insulation, polished concrete, metal) and thick masonry defeat IR; set emissivity ~0.95 for drywall/wood/concrete | Advanced Restoration CO; ADRI (2025-11) | 2 | [VERIFIED] |
| E6 | **Interesting fact:** combining IR + moisture meter + visual inspection raises water-intrusion detection accuracy from ~70% to ~95% | Advanced Restoration CO (2026-04) | 2 | [VERIFIED] |
| E7 | Pro restoration cameras resolve ~0.05°C (NETD 50 mK / 0.09°F); 320×240 is the professional-standard resolution, 640×480 better for small/boundary detail | Water Restoration Authority; ADRI | 2 | [VERIFIED] |
| E8 | Scan perpendicular, ~1–3 m from the surface; best contrast early morning (≈5–8 AM) or late evening — stable conditions, evaporative cooling most detectable | ADRI; Advanced Restoration CO | 2 | [VERIFIED] |

## Block 3 · Draft content

### 3a. New section — "What the camera actually sees (and doesn't)"
> A thermal camera never sees water. It sees temperature. Wet building materials lose heat faster
> than the dry material beside them, because evaporating moisture cools the surface — so a saturated
> stud bay or a wet gypsum panel reads *cooler* on the camera than its dry neighbour. That single
> fact governs everything else: no temperature difference, no image. If there isn't at least about
> 5.6°C (10°F) between the wet zone and the dry reference, the anomaly disappears into the camera's
> noise and you get a confident-looking scan that is simply wrong.

### 3b. New section — "The rule that keeps you out of trouble"
> Under IICRC S500, thermal imaging is a *screening* tool, not proof. It points you at where to look;
> it does not confirm what you found, and an infrared image on its own is not accepted as evidence
> the structure reached the dry standard. Every anomaly the camera flags gets confirmed with a
> calibrated moisture meter, and it's the meter readings — logged in your drying records — that carry
> the claim. Used that way, the two tools together (plus a proper visual check) lift water-intrusion
> detection accuracy from roughly 70% with one method to about 95%.

### 3c. New "best-practice protocol" checklist
> 1. **Build the contrast.** Run HVAC or ventilate for ~1 hour to open up at least ~5.6°C (10°F)
>    between wet and dry. Scan early morning or late evening for the most stable difference.
> 2. **Set emissivity to ~0.95** for drywall, timber and concrete.
> 3. **Scan perpendicular**, 1–3 m from the surface, in overlapping passes.
> 4. **Confirm every anomaly** with a pin or pinless moisture meter before you call it wet.
> 5. **Log it** — timestamped IR image + matching visible photo + the moisture reading, tied to the
>    floor plan.
> 6. **Know the blind spots:** foil-faced insulation, metal, polished concrete and thick masonry
>    reflect or mask heat and will lie to the camera. Probe or open up when in doubt.

### 3d. "Interesting fact" hook
> A thermal camera can scan an entire wall in seconds — and be completely fooled by a sheet of
> foil-backed insulation, because shiny surfaces reflect the room's heat back instead of showing
> what's behind them. The best technicians treat the camera as the fast first pass that says *look
> here*, never the instrument that says *it's dry*.

## Block 4 · Pre-gate self-audit (NEVER-list)
| Rule | Result |
|---|---|
| No AI filler | PASS |
| No banned first-person business voice | PASS (instructional 2nd person) |
| No hedged/passive CTA | PASS (checklist is imperative) |
| No unverified claim as fact | PASS (every figure sourced; standards named) |
| AU English, metric-first | PASS (°C primary, °F bracketed for US-defined thresholds) |
| No feature-list-without-job | PASS (each spec ties to a scan decision) |
| Interesting-fact is a real hook | PASS (3d = revealed-mistake archetype) |
| No CEC/IICRC-approval claim | PASS (S500 cited as a reference standard only) |

**Overall: PASS** → forward to founder review + brand-guardian.

## Block 5 · Considered & rejected
1. **Gear-shopping angle** (camera brand/model recommendations) — rejected; ages fast and reads as
   product placement, weakening the standards-authority voice.
2. **"Thermal imaging finds hidden water" as the headline** — rejected; it's the exact overclaim the
   S500 rule and E2 correct. Leading with the limitation is more credible and more useful.

## Conversion / learning hypothesis (M-2)
- **Metric:** quiz pass-rate on the "verify with a moisture meter" concept + course usefulness rating.
- **Target:** +5 pts pass-rate on the verification question over 30 days post-apply.
- **Kill threshold:** revert the added sections if usefulness rating drops vs baseline.
- **Next variant:** if flat, promote 3d to the course card subtitle.

## Apply notes
- Confirm slug + `id` in live DB (catalog title "Introduction to Infrared Thermography for Drying").
- Target `lms_lessons.content` / a new module; no deploy-time seeder. `brand-guardian` before publish.
