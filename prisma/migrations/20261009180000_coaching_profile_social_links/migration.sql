-- Social and online presence fields on coaching business profiles.

ALTER TABLE "carsi_coaching_business_profiles" ADD COLUMN IF NOT EXISTS "google_business_url" VARCHAR(500);
ALTER TABLE "carsi_coaching_business_profiles" ADD COLUMN IF NOT EXISTS "facebook_url" VARCHAR(500);
ALTER TABLE "carsi_coaching_business_profiles" ADD COLUMN IF NOT EXISTS "instagram_url" VARCHAR(500);
ALTER TABLE "carsi_coaching_business_profiles" ADD COLUMN IF NOT EXISTS "linkedin_url" VARCHAR(500);
ALTER TABLE "carsi_coaching_business_profiles" ADD COLUMN IF NOT EXISTS "tiktok_url" VARCHAR(500);
ALTER TABLE "carsi_coaching_business_profiles" ADD COLUMN IF NOT EXISTS "youtube_url" VARCHAR(500);
ALTER TABLE "carsi_coaching_business_profiles" ADD COLUMN IF NOT EXISTS "x_url" VARCHAR(500);
ALTER TABLE "carsi_coaching_business_profiles" ADD COLUMN IF NOT EXISTS "social_notes" TEXT;
