-- Pseudonymous first-party attribution ledger for the July 2026 CARSI x CCW events.
CREATE TABLE "event_attribution_events" (
    "id" UUID NOT NULL,
    "journey_id" UUID NOT NULL,
    "campaign_id" VARCHAR(80) NOT NULL,
    "source_id" VARCHAR(40) NOT NULL,
    "event_slug" VARCHAR(32) NOT NULL,
    "stage" VARCHAR(32) NOT NULL,
    "course_slug" VARCHAR(200),
    "revenue_cents" INTEGER,
    "currency" VARCHAR(3),
    "transaction_id" VARCHAR(255),
    "reversed_revenue_cents" INTEGER NOT NULL DEFAULT 0,
    "reversal_reason" VARCHAR(32),
    "reversal_event_id" VARCHAR(255),
    "reversal_event_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_attribution_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "event_attribution_events_stage_check" CHECK (
      "stage" IN ('event_registration', 'course_view', 'checkout_started', 'purchase', 'subscription')
    ),
    CONSTRAINT "event_attribution_events_source_check" CHECK (
      "source_id" IN ('melbourne_qr', 'melbourne_email', 'sydney_qr', 'sydney_email')
    ),
    CONSTRAINT "event_attribution_events_revenue_check" CHECK (
      "revenue_cents" IS NULL OR "revenue_cents" >= 0
    ),
    CONSTRAINT "event_attribution_events_currency_check" CHECK (
      "revenue_cents" IS NULL OR "currency" = 'AUD'
    ),
    CONSTRAINT "event_attribution_events_reversed_revenue_check" CHECK (
      "reversed_revenue_cents" >= 0
      AND "reversed_revenue_cents" <= COALESCE("revenue_cents", 0)
    ),
    CONSTRAINT "event_attribution_events_reversal_reason_check" CHECK (
      "reversal_reason" IS NULL OR "reversal_reason" IN ('refunded', 'disputed', 'dispute_won')
    )
);

CREATE UNIQUE INDEX "event_attribution_events_registration_journey_key"
  ON "event_attribution_events"("journey_id", "stage")
  WHERE "stage" = 'event_registration';
CREATE UNIQUE INDEX "event_attribution_events_course_view_key"
  ON "event_attribution_events"("journey_id", "stage", "course_slug")
  WHERE "stage" = 'course_view';
CREATE UNIQUE INDEX "event_attribution_events_stage_transaction_id_key"
  ON "event_attribution_events"("stage", "transaction_id");
CREATE INDEX "event_attribution_events_campaign_id_source_id_stage_idx"
  ON "event_attribution_events"("campaign_id", "source_id", "stage");
CREATE INDEX "event_attribution_events_journey_id_created_at_idx"
  ON "event_attribution_events"("journey_id", "created_at");
CREATE INDEX "event_attribution_events_created_at_idx"
  ON "event_attribution_events"("created_at");
