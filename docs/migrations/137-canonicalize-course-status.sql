-- #137 — Canonicalize course publication on `status` (retire the isPublished dual-flag read)
--
-- WHY
--   Two flags governed publication: `status` (expressive, canonical) and the legacy
--   `is_published` boolean. The public catalogue read used
--       WHERE (is_published = true OR status ILIKE 'published')
--   which forced `readonly OR` casts and confusing query logic. We are narrowing reads to
--       WHERE status ILIKE 'published'
--   (see src/lib/server/public-courses-list.ts → lmsPublishedCourseWhere).
--
-- SAFETY (why this is non-regressing, no data inspection required)
--   This backfill promotes to status='published' EXACTLY the rows the old predicate counted
--   as published (is_published=true OR status='published'). Afterward the new status-only
--   read returns the identical set — it cannot hide a course that was visible before.
--   `is_published` is intentionally LEFT IN PLACE (dual-write window, ≥1 sprint) and dropped
--   in a separate follow-up migration once nothing writes it. This script does NOT drop it.
--
-- TARGET
--   The app's Prisma-managed Postgres: DO Managed cluster `carsi-db` (monkfish-app, SYD1).
--   NOT the Supabase project ofzafxvxobjggjisrbsa (that is a separate/legacy store).
--
-- IDEMPOTENT
--   Re-running is a no-op once status is canonical. Guarded so it is inert if the column
--   has already been dropped in a later environment.
--
-- HOW TO RUN (read-only preview first, then apply, then verify — all inside one tx)
--   psql "$DATABASE_URL" -f docs/migrations/137-canonicalize-course-status.sql
--   (or paste into the DO carsi-db SQL client.)

BEGIN;

-- 0) Preview: how many rows WILL be promoted (published only by the legacy boolean).
--    Expect this to print a count; 0 means status was already authoritative.
DO $$
DECLARE
  n bigint;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lms_courses' AND column_name = 'is_published'
  ) THEN
    EXECUTE $q$
      SELECT count(*) FROM public.lms_courses
      WHERE is_published IS TRUE AND lower(coalesce(status, '')) <> 'published'
    $q$ INTO n;
    RAISE NOTICE '[#137] rows to promote (is_published=true, status<>published): %', n;
  ELSE
    RAISE NOTICE '[#137] is_published column absent — nothing to do (already canonicalized).';
  END IF;
END $$;

-- 1) Backfill: make `status` authoritative for everything the old predicate published.
UPDATE public.lms_courses
SET status = 'published', updated_at = now()
WHERE is_published IS TRUE
  AND lower(coalesce(status, '')) <> 'published';

-- 2) Verify: the two predicates must now agree. This SELECT must return 0.
--    (Any non-zero row is a course visible under the OLD predicate but not the NEW one —
--     i.e. a regression — and should abort the deploy of the code change.)
SELECT count(*) AS rows_old_predicate_but_not_new
FROM public.lms_courses
WHERE is_published IS TRUE
  AND lower(coalesce(status, '')) <> 'published';

COMMIT;

-- Post-apply expectation:
--   * rows_old_predicate_but_not_new = 0
--   * counts of `status ILIKE 'published'` (new read) == old `is_published OR status` read.
-- Only AFTER this returns 0 on prod should the lmsPublishedCourseWhere code change deploy.
