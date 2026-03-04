# Current State

> Updated: 04/03/2026 AEST — session wrap

## Active Task

WordPress SQL dump migration pipeline — Phases 1–3 complete.

## In-Progress Work

- Branch: `feature/gamification-subscription-iicrc`
- Migration scripts committed (b65e79c): `scripts/migration/01_recon.py`, `02_post_types.py`, `03_course_structure.py`
- Output JSONs generated locally at `scripts/migration/output/` (gitignored)
  - 90 published courses, 739 lessons, 290 topics extracted
  - Prices resolved for 60/90 courses ($0–$770 AUD)
  - 30 remaining courses are membership-gated (need manual price)

## Supabase Question (Pending)

User asked about linking Supabase. Awaiting clarification on intent:

1. Replace local PostgreSQL (full migration)
2. Add alongside for specific features (Realtime, Storage, Auth)
3. Use as production target for Vercel deploy

Current DB: local PostgreSQL in Docker. Supabase MCP NOT configured in .mcp.json.

## Next Steps (Migration Pipeline)

- Phase 4: Extract lesson content (post_content from sfwd-lessons)
- Phase 4b: Map lessons to courses via ld_course_steps PHP serialised blob
- Phase 5: Load extracted data into CARSI PostgreSQL

## Last Updated

04/03/2026 AEST (manual session wrap)
