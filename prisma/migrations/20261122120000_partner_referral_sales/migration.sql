-- GP-767: paid course checkouts that came through a referral partner link (?ref=<partner>).
-- One row per Stripe Checkout Session; refunds are read from event_attribution_reversals by the
-- same transaction_id. No learner identity is stored. Additive: no existing table changes.
CREATE TABLE "partner_referral_sales" (
    "id" UUID NOT NULL,
    "partner_id" VARCHAR(32) NOT NULL,
    "transaction_id" VARCHAR(255) NOT NULL,
    "course_slug" VARCHAR(200) NOT NULL,
    "amount_paid_cents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "paid_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_referral_sales_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "partner_referral_sales_amount_check" CHECK ("amount_paid_cents" >= 0),
    CONSTRAINT "partner_referral_sales_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$')
);

CREATE UNIQUE INDEX "partner_referral_sales_transaction_id_key"
  ON "partner_referral_sales"("transaction_id");
CREATE INDEX "partner_referral_sales_partner_id_paid_at_idx"
  ON "partner_referral_sales"("partner_id", "paid_at");

-- Rollback: roll the application code back first. The table is the settlement record with the
-- partner; drop it only after the sales in it are settled or exported.
