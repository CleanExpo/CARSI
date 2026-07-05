-- WS1-E2 (GP-442) + WS1-E3 (GP-443): Teams seat subscription + org monthly subscription.
-- Additive, non-destructive: creates two new tables + supporting indexes/FKs.
-- No existing table is altered, so the individual membership (E1), the one-off
-- course purchase flow, and the per-course team seat bundles are all untouched.
-- Runs via the existing DO PRE_DEPLOY `prisma migrate deploy` job.

-- CreateTable: seat-based Teams subscription (E2).
CREATE TABLE "lms_team_subscriptions" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "stripe_customer_id" VARCHAR(255),
    "stripe_subscription_id" VARCHAR(255),
    "status" VARCHAR(32) NOT NULL,
    "plan" VARCHAR(32) NOT NULL DEFAULT 'starter',
    "seat_limit" INTEGER NOT NULL,
    "current_period_end" TIMESTAMPTZ(6),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "status_event_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_team_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lms_team_subscriptions_team_id_key" ON "lms_team_subscriptions"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "lms_team_subscriptions_stripe_subscription_id_key" ON "lms_team_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "idx_lms_team_subscriptions_customer" ON "lms_team_subscriptions"("stripe_customer_id");

-- AddForeignKey
ALTER TABLE "lms_team_subscriptions" ADD CONSTRAINT "lms_team_subscriptions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "lms_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: organisation monthly subscription, unlimited seats (E3).
CREATE TABLE "lms_org_subscriptions" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "organisation_name" VARCHAR(255) NOT NULL,
    "contact_email" VARCHAR(320) NOT NULL,
    "stripe_customer_id" VARCHAR(255),
    "stripe_subscription_id" VARCHAR(255),
    "status" VARCHAR(32) NOT NULL,
    "plan" VARCHAR(32) NOT NULL DEFAULT 'org_monthly',
    "seat_model" VARCHAR(16) NOT NULL DEFAULT 'unlimited',
    "entitled_category" VARCHAR(128) NOT NULL DEFAULT 'CARSI Maintenance Company Onboarding',
    "current_period_end" TIMESTAMPTZ(6),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "status_event_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_org_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lms_org_subscriptions_team_id_key" ON "lms_org_subscriptions"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "lms_org_subscriptions_stripe_subscription_id_key" ON "lms_org_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "idx_lms_org_subscriptions_customer" ON "lms_org_subscriptions"("stripe_customer_id");

-- AddForeignKey
ALTER TABLE "lms_org_subscriptions" ADD CONSTRAINT "lms_org_subscriptions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "lms_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
