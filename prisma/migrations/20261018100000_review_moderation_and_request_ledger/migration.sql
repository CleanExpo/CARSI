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
--   DROP TABLE "lms_review_request_switch_events";
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

-- Review-request email switch. Exactly one row, created OFF. Read by the completion trigger
-- below AND by the cron, so eligibility and sending use the same switch.
CREATE TABLE "lms_review_request_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "lms_review_request_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_lms_review_request_settings_singleton" CHECK ("id" = 1)
);

INSERT INTO "lms_review_request_settings" ("id", "enabled") VALUES (1, false);

-- Append-only history of every switch change, written in the same transaction as the change.
-- The actor is a durable snapshot of the verified admin identity (no FK, so it outlives the
-- account): bootstrap admin, admin_users account, or allow-listed / admin-role LMS user.
CREATE TABLE "lms_review_request_switch_events" (
    "id" UUID NOT NULL,
    "old_enabled" BOOLEAN NOT NULL,
    "new_enabled" BOOLEAN NOT NULL,
    "actor_kind" VARCHAR(16) NOT NULL,
    "actor_ref" UUID,
    "actor_email" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_review_request_switch_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_lms_review_request_switch_actor_kind" CHECK ("actor_kind" IN ('bootstrap_admin', 'admin_user', 'lms_admin')),
    CONSTRAINT "ck_lms_review_request_switch_actor_email" CHECK (length(btrim("actor_email")) > 0)
);

CREATE INDEX "ix_lms_review_request_switch_events_created_at"
    ON "lms_review_request_switch_events"("created_at");

CREATE TABLE "lms_review_request_emails" (
    "id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "claim_token" UUID,
    -- Bumped by the trigger on every transition into or out of completed; a send must still
    -- match the value it claimed, so a claim can never be used for a later completion.
    "completion_seq" INTEGER NOT NULL DEFAULT 0,
    "send_attempted_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "provider_message_id" VARCHAR(128),
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_review_request_emails_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_lms_review_request_emails_status" CHECK (
        "status" IN ('eligible', 'ineligible', 'pending', 'sent', 'failed', 'skipped', 'ambiguous')
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

-- Eligibility is decided AT EVERY TRANSITION INTO OR OUT OF COMPLETED, inside the database, for
-- every path (online progress, CCW provisioning, admin actions, scripts, raw SQL), whether the
-- transition changes completed_at, status, or both. "Completed" means status = 'completed' AND
-- completed_at IS NOT NULL.
--   * Into completed (a completion or re-completion): the row becomes 'eligible' if the switch is on
--     at that instant, otherwise 'ineligible'.
--   * Out of completed (revocation, status change, completed_at cleared): the row becomes 'ineligible'.
--   * Every transition bumps completion_seq, so a claim taken for one completion can never be used
--     for another; a claim in flight is cancelled ('pending' becomes 'ambiguous' if a send was
--     already attempted, so it is never resent, and otherwise follows the transition).
--   * 'sent' and 'ambiguous' rows are evidence and keep their status.
-- Lock order is the same as the sender's (switch row, then enrolment row, then ledger row): the
-- enrolment row is already locked by the UPDATE that fired this trigger, the switch row is read
-- FOR SHARE, so a completion, a switch change and a send can never interleave or deadlock.
CREATE FUNCTION "lms_review_request_mark_eligible"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    was_completed BOOLEAN;
    now_completed BOOLEAN;
    switch_on BOOLEAN;
    target TEXT;
BEGIN
    now_completed := NEW."status" = 'completed' AND NEW."completed_at" IS NOT NULL;
    IF TG_OP = 'INSERT' THEN
        was_completed := false;
    ELSE
        was_completed := OLD."status" = 'completed' AND OLD."completed_at" IS NOT NULL;
    END IF;

    IF was_completed = now_completed THEN
        RETURN NEW; -- no transition (e.g. a certificate or progress update)
    END IF;

    SELECT "enabled" INTO switch_on FROM "lms_review_request_settings" WHERE "id" = 1 FOR SHARE;
    IF now_completed AND switch_on IS TRUE THEN
        target := 'eligible';
    ELSE
        target := 'ineligible';
    END IF;

    UPDATE "lms_review_request_emails"
       SET "completion_seq" = "completion_seq" + 1,
           "status" = CASE
               WHEN "status" IN ('sent', 'ambiguous') THEN "status"
               WHEN "status" = 'pending' AND "send_attempted_at" IS NOT NULL THEN 'ambiguous'
               ELSE target
           END,
           "failure_reason" = CASE
               WHEN "status" = 'pending' AND "send_attempted_at" IS NOT NULL THEN 'completion_changed_after_send_attempt'
               ELSE "failure_reason"
           END,
           "claim_token" = CASE WHEN "status" IN ('sent', 'ambiguous') THEN "claim_token" ELSE NULL END,
           "updated_at" = now()
     WHERE "enrollment_id" = NEW."id";

    IF NOT FOUND AND target = 'eligible' THEN
        INSERT INTO "lms_review_request_emails" ("id", "enrollment_id", "status", "completion_seq")
        VALUES (gen_random_uuid(), NEW."id", 'eligible', 1);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "trg_lms_enrollments_review_request_eligibility"
    AFTER INSERT OR UPDATE OF "completed_at", "status" ON "lms_enrollments"
    FOR EACH ROW EXECUTE FUNCTION "lms_review_request_mark_eligible"();
