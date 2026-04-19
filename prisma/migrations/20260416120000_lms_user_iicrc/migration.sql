ALTER TABLE "lms_users" ADD COLUMN IF NOT EXISTS "iicrc_member_number" TEXT;
ALTER TABLE "lms_users" ADD COLUMN IF NOT EXISTS "iicrc_expiry_date" DATE;
ALTER TABLE "lms_users" ADD COLUMN IF NOT EXISTS "iicrc_card_image_url" TEXT;
ALTER TABLE "lms_users" ADD COLUMN IF NOT EXISTS "iicrc_certifications" JSONB;
