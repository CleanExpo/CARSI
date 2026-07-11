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

**Non-CEC courses remaining (~37):** the "Not specified" CEC-value courses from the carsi.com.au
catalog — e.g. Truckmount Operations, Water Damage Restoration Essentials, Air Scrubbers & AFDs,
UV & Fluorescence, Antiques restoration, Submerged Items recovery, the Drying-vertical series
(Health Care / Educational / Hospitality / Industrial / Transportation), HVAC & IAQ, Dust &
Particulates, Air Quality & Odour, Fire & Smoke Core, Applied Structural Drying Core, Maintenance
Toolbox Talks, Air Movers, Tile Cleaning, Large Loss Mastery, Insurance Adjusters. Processed
newest-first as the loop continues.

Batches continue across loop iterations; newest course drafts append to this ledger.
