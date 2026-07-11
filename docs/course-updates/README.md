# CARSI course-update drafts — non-IICRC-CEC courses

Staged, researched content additions for CARSI's **non-CEC** courses (courses without an
`iicrc_discipline` / `cec_hours` value). Purpose: freshen each course with current, relevant,
and interesting facts that aid learning — sourced via Exa (Tier-1 first) and drafted through the
nexus-copywriter standard.

## Rules (locked)

- **Staging only.** These are DRAFTS for founder review. The live Supabase DB is the source of
  truth; nothing here is written to it automatically, and courses are **never seeded on deploy**
  (see memory `carsi_deploy_course_seed_data_loss`). Applying an approved draft is a deliberate,
  separate step.
- **Non-CEC scope.** CEC/IICRC framing is opt-in and fail-closed (memory
  `carsi_cec_hours_inference_trap`). These drafts add general learning content only — they make
  no CEC-hours or IICRC-approval claim.
- **Evidence-tagged.** Every added fact carries a source URL + tier + `[VERIFIED]`/`[INFERENCE]`
  tag per the nexus-copywriter M-1 standard. AU English throughout.
- **CEC is fail-closed on apply.** These drafts add learning content to **existing** non-CEC courses and
  make **no** `cecHours` claim. If applying a draft ever creates a **new** catalogue row, it MUST ship
  `cecHours: 0` in `data/seed/courses-catalog.json` (the explicit "not CEC-approved" opt-out) per CLAUDE.md
  — never a duration-derived value. Only the founder flips a course to its IICRC-approved hours.

## Status ledger

