-- WS1-E1 (GP-441): individual annual membership entitlement.
-- Additive, non-destructive: creates one new table + supporting indexes/FK.
-- No existing table is altered, so the one-off course purchase flow is untouched.
-- Runs via the existing DO PRE_DEPLOY `prisma migrate deploy` job.

-- CreateTable
CREATE TABLE "lms_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "stripe_customer_id" VARCHAR(255),
    "stripe_subscription_id" VARCHAR(255),
    "status" VARCHAR(32) NOT NULL,
    "plan" VARCHAR(32) NOT NULL DEFAULT 'pro_annual',
    "current_period_end" TIMESTAMPTZ(6),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lms_subscriptions_user_id_key" ON "lms_subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "lms_subscriptions_stripe_subscription_id_key" ON "lms_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "idx_lms_subscriptions_customer" ON "lms_subscriptions"("stripe_customer_id");

-- AddForeignKey
ALTER TABLE "lms_subscriptions" ADD CONSTRAINT "lms_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
