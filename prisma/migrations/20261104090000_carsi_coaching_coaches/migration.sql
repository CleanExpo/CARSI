-- GP-632: coaching chapters. Additive only: a new table, one nullable column, and one default row.
-- A member whose coach_id is NULL belongs to the default coach (Phill), so nothing that exists today changes route.

CREATE TABLE IF NOT EXISTS "carsi_coaching_coaches" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "display_name" VARCHAR(120) NOT NULL,
    "chapter_slug" VARCHAR(64) NOT NULL,
    "chapter_name" VARCHAR(120) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'aud',
    "monthly_price_cents" INTEGER,
    "stripe_price_id" VARCHAR(255),
    "notification_email" VARCHAR(320) NOT NULL,
    "brand_colour" VARCHAR(7),
    "logo_url" VARCHAR(500),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "carsi_coaching_coaches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "carsi_coaching_coaches_chapter_slug_key"
    ON "carsi_coaching_coaches"("chapter_slug");

CREATE INDEX IF NOT EXISTS "carsi_coaching_coaches_user_id_idx"
    ON "carsi_coaching_coaches"("user_id");

-- At most one default coach.
CREATE UNIQUE INDEX IF NOT EXISTS "carsi_coaching_coaches_one_default_key"
    ON "carsi_coaching_coaches"("is_default") WHERE "is_default" = true;

ALTER TABLE "carsi_coaching_coaches"
    ADD CONSTRAINT "carsi_coaching_coaches_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "lms_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "carsi_coaching_business_profiles"
    ADD COLUMN IF NOT EXISTS "coach_id" UUID;

CREATE INDEX IF NOT EXISTS "carsi_coaching_business_profiles_coach_id_idx"
    ON "carsi_coaching_business_profiles"("coach_id");

ALTER TABLE "carsi_coaching_business_profiles"
    ADD CONSTRAINT "carsi_coaching_business_profiles_coach_id_fkey"
    FOREIGN KEY ("coach_id") REFERENCES "carsi_coaching_coaches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The default chapter. Its emails still use CARSI_COACHING_MONTHLY_NOTIFY_EMAIL when that is set,
-- exactly as before; notification_email is the fallback the code already used.
INSERT INTO "carsi_coaching_coaches"
    ("id", "display_name", "chapter_slug", "chapter_name", "currency", "monthly_price_cents", "notification_email", "is_default")
VALUES
    ('6f1c2a7e-0b3d-4c58-9e21-5a7d3f0c1b01', 'Phill McGurk', 'carsi-business-coaching', 'CARSI Business Coaching', 'aud', 49500, 'phill.mcgurk@gmail.com', true)
ON CONFLICT ("chapter_slug") DO NOTHING;
