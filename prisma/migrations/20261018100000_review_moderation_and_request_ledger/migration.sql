-- Course review moderation audit + review-request email ledger (spec 2026-10-18 D1, D3, D9).
--
-- Additive only: creates two new tables. No existing table or column is altered and no
-- existing row is read or written, so there is no backfill and no long lock.
--
-- Why an event table, not columns on lms_course_reviews: columns keep only the latest
-- decision, so hide -> unhide -> hide destroys the record of the first hide. Under the ACCC's
-- online-review guidance CARSI must be able to show which reviews it hid, when, by whom and why.
-- Reviews hidden BEFORE this migration get no invented reason: they simply have no event row.
-- Retention: deleting a review, its course, its learner or the acting admin never deletes an
-- event (review_id / actor_id are SET NULL; course and review snapshots are kept).
--
-- Down path (run only after REVIEW_REQUEST_EMAILS_ENABLED is unset):
--   DROP TABLE "lms_review_request_activations";
--   DROP TABLE "lms_review_request_emails";
--   DROP TABLE "lms_course_review_moderation_events";

CREATE TABLE "lms_course_review_moderation_events" (
    "id" UUID NOT NULL,
    -- Live link; NULL once the review (or its course / learner) is deleted. The audit row stays.
    "review_id" UUID,
    -- Permanent snapshots so the record outlives the review and the course.
    "review_ref" UUID NOT NULL,
    "course_ref" UUID NOT NULL,
    "course_slug" TEXT NOT NULL,
    "course_title" TEXT NOT NULL,
    "action" VARCHAR(8) NOT NULL,
    "reason" VARCHAR(32),
    "actor_id" UUID,
    "rating_at_action" INTEGER NOT NULL,
    "content_sha256" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_course_review_moderation_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_lms_review_moderation_action" CHECK ("action" IN ('hide', 'unhide')),
    CONSTRAINT "ck_lms_review_moderation_reason" CHECK (
        "reason" IS NULL
        OR "reason" IN ('offensive', 'personal_information', 'not_about_course', 'spam_or_fake')
    ),
    -- A hide without a reason must fail in the database, not only in the route.
    CONSTRAINT "ck_lms_review_moderation_hide_has_reason" CHECK ("action" <> 'hide' OR "reason" IS NOT NULL)
);

CREATE INDEX "ix_lms_review_moderation_review_created"
    ON "lms_course_review_moderation_events"("review_id", "created_at");
CREATE INDEX "ix_lms_review_moderation_review_ref_created"
    ON "lms_course_review_moderation_events"("review_ref", "created_at");

ALTER TABLE "lms_course_review_moderation_events"
    ADD CONSTRAINT "lms_course_review_moderation_events_review_id_fkey"
    FOREIGN KEY ("review_id") REFERENCES "lms_course_reviews"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lms_course_review_moderation_events"
    ADD CONSTRAINT "lms_course_review_moderation_events_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "lms_users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "lms_review_request_emails" (
    "id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "claim_token" UUID,
    "send_attempted_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "provider_message_id" VARCHAR(128),
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_review_request_emails_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_lms_review_request_emails_status" CHECK ("status" IN ('pending', 'sent', 'failed', 'skipped', 'ambiguous'))
);

-- "At most one review-request email per enrolment" is enforced here, not in application code.
CREATE UNIQUE INDEX "lms_review_request_emails_enrollment_id_key"
    ON "lms_review_request_emails"("enrollment_id");
CREATE INDEX "ix_lms_review_request_emails_status" ON "lms_review_request_emails"("status");

ALTER TABLE "lms_review_request_emails"
    ADD CONSTRAINT "lms_review_request_emails_enrollment_id_fkey"
    FOREIGN KEY ("enrollment_id") REFERENCES "lms_enrollments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Review-request activations (no backfill). Append-only: one row per off -> on transition. The
-- latest row's activated_at is the boundary; completions before it are never emailed.
CREATE TABLE "lms_review_request_activations" (
    "id" UUID NOT NULL,
    "activated_at" TIMESTAMPTZ(6) NOT NULL,
    "last_run_at" TIMESTAMPTZ(6) NOT NULL,
    "paused_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_review_request_activations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ix_lms_review_request_activations_activated_at"
    ON "lms_review_request_activations"("activated_at");
