-- Phase A (2026-07-02): in-app notifications foundation (LmsNotification).
-- Additive only — a brand-new table (lms_notifications), no data dependency, so no pre-check.
-- Powers the in-app bell now; the recert-reminder (Phase B) and toolbox-talk drip (Phase C) crons
-- will write rows here idempotently via the unique dedupe_key.

-- CreateTable
CREATE TABLE "lms_notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link_url" TEXT,
    "dedupe_key" TEXT NOT NULL,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lms_notifications_dedupe_key_key" ON "lms_notifications"("dedupe_key");

-- CreateIndex
CREATE INDEX "lms_notifications_user_id_read_at_idx" ON "lms_notifications"("user_id", "read_at");

-- AddForeignKey
ALTER TABLE "lms_notifications" ADD CONSTRAINT "lms_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

