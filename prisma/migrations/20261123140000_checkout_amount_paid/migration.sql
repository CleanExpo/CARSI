-- GP-764: the amount actually paid for each paid course checkout, recorded at fulfilment from
-- the Stripe Checkout Session (amount_total, currency). One row per session; a team purchase is
-- one row for all its seats. Additive: no existing table changes, no backfill. Rows paid before
-- this ships stay "price at purchase unknown" in admin revenue.
CREATE TABLE "lms_checkout_payments" (
    "checkout_session_id" VARCHAR(255) NOT NULL,
    "student_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "purchase_mode" VARCHAR(8) NOT NULL,
    "seat_count" INTEGER NOT NULL,
    "amount_total_cents" INTEGER,
    "currency" VARCHAR(3),
    "paid_at" TIMESTAMPTZ(6) NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_checkout_payments_pkey" PRIMARY KEY ("checkout_session_id"),
    CONSTRAINT "lms_checkout_payments_session_check" CHECK ("checkout_session_id" LIKE 'cs\_%'),
    CONSTRAINT "lms_checkout_payments_mode_check" CHECK ("purchase_mode" IN ('self', 'team')),
    CONSTRAINT "lms_checkout_payments_seats_check" CHECK ("seat_count" >= 1),
    CONSTRAINT "lms_checkout_payments_amount_check" CHECK ("amount_total_cents" IS NULL OR "amount_total_cents" >= 0),
    CONSTRAINT "lms_checkout_payments_currency_check" CHECK ("currency" IS NULL OR "currency" ~ '^[a-z]{3}$')
);

CREATE INDEX "ix_lms_checkout_payments_paid_at" ON "lms_checkout_payments"("paid_at");
