-- Add a nullable revocation-reason column to lms_enrollments.
--
-- WS3 revoked access on refund/chargeback but only LOGGED the reason. To let a
-- dispute-won re-grant reactivate ONLY dispute-revoked rows (and never a
-- genuinely-refunded one), the reason must be persisted on the row.
--
-- Nullable, no default, no backfill: existing rows keep NULL (they are either
-- active — reason irrelevant — or historically revoked with the reason only in
-- logs). Purely additive DDL; cannot abort the deploy.
ALTER TABLE "lms_enrollments" ADD COLUMN "revoked_reason" TEXT;
