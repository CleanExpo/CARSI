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

Batches continue across loop iterations; newest course drafts append to this ledger.
