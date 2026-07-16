-- CCW roadshow email delivery log.
--
-- Additive only: creates one new table. No existing table is altered and no data
-- is read or written, so this is safe to apply while the Melbourne event
-- (22-23 July 2026) registration flow is live.
--
-- Why: src/lib/server/email.ts `sendEmail()` reports failure by RETURNING
-- { sent: false, reason } instead of throwing. The promote route discarded that
-- return value and only caught throws, so a failed attendee email was completely
-- invisible — no record, no alert, promotion still reported success.

CREATE TABLE "ccw_roadshow_email_logs" (
    "id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "delivery_status" VARCHAR(16) NOT NULL,
    "failure_reason" TEXT,
    "provider_message_id" VARCHAR(128),
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ccw_roadshow_email_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ccw_roadshow_email_logs_registration_id_idx" ON "ccw_roadshow_email_logs"("registration_id");
CREATE INDEX "ccw_roadshow_email_logs_delivery_status_idx" ON "ccw_roadshow_email_logs"("delivery_status");
CREATE INDEX "ccw_roadshow_email_logs_created_at_idx" ON "ccw_roadshow_email_logs"("created_at");

ALTER TABLE "ccw_roadshow_email_logs"
    ADD CONSTRAINT "ccw_roadshow_email_logs_registration_id_fkey"
    FOREIGN KEY ("registration_id") REFERENCES "ccw_roadshow_registrations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
