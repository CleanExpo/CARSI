-- GP-634 (Coaching advantage A7): AI marketing pack per coaching member.
-- Additive only: one new table, no change to existing rows.

-- CreateTable
CREATE TABLE "carsi_coaching_marketing_packs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "website_url" VARCHAR(500),
    "google_business_url" VARCHAR(500),
    "review_json" TEXT NOT NULL,
    "checklist_json" TEXT NOT NULL,
    "calendar_json" TEXT NOT NULL,
    "voice_json" TEXT NOT NULL,
    "calendar_source" VARCHAR(32) NOT NULL,
    "model" VARCHAR(120),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carsi_coaching_marketing_packs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "carsi_coaching_marketing_packs_user_id_created_at_idx" ON "carsi_coaching_marketing_packs"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "carsi_coaching_marketing_packs" ADD CONSTRAINT "carsi_coaching_marketing_packs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

