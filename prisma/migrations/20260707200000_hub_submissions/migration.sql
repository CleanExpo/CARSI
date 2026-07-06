CREATE TABLE IF NOT EXISTS "hub_submissions" (
    "id" UUID NOT NULL,
    "submission_type" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "submitter_name" VARCHAR(200) NOT NULL,
    "submitter_email" VARCHAR(320) NOT NULL,
    "submitter_phone" VARCHAR(64),
    "submitter_company" VARCHAR(200),
    "submitter_role" VARCHAR(200),
    "submission_title" VARCHAR(300) NOT NULL,
    "submission_url" TEXT,
    "submission_description" TEXT,
    "submission_data" JSONB NOT NULL DEFAULT '{}',
    "terms_accepted" BOOLEAN NOT NULL,
    "guidelines_accepted" BOOLEAN NOT NULL,
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hub_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "hub_submissions_submission_type_status_created_at_idx"
    ON "hub_submissions" ("submission_type", "status", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "hub_submissions_submitter_email_idx"
    ON "hub_submissions" ("submitter_email");
