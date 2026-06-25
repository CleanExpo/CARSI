-- Stripe webhook event-id guard. Stripe delivers events at least once; this
-- table lets the LMS webhook skip replayed events before enrollment side
-- effects run a second time.
CREATE TABLE IF NOT EXISTS "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(128) NOT NULL,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);
