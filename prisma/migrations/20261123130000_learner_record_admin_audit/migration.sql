-- GP-432: admin actions on learner records leave an audit row, and an admin can give a
-- learner fresh quiz attempts without deleting the attempts already on record.
--
-- Additive: one new table and one nullable column. No existing row is updated or deleted,
-- so there is no backfill and no long lock.
--
-- lms_learner_admin_audit_events is append-only (application code only INSERTs). It stores
-- snapshots, not foreign keys, so the record outlives the learner, the course and the admin
-- account. One row per action:
--   force_complete      an admin marked every lesson of an enrolment complete (assessments
--                       are still required before the enrolment completes);
--   quiz_attempts_reset an admin voided a learner's failed attempts on a course's quizzes.
--
-- lms_quiz_attempts.voided_at: set by a reset on FAILED attempts only. A voided attempt
-- stays on record but no longer counts against attempts_allowed. Passed attempts are never
-- voided.
--
-- Down path (discards the audit, so export lms_learner_admin_audit_events first):
--   DROP TABLE "lms_learner_admin_audit_events";
--   ALTER TABLE "lms_quiz_attempts" DROP COLUMN "voided_at";

ALTER TABLE "lms_quiz_attempts" ADD COLUMN "voided_at" TIMESTAMPTZ(6);

CREATE TABLE "lms_learner_admin_audit_events" (
    "id" UUID NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "reason" TEXT NOT NULL,
    -- bootstrap_admin (actor_ref NULL) | admin_user (admin_users.id) | lms_admin (lms_users.id)
    "actor_kind" VARCHAR(16) NOT NULL,
    "actor_ref" UUID,
    "actor_email" TEXT NOT NULL,
    "student_ref" UUID NOT NULL,
    "enrollment_ref" UUID,
    "course_ref" UUID,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_learner_admin_audit_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_lms_learner_admin_audit_action" CHECK ("action" IN ('force_complete', 'quiz_attempts_reset')),
    CONSTRAINT "ck_lms_learner_admin_audit_reason" CHECK (length(btrim("reason")) > 0 AND length("reason") <= 1000),
    CONSTRAINT "ck_lms_learner_admin_audit_actor_email" CHECK (length(btrim("actor_email")) > 0),
    CONSTRAINT "ck_lms_learner_admin_audit_actor_kind" CHECK ("actor_kind" IN ('bootstrap_admin', 'admin_user', 'lms_admin')),
    CONSTRAINT "ck_lms_learner_admin_audit_actor_ref" CHECK (("actor_kind" = 'bootstrap_admin') = ("actor_ref" IS NULL))
);

CREATE INDEX "ix_lms_learner_admin_audit_student" ON "lms_learner_admin_audit_events" ("student_ref", "created_at");
