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

**Non-CEC courses remaining (~37):** the "Not specified" CEC-value courses from the carsi.com.au
catalog — e.g. Truckmount Operations, Water Damage Restoration Essentials, Air Scrubbers & AFDs,
UV & Fluorescence, Antiques restoration, Submerged Items recovery, the Drying-vertical series
(Health Care / Educational / Hospitality / Industrial / Transportation), HVAC & IAQ, Dust &
Particulates, Air Quality & Odour, Fire & Smoke Core, Applied Structural Drying Core, Maintenance
Toolbox Talks, Air Movers, Tile Cleaning, Large Loss Mastery, Insurance Adjusters. Processed
newest-first as the loop continues.

Batches continue across loop iterations; newest course drafts append to this ledger.