| # | Course | Slug (to confirm in DB) | Draft | Status |
|---|---|---|---|---|
| 1 | Australian H5 Bird Flu Awareness for Restoration, IAQ and Facility Professionals | `h5-bird-flu-awareness` (confirm) | [01-h5-bird-flu-awareness.md](01-h5-bird-flu-awareness.md) | DRAFT — awaiting founder review |
| 2 | Introduction to Infrared Thermography for Drying | confirm | [02-infrared-thermography-for-drying.md](02-infrared-thermography-for-drying.md) | DRAFT — awaiting founder review |
| 3 | Moisture, Mould, and Indoor Air Quality: Understanding the Link | confirm | [03-moisture-mould-and-iaq.md](03-moisture-mould-and-iaq.md) | DRAFT — awaiting founder review |
| 4 | Truckmount Operations Course — HydraMaster & Sapphire Scientific | confirm | [04-truckmount-operations.md](04-truckmount-operations.md) | DRAFT — awaiting founder review |
| 5 | Using Air Scrubbers and AFDs to Improve Job Site Air Quality | confirm | [05-air-scrubbers-and-afds.md](05-air-scrubbers-and-afds.md) | DRAFT — awaiting founder review |
| 6 | Introduction to Water Damage Litigation Support | confirm | [06-water-damage-litigation-support.md](06-water-damage-litigation-support.md) | DRAFT — awaiting founder review |
| 7 | Large Loss Mastery Course | confirm | [07-large-loss-mastery.md](07-large-loss-mastery.md) | DRAFT — awaiting founder review |
| 8 | Introduction to Ultraviolet Light and Fluorescence | confirm | [08-uv-light-and-fluorescence.md](08-uv-light-and-fluorescence.md) | DRAFT — awaiting founder review |
| 9 | Fire & Smoke Restoration — Core Principles | confirm | [09-fire-and-smoke-core-principles.md](09-fire-and-smoke-core-principles.md) | DRAFT — awaiting founder review |
| 10 | Applied Structural Drying — Core Concepts | confirm | [10-applied-structural-drying-core.md](10-applied-structural-drying-core.md) | DRAFT — awaiting founder review |
| 11 | HVAC Systems and Indoor Air Quality | confirm | [11-hvac-systems-and-iaq.md](11-hvac-systems-and-iaq.md) | DRAFT — awaiting founder review |
| 12 | Water Damage Restoration Essentials | confirm | [12-water-damage-restoration-essentials.md](12-water-damage-restoration-essentials.md) | DRAFT — awaiting founder review |
| 13 | Contents & Document Recovery (Freezing & Freeze-Drying) | confirm | [13-contents-document-freeze-drying.md](13-contents-document-freeze-drying.md) | DRAFT — awaiting founder review |
| 14 | Odour Control & Deodorisation (Air Quality & Odour) | confirm | [14-odour-control-and-deodorisation.md](14-odour-control-and-deodorisation.md) | DRAFT — awaiting founder review |
| 15 | Antique & Fine Furniture Restoration | confirm | [15-antique-and-fine-furniture-restoration.md](15-antique-and-fine-furniture-restoration.md) | DRAFT — awaiting founder review |
| 16 | Carpet & Upholstery Cleaning (Carpet Cleaning Workshop) | confirm | [16-carpet-and-upholstery-cleaning.md](16-carpet-and-upholstery-cleaning.md) | DRAFT — awaiting founder review |
| 17 | Trauma & Biohazard Remediation — Principles | confirm | [17-trauma-and-biohazard-remediation.md](17-trauma-and-biohazard-remediation.md) | DRAFT — awaiting founder review |
| 18 | Tile, Grout & Natural Stone Cleaning | confirm | [18-tile-grout-and-natural-stone.md](18-tile-grout-and-natural-stone.md) | DRAFT — awaiting founder review |
| 19 | Containment & Negative-Air Control (Dust & Particulate) | confirm | [19-containment-and-negative-air.md](19-containment-and-negative-air.md) | DRAFT — awaiting founder review |
| 20 | Restoration Estimating & Insurance Claims | confirm | [20-restoration-estimating-and-insurance-claims.md](20-restoration-estimating-and-insurance-claims.md) | DRAFT — awaiting founder review |
| 21 | Category 3 & Sewage Water Cleanup | confirm | [21-category-3-sewage-water-cleanup.md](21-category-3-sewage-water-cleanup.md) | DRAFT — awaiting founder review |
| 22 | Mould Remediation Methodology | confirm | [22-mould-remediation-methodology.md](22-mould-remediation-methodology.md) | DRAFT — awaiting founder review |
| 23 | Crawl Space & Subfloor Moisture Control | confirm | [23-crawl-space-and-subfloor-moisture.md](23-crawl-space-and-subfloor-moisture.md) | DRAFT — awaiting founder review |
| 24 | PPE & Respiratory Protection | confirm | [24-ppe-and-respiratory-protection.md](24-ppe-and-respiratory-protection.md) | DRAFT — awaiting founder review |
| 25 | Pet Urine & Odour Decontamination | confirm | [25-pet-urine-and-odour-decontamination.md](25-pet-urine-and-odour-decontamination.md) | DRAFT — awaiting founder review |
| 26 | Dehumidifier Selection & Psychrometrics (LGR vs Desiccant) | confirm | [26-dehumidifier-selection-psychrometrics.md](26-dehumidifier-selection-psychrometrics.md) | DRAFT — awaiting founder review |
| 27 | Moisture Measurement & Documentation | confirm | [27-moisture-measurement-and-documentation.md](27-moisture-measurement-and-documentation.md) | DRAFT — awaiting founder review |

### ⚠ Designation-rule correction (applied 2026-07-11)

Drafts 9 and 10 originally carried "(FSRT-aligned)" / "(ASD-aligned)" in the course title. That
violates the **CARSI designation rule** (founder 2026-07-10, CLAUDE.md MUST): CARSI courses are never
branded with IICRC discipline acronyms (WRT/ASD/AMRT/FSRT/CCT/TCST) or "[discipline]-aligned", and
carry `iicrcDiscipline: null`. Titles corrected to the plain technique name; S500/S700 are still cited
**nominatively only**, which the rule permits. Any live-DB course still holding an "-aligned" title is a
pre-existing defect to sweep in the catalogue-wide audit below.

### ⚠ Cross-cutting finding (founder decision needed)

Research surfaced **two new/updated IICRC standards** that affect courses across the catalogue, not just
the ones drafted here:
- **IICRC S500 2026 revision** (water damage) — documentation promoted to a central requirement; tighter
  Category/Class definitions; sharper S500↔S520 boundary. Affects every course citing S500-2021.
- **ANSI/IICRC S700 (2025)** — the first-ever fire & smoke restoration standard; completion is now
  client-verified undetectability of residues/odours, HVAC inspection mandatory. Affects every fire/smoke course.

Recommend a separate catalogue-wide audit pass of standard citations (grep `S500-2021` / "2021 edition" /
old fire guidance across course content) once these drafts are approved. Not actioned here — flagged for a
deliberate decision.

