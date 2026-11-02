-- Team seats for courses with a prerequisite (DECISIONS #41, founder decision 02/11/2026).
--
-- Additive: one NOT NULL boolean column on lms_enrollments with a FALSE default. No row is
-- updated, deleted or backfilled, so every existing enrolment keeps exactly the access it has.
--
-- Why: anyone may now buy team seats for a course with a prerequisite, and each staff
-- member's own seat stays locked until they complete the prerequisite. Such a seat is an
-- enrolment ISSUED while the prerequisite was not met. The read-time gate grandfathers an
-- enrolment when the course has no meta.prerequisitesEnforcedFrom, which would let that seat
-- straight through. prerequisite_gated = TRUE marks the row as issued locked, and the gate
-- never grandfathers it: the learner is unlocked only by completing the prerequisite (or by an
-- admin).
--
-- Down path: ALTER TABLE "lms_enrollments" DROP COLUMN "prerequisite_gated";

ALTER TABLE "lms_enrollments" ADD COLUMN "prerequisite_gated" BOOLEAN NOT NULL DEFAULT false;
