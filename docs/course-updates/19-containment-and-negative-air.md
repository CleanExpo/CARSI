# Course update draft — Containment & Negative-Air Engineering Controls (non-CEC)

**Course:** Containment & Negative-Air Control (Dust & Particulate Control)
**Type:** Non-CEC (no IICRC discipline / CEC-hours claim)
**Drafted:** 2026-07-12 · via nexus-copywriter standard · freshness lane: **Exa** (6 sources; Tier-1 IICRC S520 references + US DOE HEPA + OSHA asbestos NPE appendix, Tier-2 R&R Magazine containment series)
**Status:** DRAFT — founder review before any DB apply. Live DB is source of truth; never seed on deploy.

---

## Block 1 · Brief context
- **Surface:** CARSI LMS course content (new "What a containment actually is", "Negative pressure: make the room breathe in", "Air scrubber vs negative-air machine — the mistake that fails a job", "How much air: ACH", "Response levels").
- **Brand / voice:** CARSI — Sage · educator · standards authority. Founder voice permitted.
- **Audience:** remediation technicians building containments for mould, dust and particulate control.
- **AU English. S520/DOE/OSHA cited as reference standards; AU practitioners work to the AU equivalent (Safe Work Australia WHS, state regulators).**

## Block 2 · Evidence map (claim → source → tier → tag)

| # | Claim | Source | Tier | Tag |
|---|---|---|---|---|
| E1 | **A containment** is a work zone isolated from surrounding areas by **temporary barriers**; a full remediation setup is a **negative pressure enclosure (NPE)** = barriers + negative pressure + HEPA filtration + a decontamination chamber at entry | R&R Magazine containment series (2026) | 2 | [VERIFIED] |
| E2 | **Negative pressure** works by exhausting **more air than enters**, so air flows **inward** across any gap in the barrier — contaminants can't ride the air currents out. Minimum differential **0.02 inches water column** (IICRC S520) | Mold Remediation Authority (citing S520); R&R Magazine | 2/1 | [VERIFIED] |
| E3 | **The critical distinction:** an **air scrubber** recirculates/filters air *within* a space and does **not** create negative pressure; a **negative air machine (NAM)** exhausts filtered air *outside* the containment and **creates the pressure differential.** Only NAMs make negative pressure | Mold Remediation Authority; National Mold Authority | 2 | [VERIFIED] |
| E4 | **A scrubber-only setup can pass filtration yet fail containment** — meeting the HEPA test while spores still migrate out because there's no directional pressure | National Mold Authority | 2 | [VERIFIED] |
| E5 | **HEPA** = capture of **99.97% of particles at 0.3 µm** (US DOE standard); mould spores run ~1–100 µm (typically 1–30), so a working HEPA captures the overwhelming majority | US DOE HEPA standard (via remediation refs) | 1 | [VERIFIED] |
| E6 | **Air changes per hour (ACH):** S520 recommends a **minimum 4 ACH** in a zone with active mould disturbance; **ACH = (machine CFM ÷ room volume in ft³) × 60** | Mold Remediation Authority (citing S520) | 2 | [VERIFIED] |
| E7 | **Barriers:** **6-mil poly** minimum for mould containment (S520); **critical barriers** seal doorways, HVAC registers and penetrations; the exhaust must discharge **outside the building envelope**, never recirculate indoors | Mold Remediation Authority; National Mold Authority | 2 | [VERIFIED] |
| E8 | **Response levels scale the controls:** ≤10 sq ft = limited containment (scrubber, often no negative air); 10–100 sq ft = full containment + HEPA; >100 sq ft = negative air + full PPE; HVAC/whole-building = hygienist-specified. **Loss of negative pressure is a work-stoppage breach** — monitor continuously (manometer) | National Mold Authority; Mold Remediation Authority (S520 levels) | 2 | [VERIFIED] |
| E9 | **The technology is WWII-era:** HEPA filters and sheet-plastic barriers came out of 1940s nuclear/clean-room work; asbestos abatement then flipped the logic from "keep the product clean" to "keep the hazard in" | R&R Magazine containment series | 2 | [VERIFIED] |

## Block 3 · Draft content

### 3a. New section — "What a containment actually is"
> A containment is simply a work area **isolated from the rest of the building by temporary barriers** so
> the dust and contaminants you're about to disturb stay put. For real remediation it's more than plastic
> on a doorway — it's a **negative pressure enclosure (NPE)**, four parts working together:
> 1. **Barriers** — sheet plastic (or rigid panels) sealing the zone.
> 2. **Negative pressure** — so air moves in, not out.
> 3. **HEPA filtration** — capturing the particles in the exhausted air.
> 4. **A decontamination chamber** at the entry — so workers (and their boots) don't track contamination out.
>
> Workers inside wear PPE; the people in the next room don't — the containment is what protects them.

### 3b. New section — "Negative pressure: make the room breathe in"
> The whole trick of negative pressure is this: **take more air out of the room than you let in.** Do that
> and the room is at lower pressure than everywhere around it, so air is drawn **inward** through every gap
> in the barrier — and floating contaminants can't swim out against that current. The benchmark is a
> pressure differential of at least **0.02 inches of water column** (per the S520 mould standard). To make
> it work you have to control *all* the air: seal the HVAC supply and return registers and every
> penetration, or the system fights you.

