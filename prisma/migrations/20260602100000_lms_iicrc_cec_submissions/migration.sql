CREATE TABLE "lms_iicrc_cec_submissions" (
    "id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "recipient_email" VARCHAR(320) NOT NULL,
    "technician_email" VARCHAR(320) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "cec_hours" DOUBLE PRECISION,
    "iicrc_discipline" VARCHAR(16),
    "iicrc_member_number" VARCHAR(32),
    "email_subject" TEXT,
    "email_text_body" TEXT,
    "provider_message_id" VARCHAR(128),
    "failure_reason" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_iicrc_cec_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lms_iicrc_cec_submissions_enrollment_id_key"
    ON "lms_iicrc_cec_submissions"("enrollment_id");

CREATE INDEX "lms_iicrc_cec_submissions_student_id_idx"
    ON "lms_iicrc_cec_submissions"("student_id");

CREATE INDEX "lms_iicrc_cec_submissions_status_idx"
    ON "lms_iicrc_cec_submissions"("status");

CREATE INDEX "lms_iicrc_cec_submissions_sent_at_idx"
    ON "lms_iicrc_cec_submissions"("sent_at");

ALTER TABLE "lms_iicrc_cec_submissions"
    ADD CONSTRAINT "lms_iicrc_cec_submissions_enrollment_id_fkey"
    FOREIGN KEY ("enrollment_id") REFERENCES "lms_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lms_iicrc_cec_submissions"
    ADD CONSTRAINT "lms_iicrc_cec_submissions_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lms_iicrc_cec_submissions"
    ADD CONSTRAINT "lms_iicrc_cec_submissions_course_id_fkey"
    FOREIGN KEY ("course_id") REFERENCES "lms_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
