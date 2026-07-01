-- Phase 2 (2026-07-01): IICRC-grounded contact replies + provenance/audit record.
-- Additive only — a brand-new table, no data dependency, so no pre-check DELETE.
-- A `pending_approval` draft that cleared the deterministic gates (no-verbatim
-- >= 8-gram guard + judge) is auto-sent once the 2-hour SLA elapses with no human
-- reply (founder-authorized 2026-07-01). ON DELETE SET NULL keeps a draft's audit
-- trail if the parent contact submission is ever removed.
-- See docs/specs/2026-07-01-carsi-assistant-and-contact-reply.md §14a.

CREATE TABLE "contact_reply_drafts" (
    "id" UUID NOT NULL,
    "submission_id" UUID,
    "recipient_email" VARCHAR(320) NOT NULL,
    "recipient_name" VARCHAR(240) NOT NULL,
    "question" TEXT NOT NULL,
    "reply_body" TEXT NOT NULL,
    "standards_cited" TEXT[],
    "storm_sources" JSONB NOT NULL,
    "judge_verdict" JSONB,
    "ngram_check" VARCHAR(16) NOT NULL DEFAULT 'pass',
    "auto_send_eligible" BOOLEAN NOT NULL DEFAULT false,
    "drafted_by" VARCHAR(160) NOT NULL,
    "approved_by" VARCHAR(320),
    "sent_via" VARCHAR(16),
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending_approval',
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_reply_drafts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contact_reply_drafts_status_created_at_idx" ON "contact_reply_drafts"("status", "created_at" DESC);

CREATE INDEX "contact_reply_drafts_submission_id_idx" ON "contact_reply_drafts"("submission_id");

ALTER TABLE "contact_reply_drafts" ADD CONSTRAINT "contact_reply_drafts_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "contact_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
