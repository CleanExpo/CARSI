-- Course review moderation audit + review-request email eligibility (spec 2026-10-18 D1-D11).
--
-- Additive: creates new tables, one trigger, and one new column with a constant default on
-- lms_course_reviews (metadata-only on PostgreSQL 11+). No existing row is updated or deleted,
-- so there is no backfill and no long lock. The settings row is created switched OFF.
--
-- Why an event table, not columns on lms_course_reviews: columns keep only the latest
-- decision, so hide -> unhide -> hide destroys the record of the first hide. Under the ACCC's
-- online-review guidance CARSI must be able to show which reviews it hid, when, by whom and why.
-- Reviews hidden BEFORE this migration get no invented reason: they simply have no event row.
-- Retention: deleting a review, its course, its learner or the acting admin never deletes an
-- event (review_id / actor_id are SET NULL; course and review snapshots are kept).
-- Order: each decision increments lms_course_reviews.moderation_version in the same
-- transaction (the UPDATE takes the row lock), and the event stores that number as `sequence`.
-- The latest decision is the highest sequence, never the latest timestamp.
--
-- Down path (only with review-request emails switched off):
--   DROP TRIGGER "trg_lms_enrollments_review_request_eligibility" ON "lms_enrollments";
--   DROP FUNCTION "lms_review_request_mark_eligible"();
--   DROP TABLE "lms_review_request_settings";
--   DROP TABLE "lms_review_request_emails";
--   DROP TABLE "lms_course_review_moderation_events";
--   ALTER TABLE "lms_course_reviews" DROP COLUMN "moderation_version";

ALTER TABLE "lms_course_reviews" ADD COLUMN "moderation_version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "lms_course_review_moderation_events" (
    "id" UUID NOT NULL,
    -- Live link; NULL once the review (or its course / learner) is deleted. The audit row stays.
    "review_id" UUID,
    -- Permanent snapshots so the record outlives the review and the course.
    "review_ref" UUID NOT NULL,
    "course_ref" UUID NOT NULL,
    "course_slug" TEXT NOT NULL,
    "course_title" TEXT NOT NULL,
    -- Decision order for this review: the review's moderation_version after this decision.
    "sequence" INTEGER NOT NULL,
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
    CONSTRAINT "ck_lms_review_moderation_hide_has_reason" CHECK ("action" <> 'hide' OR "reason" IS NOT NULL),
    CONSTRAINT "ck_lms_review_moderation_sequence_positive" CHECK ("sequence" > 0)
);

-- Two decisions can never share a place in a review's order.
CREATE UNIQUE INDEX "uq_lms_review_moderation_review_ref_sequence"
    ON "lms_course_review_moderation_events"("review_ref", "sequence");
CREATE INDEX "ix_lms_review_moderation_review_sequence"
    ON "lms_course_review_moderation_events"("review_id", "sequence");

ALTER TABLE "lms_course_review_moderation_events"
    ADD CONSTRAINT "lms_course_review_moderation_events_review_id_fkey"
    FOREIGN KEY ("review_id") REFERENCES "lms_course_reviews"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lms_course_review_moderation_events"
    ADD CONSTRAINT "lms_course_review_moderation_events_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "lms_users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Review-request email switch. Exactly one row, created OFF. Read by the completion trigger
-- below AND by the cron, so eligibility and sending use the same switch.
CREATE TABLE "lms_review_request_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "changed_at" TIMESTAMPTZ(6),
    "changed_by_id" UUID,

    CONSTRAINT "lms_review_request_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_lms_review_request_settings_singleton" CHECK ("id" = 1)
);

ALTER TABLE "lms_review_request_settings"
    ADD CONSTRAINT "lms_review_request_settings_changed_by_id_fkey"
    FOREIGN KEY ("changed_by_id") REFERENCES "lms_users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "lms_review_request_settings" ("id", "enabled") VALUES (1, false);

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
    CONSTRAINT "ck_lms_review_request_emails_status" CHECK (
        "status" IN ('eligible', 'pending', 'sent', 'failed', 'skipped', 'ambiguous')
    )
);

-- "At most one review-request email per enrolment" is enforced here, not in application code.
CREATE UNIQUE INDEX "lms_review_request_emails_enrollment_id_key"
    ON "lms_review_request_emails"("enrollment_id");
CREATE INDEX "ix_lms_review_request_emails_status" ON "lms_review_request_emails"("status");

ALTER TABLE "lms_review_request_emails"
    ADD CONSTRAINT "lms_review_request_emails_enrollment_id_fkey"
    FOREIGN KEY ("enrollment_id") REFERENCES "lms_enrollments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Eligibility is decided AT COMPLETION, inside the database, for every completion path (online
-- progress, CCW provisioning, admin actions, scripts, raw SQL): the moment completed_at is first
-- set, the enrolment is marked 'eligible' only if review-request emails are switched on at that
-- instant. A completion while the switch is off gets no row, so it can never be emailed later,
-- whatever the cron cadence. The cron sends only rows marked here.
CREATE FUNCTION "lms_review_request_mark_eligible"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW."completed_at" IS NOT NULL
       AND (TG_OP = 'INSERT' OR OLD."completed_at" IS NULL)
       AND EXISTS (SELECT 1 FROM "lms_review_request_settings" WHERE "id" = 1 AND "enabled")
    THEN
        INSERT INTO "lms_review_request_emails" ("id", "enrollment_id", "status")
        VALUES (gen_random_uuid(), NEW."id", 'eligible')
        ON CONFLICT ("enrollment_id") DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "trg_lms_enrollments_review_request_eligibility"
    AFTER INSERT OR UPDATE OF "completed_at" ON "lms_enrollments"
    FOR EACH ROW EXECUTE FUNCTION "lms_review_request_mark_eligible"();
