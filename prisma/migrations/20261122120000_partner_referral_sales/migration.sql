-- GP-767: referral partners, their versioned reward terms, and the paid course checkouts that
-- came through a partner link (?ref=<partner>). Additive: no existing table changes.
-- Nothing here calculates or pays commission.

-- A referral partner. CCW is the first row.
CREATE TABLE "referral_partners" (
    "id" VARCHAR(32) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_partners_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "referral_partners_id_check" CHECK ("id" ~ '^[a-z0-9][a-z0-9-]{0,31}$')
);

-- A partner's reward terms, versioned. Rates in basis points (1000 = 10%).
-- Option A: 10% commission, no customer discount. Option B: 5% customer discount + 5% commission.
CREATE TABLE "referral_partner_terms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partner_id" VARCHAR(32) NOT NULL,
    "version" INTEGER NOT NULL,
    "reward_option" VARCHAR(1) NOT NULL,
    "commission_rate_bps" INTEGER NOT NULL,
    "discount_rate_bps" INTEGER NOT NULL,
    "effective_from" TIMESTAMPTZ(6) NOT NULL,
    "effective_to" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_partner_terms_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "referral_partner_terms_version_check" CHECK ("version" >= 1),
    CONSTRAINT "referral_partner_terms_option_check" CHECK ("reward_option" IN ('A', 'B')),
    CONSTRAINT "referral_partner_terms_rates_check" CHECK (
      ("reward_option" = 'A' AND "commission_rate_bps" = 1000 AND "discount_rate_bps" = 0)
      OR ("reward_option" = 'B' AND "commission_rate_bps" = 500 AND "discount_rate_bps" = 500)
    ),
    CONSTRAINT "referral_partner_terms_window_check" CHECK (
      "effective_to" IS NULL OR "effective_to" > "effective_from"
    ),
    CONSTRAINT "referral_partner_terms_partner_id_fkey" FOREIGN KEY ("partner_id")
      REFERENCES "referral_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "referral_partner_terms_partner_id_version_key"
  ON "referral_partner_terms"("partner_id", "version");
CREATE INDEX "referral_partner_terms_partner_id_effective_from_idx"
  ON "referral_partner_terms"("partner_id", "effective_from");

-- One row per paid course checkout through a partner link, keyed by the Stripe Checkout
-- Session id (the key event_attribution_reversals uses for refunds and disputes). The terms in
-- force when the sale was paid are copied onto the row. No learner identity is stored.
CREATE TABLE "partner_referral_sales" (
    "id" UUID NOT NULL,
    "partner_id" VARCHAR(32) NOT NULL,
    "transaction_id" VARCHAR(255) NOT NULL,
    "course_slug" VARCHAR(200) NOT NULL,
    "amount_paid_cents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "paid_at" TIMESTAMPTZ(6) NOT NULL,
    "terms_id" UUID,
    "terms_version" INTEGER,
    "reward_option" VARCHAR(1),
    "commission_rate_bps" INTEGER,
    "discount_rate_bps" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_referral_sales_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "partner_referral_sales_amount_check" CHECK ("amount_paid_cents" >= 0),
    CONSTRAINT "partner_referral_sales_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
    CONSTRAINT "partner_referral_sales_terms_copy_check" CHECK (
      ("terms_id" IS NULL AND "terms_version" IS NULL AND "reward_option" IS NULL
        AND "commission_rate_bps" IS NULL AND "discount_rate_bps" IS NULL)
      OR ("terms_id" IS NOT NULL AND "terms_version" IS NOT NULL AND "reward_option" IS NOT NULL
        AND "commission_rate_bps" IS NOT NULL AND "discount_rate_bps" IS NOT NULL)
    ),
    CONSTRAINT "partner_referral_sales_partner_id_fkey" FOREIGN KEY ("partner_id")
      REFERENCES "referral_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "partner_referral_sales_terms_id_fkey" FOREIGN KEY ("terms_id")
      REFERENCES "referral_partner_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "partner_referral_sales_transaction_id_key"
  ON "partner_referral_sales"("transaction_id");
CREATE INDEX "partner_referral_sales_partner_id_paid_at_idx"
  ON "partner_referral_sales"("partner_id", "paid_at");

-- Seed: CCW, terms version 1, Option A from 22/11/2026 (Brisbane). Option A is the default
-- until Phill confirms CCW's choice; a change is a new version row, never an edit of this one.
INSERT INTO "referral_partners" ("id", "name") VALUES ('ccw', 'Carpet Cleaners Warehouse');
INSERT INTO "referral_partner_terms"
  ("partner_id", "version", "reward_option", "commission_rate_bps", "discount_rate_bps", "effective_from", "effective_to")
VALUES ('ccw', 1, 'A', 1000, 0, TIMESTAMPTZ '2026-11-22 00:00:00+10:00', NULL);

-- Rollback: roll the application code back first. These tables are the settlement record with
-- partners; drop them only after the sales in them are settled or exported.
