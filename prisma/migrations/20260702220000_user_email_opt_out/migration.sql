-- Phase C (2026-07-02): marketing-email opt-out for the monthly toolbox-talk drip (Spam Act).
-- Additive column with a default, so existing rows are backfilled to opted-in (false) safely.

-- AlterTable
ALTER TABLE "lms_users" ADD COLUMN     "email_opt_out" BOOLEAN NOT NULL DEFAULT false;

