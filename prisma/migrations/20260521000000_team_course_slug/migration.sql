-- Course purchased for team seats (per-course team checkout).
ALTER TABLE "lms_teams" ADD COLUMN IF NOT EXISTS "course_slug" VARCHAR(128);