### 3c. New section — "Air scrubber vs negative-air machine (the mistake that fails a job)"
> These two machines look almost identical and both use HEPA filters — but they do **different jobs**, and
> confusing them fails audits:
> - An **air scrubber** pulls room air through HEPA and blows the clean air **back into the same room.** It
>   lowers the particle count in place. It does **not** create negative pressure.
> - A **negative air machine (NAM)** exhausts the filtered air **out of the containment** (through a window
>   or wall to the exterior). *That* removal of volume is what creates the inward pressure differential.
>
> The consequence is the one people get caught on: **a scrubber-only setup can pass the filtration test and
> still fail containment** — the air's cleaner, but with no directional pressure, spores still migrate to
> the next room. If the job needs containment, you need a NAM exhausting outside; a scrubber alone won't do it.

### 3d. New section — "How much air: ACH"
> "Enough" airflow isn't a guess — it's **air changes per hour (ACH)**. The S520 standard sets a **minimum
> of 4 ACH** in a zone with active mould disturbance (higher for bigger spore loads). The maths is simple:
>
> **ACH = (machine CFM ÷ room volume in cubic feet) × 60.**
>
> Work out the room volume, read the machine's CFM, and confirm you're clearing the target — then verify
> the negative pressure with a **manometer** and **log it continuously.** A loss of negative pressure —
> power cut, filter loaded, barrier torn — is a **critical breach and a work-stoppage**, not something to
> notice at the end of the shift.

### 3e. Response-level box
> - **≤10 sq ft** — limited containment; a HEPA air scrubber may be enough (often no full negative air).
> - **10–100 sq ft** — full containment + HEPA filtration.
> - **>100 sq ft** — negative-air machine + full PPE ensemble.
> - **HVAC-involved / whole-building** — hygienist-specified engineering; shut down and seal the HVAC first,
>   or the ductwork distributes spores building-wide in minutes.
> - **Always:** 6-mil poly, critical barriers at doors/registers/penetrations, exhaust **outside** the
>   envelope, continuous pressure monitoring.

### 3f. "Interesting fact" hook
> An air scrubber and a negative air machine can be the same size, the same HEPA filter, sitting side by
> side — and only one of them actually stops the spores getting out. The scrubber just cleans the air where
> it stands; the negative air machine sucks air out of the room to the outside, so the room *breathes in*
> through every crack and nothing floats out. Put a scrubber where the job needed a negative air machine and
> you'll pass the filter check and fail the containment — the air looks clean while the contamination quietly
> walks next door.

## Block 4 · Pre-gate self-audit (NEVER-list)
| Rule | Result |
|---|---|
| No AI filler | PASS |
| No banned first-person business voice | PASS |
| No hedged/passive CTA | PASS |
| No unverified claim as fact | PASS (S520 refs + DOE + OSHA + trade sourced) |
| No IICRC discipline acronym branding | PASS (S520 nominative; no AMRT used to brand course) |
| No CEC/IICRC-approval claim | PASS |
| AU English + AU-equivalent note | PASS (Safe Work Australia noted) |
| Interesting-fact is a real hook | PASS (3f = scrubber-vs-NAM reveal) |

**Overall: PASS** → forward to founder review + brand-guardian.

## Block 5 · Considered & rejected
1. **Full NPE construction how-to (pole systems, panel brands, decon-chamber staging)** — trimmed to the
   principle; the field-usable payload is *why* negative pressure works and the scrubber-vs-NAM distinction,
   not a product catalogue.
2. **Asbestos/lead-specific regulatory detail** — rejected as a separate regulated trade; kept the
   transferable engineering (HEPA, negative pressure, ACH) and pointed AU readers to their WHS regulator.

## Conversion / learning hypothesis (M-2)
- **Metric:** quiz pass-rate on "negative pressure = exhaust more than intake", "scrubber ≠ NAM", "4 ACH min",
  "HEPA 99.97%@0.3µm" + usefulness rating.
- **Target:** +5 pts over 30 days post-apply.
- **Kill threshold:** revert added sections if usefulness drops.
- **Next variant:** if flat, promote the scrubber-vs-NAM hook (3f) to the course spine.

## Sources (verifiable audit trail — Exa-retrieved 2026-07-12)
- [T2] R&R Magazine — *Containment: Controlling Contaminants During Remediation* (Pinto series pt.1): https://www.randrmagonline.com/articles/91825-containment-controlling-contaminants-during-remediation-and-restoration-activities
- [T2] R&R Magazine — *Improving Negative-Pressure Containment for Biological Contaminants* (Pinto series pt.3): https://www.randrmagonline.com/articles/91944-improving-negative-pressure-containment-for-biological-contaminants
- [T2] Mold Remediation Authority — *Air Filtration and Negative Pressure in Mold Remediation* (cites IICRC S520, DOE HEPA): https://moldremediationauthority.com/air-filtration-and-negative-pressure
- [T2] National Mold Authority — *Air Scrubbers and Negative Pressure in Mold Restoration*: https://nationalmoldauthority.com/air-scrubbers-and-negative-pressure-in-mold-restoration
- [T1] OSHA — *1926.1101 App F: Negative-Pressure Enclosures for Class I Asbestos Work*: https://osha.prod.pace.dol.gov/laws-regs/regulations/standardnumber/1926/1926.1101AppF
- [T1] NADCA — *ACR 2025 Standard* (engineering controls / containment levels): https://www.ductandvent.com/Data/components/media/ACR2025Standard.pdf

## Apply notes
- Confirm slug + `id` in live DB (title covering containment / dust & particulate control). `iicrcDiscipline: null`;
  **S520 nominative, no AMRT/"-aligned" branding** (CARSI designation rule).
- S520/DOE/OSHA are US references; the engineering principles are universal — an AU sidebar (Safe Work
  Australia, state licensing where applicable) would localise it.
- Target `lms_lessons.content` / new module; no deploy-time seeder. `brand-guardian` before publish.
