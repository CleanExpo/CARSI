-- Monthly small-business Owner Circle live sessions ($22/seat).
CREATE TABLE "business_coaching_registrations" (
    "id" UUID NOT NULL,
    "session_slug" VARCHAR(32) NOT NULL,
    "stripe_session_id" VARCHAR(128),
    "company_name" TEXT,
    "contact_email" VARCHAR(320) NOT NULL,
    "contact_phone" VARCHAR(80),
    "seat_count" INTEGER NOT NULL,
    "package_id" VARCHAR(32) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    "amount_total_cents" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_coaching_registrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_coaching_attendees" (
    "id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_coaching_attendees_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_coaching_registrations_stripe_session_id_key"
    ON "business_coaching_registrations"("stripe_session_id");

CREATE INDEX "business_coaching_registrations_session_slug_status_idx"
    ON "business_coaching_registrations"("session_slug", "status");

CREATE INDEX "business_coaching_attendees_registration_id_idx"
    ON "business_coaching_attendees"("registration_id");

ALTER TABLE "business_coaching_attendees"
    ADD CONSTRAINT "business_coaching_attendees_registration_id_fkey"
    FOREIGN KEY ("registration_id") REFERENCES "business_coaching_registrations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