Two litigation/large-loss drafts also carry a **jurisdiction caveat**: their strongest sources are US
(IICRC, US Federal Rules of Evidence, a US court case, US$ thresholds). The drafts teach the transferable
principles and label the US-specific items, but a future pass should add AU-jurisdiction sidebars
(expert-witness duties under AU court rules; AUD large-loss thresholds).

### ✅ Catalogue grounding (verified 2026-07-12 against `data/seed/courses-catalog.json`)

The live seed catalogue holds **37 courses, all currently non-CEC** (`cecHours: 0`/absent — the fail-closed
default; only the founder flips a course to its IICRC-approved hours). Confirmed real slugs now let each draft
attach to an actual course instead of an assumed one. **Draft → confirmed slug (founder to ratify):**

| Draft | Confirmed slug | IICRC-mappable? |
|---|---|---|
| 01 | `avian-influenza-awareness-restoration-iaq-facilities` | IAQ/biosecurity — no S-standard framing |
| 02 | `introduction-to-infrared-thermography-for-drying` | yes (S500 nominative) |
| 03 | `moisture-mould-and-indoor-air-quality-understanding-the-link` | yes |
| 04 | `ccw-carsi-truckmount-operations` | **NO** — floor-care/equipment, carries **no** IICRC/S-standard/CEC content |
| 05 | `using-air-scrubbers-and-afds-to-improve-job-site-air-quality` | yes |
| 06 | `introduction-to-water-damage-litigation-support` | yes |
| 08 | `introduction-to-ultraviolet-light-and-fluorescence` | yes |
| 09 | `fire-smoke-damage-restoration-fundamentals` | yes (S700 nominative) |
| 10 | `structural-drying-fundamentals` | yes |
| 11 | `hvac-systems-and-indoor-air-quality-what-every-technician-should-know` | yes |
| 12 | `wrt-water-damage-essentials` / `water-damage-restoration-fundamentals` | yes |
| 14 | `air-quality-and-odour-identification-and-deodorisation-essentials` | yes |
| 15 | `introduction-to-restoration-of-antiques-and-fine-furnishings` | yes |
| 16 | `carpet-cleaning-technician-fundamentals` | yes |
| 17 | `trauma-crime-scene-decontamination-fundamentals` | yes (S540 nominative) |
| 19 | `dust-and-particulates-in-indoor-air-control-and-cleaning-strategies` (partial) | yes |
| 21 | `category-3-sewage-black-water-remediation` | yes |
| 22 | `mould-remediation-fundamentals` | yes (S520 nominative) |
| 24 | `whs-fundamentals-for-restoration-and-cleaning-professionals` (partial) | WHS — Safe Work Australia framing |
| 26 | `psychrometry-building-science-for-drying` | yes |
| 27 | `psychrometry-building-science-for-drying` / `structural-drying-fundamentals` | yes |

**Drafts with no 1:1 catalogue course (content is sound; founder decides attachment or drop): 07 Large Loss,
13 Freeze-drying, 18 Tile/Grout/Stone, 20 Estimating/Insurance, 23 Crawl-space, 25 Pet Urine.** These likely
fold into a broader course (e.g. 25→carpet, 23→structural drying) rather than standing alone.

**Real non-CEC courses NOT yet drafted — target list for batches 15+ (newest-first):**
`documenting-and-reporting-air-quality-improvements` · `introduction-to-air-quality-fundamentals` ·
`introduction-to-creating-a-clean-air-environment-best-practices-for-final-clearance` ·
`introduction-to-iaq-and-mould-understanding-airborne-spread-and-containment` ·
`introduction-to-improving-indoor-air-quality-after-water-damage` ·
the **drying-vertical series** (`introduction-to-drying-health-care-facilities`,
`…educational-and-institutional-sites`, `…hospitality-and-lodging-sites`,
`…industrial-and-manufacturing-sites`, `…transportation-and-vehicles`) ·
`introduction-to-recovery-of-submerged-items-and-contents` · `timber-floor-assessment-restoration` ·
`assessing-indoor-environment-conditions` · `asbestos-awareness-for-restoration-technicians` (Safe Work AU,
no IICRC framing) · `commercial-floor-care-schools-childcare` + `floor-care-onboarding-operational-readiness`
(**non-IICRC** — no S-standard/CEC content).

Batches continue across loop iterations; newest course drafts append to this ledger.
