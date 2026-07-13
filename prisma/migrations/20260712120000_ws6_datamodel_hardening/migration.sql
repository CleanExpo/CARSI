-- WS6 (P1) data-model hardening.
--
-- APPLY IS FOUNDER-GATED: this runs via the blocking PRE_DEPLOY `prisma migrate
-- deploy` against prod. Before merge, confirm the enrolment status pre-check
-- (see §3) so the CHECK cannot abort the deploy.

-- ---------------------------------------------------------------------------
-- 1. Regulatory / team retention: re-issue four FKs with ON DELETE RESTRICT.
--
-- Today, deleting a learner / enrolment / course CASCADE-erases the IICRC CEC
-- compliance record (a regulator-filed audit trail), and deleting an owner
-- CASCADE-destroys their team + its Stripe-linked subscriptions. RESTRICT blocks
-- the parent delete instead. Re-adding a FK as RESTRICT does NOT re-validate
-- existing rows (referential integrity already holds under the prior CASCADE),
-- so this is safe, non-scanning DDL.
-- ---------------------------------------------------------------------------
ALTER TABLE "lms_iicrc_cec_submissions" DROP CONSTRAINT "lms_iicrc_cec_submissions_enrollment_id_fkey";
ALTER TABLE "lms_iicrc_cec_submissions" ADD CONSTRAINT "lms_iicrc_cec_submissions_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "lms_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lms_iicrc_cec_submissions" DROP CONSTRAINT "lms_iicrc_cec_submissions_student_id_fkey";
ALTER TABLE "lms_iicrc_cec_submissions" ADD CONSTRAINT "lms_iicrc_cec_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "lms_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lms_iicrc_cec_submissions" DROP CONSTRAINT "lms_iicrc_cec_submissions_course_id_fkey";
ALTER TABLE "lms_iicrc_cec_submissions" ADD CONSTRAINT "lms_iicrc_cec_submissions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lms_teams" DROP CONSTRAINT "lms_teams_owner_id_fkey";
ALTER TABLE "lms_teams" ADD CONSTRAINT "lms_teams_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "lms_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 2. Missing FK indexes. Prisma does not auto-index FK columns, and the existing
-- composite @@unique constraints lead with student_id, so these FK columns are
-- unindexed (slows both cascade deletes and joins). IF NOT EXISTS keeps it
-- idempotent. Note: plain CREATE INDEX takes a brief SHARE lock inside the
-- migrate transaction — fine at current scale; use CREATE INDEX CONCURRENTLY
-- out-of-band instead if a table is very large.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "ix_lms_enrollments_course_id" ON "lms_enrollments"("course_id");
CREATE INDEX IF NOT EXISTS "ix_lms_lesson_progress_lesson_id" ON "lms_lesson_progress"("lesson_id");
CREATE INDEX IF NOT EXISTS "ix_lms_courses_instructor_id" ON "lms_courses"("instructor_id");
CREATE INDEX IF NOT EXISTS "ix_lms_modules_course_id" ON "lms_modules"("course_id");
CREATE INDEX IF NOT EXISTS "ix_lms_lessons_module_id" ON "lms_lessons"("module_id");

-- ---------------------------------------------------------------------------
-- 3. DB-level defence for the enrolment status vocabulary (hardens WS3 P0-C so
-- the free-text column can never drift from the app allow-set again).
--
-- NOT VALID: the constraint is enforced on every future INSERT/UPDATE but does
-- NOT scan existing rows, so a legacy/stray value cannot abort this deploy. The
-- app only ever writes 'active' | 'completed' | 'revoked', so no legitimate write
-- is blocked. FOUNDER FOLLOW-UP (after confirming
--   SELECT DISTINCT status FROM lms_enrollments;
-- is a subset of the allow-set): run
--   ALTER TABLE "lms_enrollments" VALIDATE CONSTRAINT "lms_enrollments_status_check";
-- to also validate the historical rows.
-- ---------------------------------------------------------------------------
ALTER TABLE "lms_enrollments"
  ADD CONSTRAINT "lms_enrollments_status_check"
  CHECK ("status" IN ('active', 'completed', 'revoked')) NOT VALID;
