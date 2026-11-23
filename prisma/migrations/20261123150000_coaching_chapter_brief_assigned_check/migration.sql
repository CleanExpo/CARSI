-- GP-632 (A5): per-member coach chapter assignment (nullable until admin sets).
-- GP-628 / A1: coach-facing AI brief JSON after onboarding submit.
-- GP-646 / T0: assigned_to allowlist (NOT VALID until Phill confirms prod rows — then VALIDATE).

ALTER TABLE "carsi_coaching_business_profiles"
  ADD COLUMN IF NOT EXISTS "coach_user_id" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "chapter_slug" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "onboarding_coach_brief_json" TEXT,
  ADD COLUMN IF NOT EXISTS "onboarding_coach_brief_at" TIMESTAMPTZ(6);

ALTER TABLE "carsi_coaching_actions"
  ADD CONSTRAINT "carsi_coaching_actions_assigned_to_check"
  CHECK ("assigned_to" IN ('customer', 'coach')) NOT VALID;
