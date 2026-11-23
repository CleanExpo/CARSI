-- Course publish gate (Linear GP-776).
--
-- Additive: creates one new table. No existing row is read, updated or deleted, so there is no
-- backfill and no long lock. Courses that were already published stay published; the gate only
-- applies when a course moves to published.
--
-- An `approve` row is a named admin's approval of exactly the course content whose sha256 it
-- stores. A `publish` row records who published, the approval it relied on and the content it
-- published. Application code only inserts. There is no foreign key to lms_courses so the record
-- outlives a deleted course.
--
-- Down path (discards the approval record, so export lms_course_approvals first):
--   DROP TABLE "lms_course_approvals";

CREATE TABLE "lms_course_approvals" (
    "id" UUID NOT NULL,
    "course_ref" UUID NOT NULL,
    "course_slug" TEXT NOT NULL,
    "action" VARCHAR(16) NOT NULL,
    "actor_email" TEXT NOT NULL,
    "content_sha256" VARCHAR(64) NOT NULL,
    "approval_ref" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_course_approvals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_lms_course_approvals_action" CHECK ("action" IN ('approve', 'publish')),
    CONSTRAINT "ck_lms_course_approvals_actor_email" CHECK (length(btrim("actor_email")) > 0),
    CONSTRAINT "ck_lms_course_approvals_sha256" CHECK ("content_sha256" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "ck_lms_course_approvals_publish_has_approval" CHECK ("action" <> 'publish' OR "approval_ref" IS NOT NULL)
);

CREATE INDEX "ix_lms_course_approvals_course_action_created"
    ON "lms_course_approvals"("course_ref", "action", "created_at" DESC);
