-- Session prep notes when member has no coaching subscription workspace row (dev / edge cases).
ALTER TABLE "carsi_coaching_business_profiles"
ADD COLUMN IF NOT EXISTS "session_prep_notes" TEXT;
