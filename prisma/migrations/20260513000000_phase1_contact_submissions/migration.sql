-- Phase 1: persist contact form submissions for admin inbox + CRM follow-up.
CREATE TABLE IF NOT EXISTS "contact_submissions" (
    "id" UUID NOT NULL,
    "first_name" VARCHAR(120) NOT NULL,
    "last_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "message" TEXT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'new',
    "source_ip" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contact_submissions_status_created_at_idx"
    ON "contact_submissions" ("status", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "contact_submissions_email_idx"
    ON "contact_submissions" ("email");
