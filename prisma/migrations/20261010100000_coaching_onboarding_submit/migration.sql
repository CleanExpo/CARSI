-- Final onboarding submission (message to Phill + email idempotency)
ALTER TABLE "carsi_coaching_business_profiles"
  ADD COLUMN IF NOT EXISTS "onboarding_problem_statement" TEXT,
  ADD COLUMN IF NOT EXISTS "onboarding_goal_statement" TEXT,
  ADD COLUMN IF NOT EXISTS "onboarding_extra_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "onboarding_submitted_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "onboarding_emails_sent_at" TIMESTAMPTZ(6);
