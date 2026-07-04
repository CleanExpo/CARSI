-- WS1-E1 (GP-441): out-of-order Stripe webhook guard for the annual membership.
-- Additive, non-destructive: adds ONE nullable column to lms_subscriptions.
-- No existing column is altered or dropped, so the one-off purchase flow and the
-- entitlement gate are untouched. Runs via the existing DO PRE_DEPLOY
-- `prisma migrate deploy` job.
--
-- `status_event_at` stores the Stripe event.created timestamp of the snapshot
-- that last set `status`. upsertSubscription applies an incoming snapshot ONLY
-- when its event timestamp is >= the stored one, so a late (stale) event cannot
-- overwrite a newer state. NULL means "no ordered write yet" (pre-migration rows
-- and legacy writes), which is treated as always-overwritable so behaviour is
-- unchanged until the first ordered event arrives.

-- AlterTable
ALTER TABLE "lms_subscriptions" ADD COLUMN     "status_event_at" TIMESTAMPTZ(6);
