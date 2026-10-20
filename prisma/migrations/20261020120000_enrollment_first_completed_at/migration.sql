-- Durable first-completion date for CEC credit and the IICRC renewal period (GP-659, GP-655).
--
-- Additive: one nullable column on lms_enrollments, then a one-time backfill. No row is deleted
-- and no other column changes.
--
-- Why: revocation (refund/dispute) and re-purchase clear completed_at but keep lesson progress,
-- and the next completion sync stamps completed_at with the current time. A curriculum edit can
-- also delete lesson progress. Learning done years ago could then count in the current renewal
-- period. first_completed_at is written once by the completion writers and never cleared.
--
-- Backfill:
--   1. Rows with a completion keep it: first_completed_at = completed_at.
--   2. Revoked rows (completed_at already cleared) whose learner completed every current lesson:
--      the latest of those lesson completion times, the earliest the course can have been done.
-- Limit: a row whose completed_at was already re-stamped before this migration cannot be
-- recovered; the renewal summary still requires lesson evidence inside the period for those.
--
-- Down path: ALTER TABLE "lms_enrollments" DROP COLUMN "first_completed_at";

ALTER TABLE "lms_enrollments" ADD COLUMN "first_completed_at" TIMESTAMPTZ(6);

UPDATE "lms_enrollments"
SET "first_completed_at" = "completed_at"
WHERE "completed_at" IS NOT NULL;

UPDATE "lms_enrollments" e
SET "first_completed_at" = done."last_lesson_at"
FROM (
  SELECT en."id" AS "enrollment_id", MAX(p."completed_at") AS "last_lesson_at"
  FROM "lms_enrollments" en
  JOIN "lms_modules" m ON m."course_id" = en."course_id"
  JOIN "lms_lessons" l ON l."module_id" = m."id"
  LEFT JOIN "lms_lesson_progress" p
    ON p."lesson_id" = l."id" AND p."student_id" = en."student_id" AND p."completed" = TRUE
  WHERE en."status" = 'revoked' AND en."completed_at" IS NULL
  GROUP BY en."id"
  HAVING COUNT(l."id") > 0 AND COUNT(p."completed_at") = COUNT(l."id")
) done
WHERE e."id" = done."enrollment_id" AND e."first_completed_at" IS NULL;
