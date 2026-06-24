-- Renewal communication audit trail for IICRC CEC submissions

ALTER TABLE "lms_iicrc_cec_submissions"
    ADD COLUMN IF NOT EXISTS "renewal_status" VARCHAR(24) NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS "initiated_by_admin_email" VARCHAR(320),
    ADD COLUMN IF NOT EXISTS "email_html_body" TEXT,
    ADD COLUMN IF NOT EXISTS "cc_emails" TEXT;

CREATE INDEX IF NOT EXISTS "lms_iicrc_cec_submissions_renewal_status_idx"
    ON "lms_iicrc_cec_submissions"("renewal_status");

CREATE TABLE IF NOT EXISTS "lms_iicrc_cec_communications" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "direction" VARCHAR(12) NOT NULL,
    "kind" VARCHAR(24) NOT NULL,
    "initiated_by_admin_email" VARCHAR(320),
    "from_email" VARCHAR(320) NOT NULL,
    "to_emails" TEXT NOT NULL,
    "cc_emails" TEXT,
    "subject" TEXT NOT NULL,
    "text_body" TEXT,
    "html_body" TEXT,
    "delivery_status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "provider_message_id" VARCHAR(128),
    "failure_reason" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "received_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_iicrc_cec_communications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lms_iicrc_cec_communications_submission_id_idx"
    ON "lms_iicrc_cec_communications"("submission_id");
CREATE INDEX IF NOT EXISTS "lms_iicrc_cec_communications_student_id_idx"
    ON "lms_iicrc_cec_communications"("student_id");
CREATE INDEX IF NOT EXISTS "lms_iicrc_cec_communications_enrollment_id_idx"
    ON "lms_iicrc_cec_communications"("enrollment_id");
CREATE INDEX IF NOT EXISTS "lms_iicrc_cec_communications_created_at_idx"
    ON "lms_iicrc_cec_communications"("created_at");

ALTER TABLE "lms_iicrc_cec_communications"
    ADD CONSTRAINT "lms_iicrc_cec_communications_submission_id_fkey"
    FOREIGN KEY ("submission_id") REFERENCES "lms_iicrc_cec_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "lms_iicrc_cec_communication_attachments" (
    "id" UUID NOT NULL,
    "communication_id" UUID NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(128) NOT NULL,
    "size_bytes" INTEGER,
    "direction" VARCHAR(12) NOT NULL,

    CONSTRAINT "lms_iicrc_cec_communication_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lms_iicrc_cec_communication_attachments_communication_id_idx"
    ON "lms_iicrc_cec_communication_attachments"("communication_id");

ALTER TABLE "lms_iicrc_cec_communication_attachments"
    ADD CONSTRAINT "lms_iicrc_cec_communication_attachments_communication_id_fkey"
    FOREIGN KEY ("communication_id") REFERENCES "lms_iicrc_cec_communications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "lms_iicrc_cec_submission_notes" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "author_admin_email" VARCHAR(320) NOT NULL,
    "body" TEXT NOT NULL,
    "follow_up_action" TEXT,
    "follow_up_due_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_iicrc_cec_submission_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lms_iicrc_cec_submission_notes_submission_id_idx"
    ON "lms_iicrc_cec_submission_notes"("submission_id");

ALTER TABLE "lms_iicrc_cec_submission_notes"
    ADD CONSTRAINT "lms_iicrc_cec_submission_notes_submission_id_fkey"
    FOREIGN KEY ("submission_id") REFERENCES "lms_iicrc_cec_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
