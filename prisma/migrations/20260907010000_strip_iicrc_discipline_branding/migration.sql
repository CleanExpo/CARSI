-- Strip IICRC Registered-Training-School discipline branding from live courses.
--
-- CLAUDE.md (founder ruling 2026-07-10, MUST): CARSI courses are NEVER branded with IICRC
-- discipline designations/acronyms (WRT/ASD/AMRT/FSRT/CCT/TCST/OCT/RRT) and are never described
-- as "[discipline]-aligned". `iicrcDiscipline` must be null. CARSI issues its own Southern
-- Hemisphere Restoration Designations; the IICRC accredits CARSI as a CEC provider, not the
-- courses themselves. Selling CARSI as delivering IICRC certification can cost the licence to
-- sell courses, so this is a release blocker rather than a cosmetic edit.
--
-- WHY A MIGRATION AND NOT A SEED CHANGE. Most of the 35 rows below exist in the production
-- database but in NO repo file — the repo seed holds 37 courses while production sells 80, and
-- 3 of the 4 "-aligned" courses are absent from the seed entirely. The seed cannot reach them.
-- `scripts/start-production.sh` runs `scripts/do-migrate.sh`, which runs `npx prisma migrate
-- deploy` on every container boot and blocks start on failure, so a migration keyed on `slug`
-- DOES reach them. This is the access path DECISIONS #16 has been open on since 2026-08-21.
--
-- CEC HOURS ARE DELIBERATELY NOT TOUCHED. All 27 live CEC claims were cross-checked against
-- data/seed/cec-approvals.json on 2026-09-06: 27 of 27 are backed by an approved entry with
-- matching hours, 0 unapproved. Nulling the discipline does not affect CEC display, which
-- resolves from the approvals registry alone — `scripts/check-cec-surfaces.mjs` exists
-- specifically to forbid using `iicrcDiscipline` as a CEC eligibility signal.
--
-- Values captured from https://www.carsi.com.au/api/lms/courses/<slug> at
-- 2026-09-06T09:54:30.109Z; 80 of 80 live courses reached, 0 unreachable, 35 affected.
-- Rollback: docs/rollback/20260907010000_strip_iicrc_discipline_branding.sql restores every
-- value replaced here, from that same capture.
--
-- Idempotent: re-running sets the same values. Safe to apply more than once.

-- 1. Remove "(XXX-aligned)" from course titles (4 rows).
UPDATE "lms_courses" SET "title" = 'Applied Structural Drying — Core Concepts' WHERE "slug" = 'asd-structural-drying-core';
UPDATE "lms_courses" SET "title" = 'Commercial Carpet Care — Core Methods' WHERE "slug" = 'cct-commercial-carpet-core';
UPDATE "lms_courses" SET "title" = 'Fire & Smoke Restoration — Core Principles' WHERE "slug" = 'fsrt-fire-smoke-restoration-core';
UPDATE "lms_courses" SET "title" = 'Water Damage Restoration — Essentials' WHERE "slug" = 'wrt-water-damage-essentials';

-- 2. Remove "WRT-aligned" phrasing from the one course carrying it in prose (1 row).
--    Replacement copy is written by hand, not derived: deleting the acronym mechanically left
--    "A concise, aligned introduction", which is not English. No CEC claim is added here —
--    this course has no entry in the approvals registry and its live cec_hours is null.
UPDATE "lms_courses"
SET "description" = 'A concise introduction to water damage restoration fundamentals: categories of water, classes of loss, safety, and the core drying workflow.',
    "short_description" = 'Essentials of water damage restoration: categories of water, classes of loss, safety, and the core drying workflow.'
WHERE "slug" = 'wrt-water-damage-essentials';

-- 3. Null the iicrc_discipline column (35 rows). This field is RENDERED as a visible
--    "IICRC <acronym>" badge at app/(dashboard)/dashboard/courses/[slug]/page.tsx:76, so it is
--    branding rather than internal tracking. Every reader of it is null-safe (conditional
--    render at that page and at dashboard/student/credentials/page.tsx:55; pass-through only
--    in app/api/lms/search/route.ts).
UPDATE "lms_courses" SET "iicrc_discipline" = NULL WHERE "slug" IN (
  'asd-structural-drying-core',
  'carpet-cleaning-basics-b66757ce',
  'cct-commercial-carpet-core',
  'fsrt-fire-smoke-restoration-core',
  'introduction-to-advanced-applied-structural-drying',
  'introduction-to-advanced-drying-equipment-and-methods',
  'introduction-to-advanced-structural-drying-concepts',
  'introduction-to-applied-microbial-remediation',
  'introduction-to-applied-structural-drying',
  'introduction-to-basic-carpet-cleaning-and-drying',
  'introduction-to-consulting-for-complex-water-losses',
  'introduction-to-controlled-environment-drying-methods',
  'introduction-to-digital-moisture-mapping',
  'introduction-to-forensic-investigations-for-water-losses',
  'introduction-to-iaq-and-mould',
  'introduction-to-odour-control-and-removal-techniques',
  'introduction-to-project-management-for-water-losses',
  'introduction-to-psychrometry-science-and-calculations',
  'introduction-to-safety-procedures-for-water-damage-work',
  'introduction-to-smoke-and-soot-damage-restoration',
  'introduction-to-structural-drying-concepts',
  'introduction-to-water-damage-estimating',
  'introduction-to-water-damage-in-commercial-buildings',
  'introduction-to-water-damage-marketing-and-sales',
  'introduction-to-water-damage-principles',
  'introduction-to-water-damage-restoration',
  'introduction-to-water-extraction-methods',
  'level-1-mould-remediation-2cc96b85',
  'level-2-mould-remediation-30ee3492',
  'level-3-mould-remediation-c5797369',
  'moisture-meter-course',
  'refrigerant-dehumidifiers-for-water-loss-restoration',
  'restoration-project-management-premium',
  'tile-cleaning-for-carpet-cleaners',
  'wrt-water-damage-essentials'
);
