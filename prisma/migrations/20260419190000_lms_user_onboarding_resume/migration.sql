-- Onboarding payload + resume reminder preference for first-session personalization.
ALTER TABLE "lms_users"
  ADD COLUMN IF NOT EXISTS "onboarding_completed_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "onboarding" JSONB,
  ADD COLUMN IF NOT EXISTS "resume_reminder_opt_in" TEXT;
