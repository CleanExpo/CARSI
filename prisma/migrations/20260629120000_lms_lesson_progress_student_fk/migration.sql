-- Phase 5 (2026-06-29): add the missing FK on lms_lesson_progress.student_id.
-- This was the only student-keyed LMS table without a FK to lms_users, leaving
-- orphan rows possible and no cascade on user delete (data P1, 2026-06-29 audit).
--
-- Founder ran the orphan pre-check against production and it returned 0 rows:
--   SELECT count(*) FROM lms_lesson_progress p
--     LEFT JOIN lms_users u ON u.id = p.student_id WHERE u.id IS NULL;  -- => 0
-- So no cleanup DELETE is required before adding the constraint.

ALTER TABLE "lms_lesson_progress" ADD CONSTRAINT "lms_lesson_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
