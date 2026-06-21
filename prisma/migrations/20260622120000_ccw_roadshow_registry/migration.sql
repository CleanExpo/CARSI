-- CreateTable
CREATE TABLE "ccw_roadshow_registrations" (
    "id" UUID NOT NULL,
    "event_slug" VARCHAR(32) NOT NULL,
    "free_entry_token" TEXT NOT NULL,
    "company_name" TEXT,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "ccw_customer_status" VARCHAR(40),
    "seat_count" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    "calendar_synced" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ccw_roadshow_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ccw_roadshow_attendees" (
    "id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "years_experience" VARCHAR(16) NOT NULL,
    "goals" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ccw_roadshow_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ccw_roadshow_registrations_free_entry_token_key" ON "ccw_roadshow_registrations"("free_entry_token");

-- CreateIndex
CREATE INDEX "ccw_roadshow_registrations_event_slug_status_idx" ON "ccw_roadshow_registrations"("event_slug", "status");

-- CreateIndex
CREATE INDEX "ccw_roadshow_registrations_event_slug_created_at_idx" ON "ccw_roadshow_registrations"("event_slug", "created_at" ASC);

-- CreateIndex
CREATE INDEX "ccw_roadshow_attendees_registration_id_idx" ON "ccw_roadshow_attendees"("registration_id");

-- AddForeignKey
ALTER TABLE "ccw_roadshow_attendees" ADD CONSTRAINT "ccw_roadshow_attendees_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "ccw_roadshow_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
