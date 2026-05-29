-- Per-course team seat purchases (multiple course checkouts per team).
CREATE TABLE IF NOT EXISTS "lms_team_course_purchases" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "course_slug" VARCHAR(128) NOT NULL,
    "seat_limit" INTEGER NOT NULL,
    "payment_reference" VARCHAR(255),
    "purchased_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_team_course_purchases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lms_team_course_purchases_team_id_idx" ON "lms_team_course_purchases"("team_id");
CREATE INDEX IF NOT EXISTS "lms_team_course_purchases_course_slug_idx" ON "lms_team_course_purchases"("course_slug");

ALTER TABLE "lms_team_course_purchases"
ADD CONSTRAINT "lms_team_course_purchases_team_id_fkey"
FOREIGN KEY ("team_id") REFERENCES "lms_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from legacy single course_slug + seat_limit on team.
INSERT INTO "lms_team_course_purchases" ("id", "team_id", "course_slug", "seat_limit", "payment_reference", "purchased_at")
SELECT
    gen_random_uuid(),
    t."id",
    t."course_slug",
    t."seat_limit",
    NULL,
    t."created_at"
FROM "lms_teams" t
WHERE t."bundle_tier" = 'course_purchase'
  AND t."course_slug" IS NOT NULL
  AND t."course_slug" <> ''
  AND NOT EXISTS (
    SELECT 1 FROM "lms_team_course_purchases" p WHERE p."team_id" = t."id" AND p."course_slug" = t."course_slug"
  );
