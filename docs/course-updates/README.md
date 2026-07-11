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

### ⚠ Cross-cutting finding (founder decision needed)

Research surfaced that the **IICRC S500 2026 revision is now published** — the most consequential update
to the water-damage standard in ~a decade (documentation promoted to a central requirement; tighter
Category/Class definitions; sharper S500↔S520 boundary). **This affects EVERY CARSI course that cites
S500-2021, not just the litigation course.** Recommend a separate catalogue-wide audit pass of standard
citations (grep `S500-2021` / "2021 edition" across course content) once these drafts are approved. Not
actioned here — flagged for a deliberate decision.

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
