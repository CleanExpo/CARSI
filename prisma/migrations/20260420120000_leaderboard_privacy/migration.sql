-- Professional leaderboard: opt-in display name; anonymous by default.
ALTER TABLE "lms_users" ADD COLUMN "leaderboard_show_display_name" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "lms_users" ADD COLUMN "leaderboard_display_name" VARCHAR(48);
