-- CARSI Business Coaching ($495/mo) subscriber portal — separate from lms_subscriptions.

CREATE TABLE "carsi_coaching_monthly_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "stripe_customer_id" VARCHAR(255),
    "stripe_subscription_id" VARCHAR(255),
    "status" VARCHAR(32) NOT NULL,
    "current_period_end" TIMESTAMPTZ(6),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "status_event_at" TIMESTAMPTZ(6),
    "horizontal_summary" TEXT,
    "direction_summary" TEXT,
    "session_prep_notes" TEXT,
    "monthly_actions_json" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carsi_coaching_monthly_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "carsi_coaching_monthly_subscriptions_user_id_key"
    ON "carsi_coaching_monthly_subscriptions"("user_id");

CREATE UNIQUE INDEX "carsi_coaching_monthly_subscriptions_stripe_subscription_id_key"
    ON "carsi_coaching_monthly_subscriptions"("stripe_subscription_id");

CREATE INDEX "idx_carsi_coaching_monthly_subscriptions_customer"
    ON "carsi_coaching_monthly_subscriptions"("stripe_customer_id");

ALTER TABLE "carsi_coaching_monthly_subscriptions"
    ADD CONSTRAINT "carsi_coaching_monthly_subscriptions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "lms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
