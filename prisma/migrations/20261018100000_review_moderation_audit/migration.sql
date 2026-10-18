-- Course review moderation audit (spec 2026-10-18 D1-D4; header amendment 11).
--
-- Additive: creates one new table and one new column with a constant default on
-- lms_course_reviews (metadata-only on PostgreSQL 11+). No existing row is updated or deleted,
-- so there is no backfill and no long lock. (The review-request email tables were split out to
-- the separate feat/review-request-email branch and are not part of this migration.)
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
-- Down path (proven by review-audit-retention.test.ts; it discards the moderation audit, so export
-- lms_course_review_moderation_events first):
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
    -- Live link to the acting LMS user; NULL once that account is deleted.
    "actor_id" UUID,
    -- Durable actor snapshot (no FK): who made the decision survives deleting the account.
    "actor_ref" UUID NOT NULL,
    "actor_email" TEXT NOT NULL,
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
    CONSTRAINT "ck_lms_review_moderation_sequence_positive" CHECK ("sequence" > 0),
    CONSTRAINT "ck_lms_review_moderation_actor_email" CHECK (length(btrim("actor_email")) > 0)
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
