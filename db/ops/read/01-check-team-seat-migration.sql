-- CARSI · 01 · READ-ONLY · Is the team-seat database change (PR #989) live?
-- Database: DigitalOcean managed Postgres "carsi-db" (the production database).
-- Safe to run: it only reads. It changes nothing.
--
-- Normally this change applies itself when the site deploys. Do NOT add the
-- column by hand: if you do, the next deploy tries to add it again and fails.

SELECT migration_name, finished_at, rolled_back_at
FROM _prisma_migrations
WHERE migration_name = '20261102120000_enrollment_prerequisite_gated';

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'lms_enrollments' AND column_name = 'prerequisite_gated';

-- What you should see:
--   Query 1: one row with a finished_at date and an empty rolled_back_at.
--   Query 2: one row, prerequisite_gated, boolean, NO, false.
-- If either returns no rows, the latest deploy has not run its database step.
-- Send the result to Claude; do not fix it by hand.
