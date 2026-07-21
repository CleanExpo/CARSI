-- Durable Stripe reversal audit ledger. This table is intentionally retained
-- independently of the 90-day event_attribution_events reporting window.
CREATE TABLE "event_attribution_reversals" (
    "id" UUID NOT NULL,
    "stripe_event_id" VARCHAR(255) NOT NULL,
    "provider_object_id" VARCHAR(255),
    "transaction_id" VARCHAR(255) NOT NULL,
    "reversed_revenue_cents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "reason" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "event_at" TIMESTAMPTZ(6) NOT NULL,
    "reconciled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_attribution_reversals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "event_attribution_reversals_amount_check" CHECK (
      "reversed_revenue_cents" >= 0
    ),
    CONSTRAINT "event_attribution_reversals_currency_check" CHECK (
      "currency" ~ '^[A-Z]{3}$'
    ),
    CONSTRAINT "event_attribution_reversals_reason_check" CHECK (
      "reason" IN ('refunded', 'disputed', 'dispute_won')
    ),
    CONSTRAINT "event_attribution_reversals_status_check" CHECK (
      "status" IN ('pending', 'applied', 'stale', 'currency_mismatch')
    )
);

CREATE UNIQUE INDEX "event_attribution_reversals_stripe_event_id_key"
  ON "event_attribution_reversals"("stripe_event_id");
CREATE INDEX "ix_attribution_reversals_transaction_event"
  ON "event_attribution_reversals"("transaction_id", "event_at", "stripe_event_id");
CREATE INDEX "event_attribution_reversals_status_created_at_idx"
  ON "event_attribution_reversals"("status", "created_at");

-- Rollback/containment: roll application code back first and retain this table as
-- audit evidence. Dropping the table destroys reversal history and is therefore
-- a separate founder-approved production data action, not an automatic down step.