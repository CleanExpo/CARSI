-- CCW/CARSI roadshow post-event offer pack: email opt-in at check-in +
-- idempotent send marker for the attendee follow-up email.
ALTER TABLE "ccw_roadshow_sign_ins" ADD COLUMN "email_opt_in" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ccw_roadshow_sign_ins" ADD COLUMN "offer_email_sent_at" TIMESTAMPTZ(6);
