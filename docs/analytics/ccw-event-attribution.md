# CCW Business Growth Days event-to-revenue attribution

## Stable distribution IDs

Campaign ID (all links): `carsi_ccw_growth_days_2026`

| Event | Channel | Source ID | Registration URL suffix |
|---|---|---|---|
| Melbourne, 22–23 July 2026 | QR | `melbourne_qr` | `?event=melbourne&campaign=carsi_ccw_growth_days_2026&source=melbourne_qr#booking` |
| Melbourne, 22–23 July 2026 | Email | `melbourne_email` | `?event=melbourne&campaign=carsi_ccw_growth_days_2026&source=melbourne_email#booking` |
| Sydney, 30–31 July 2026 | QR | `sydney_qr` | `?event=sydney&campaign=carsi_ccw_growth_days_2026&source=sydney_qr#booking` |
| Sydney, 30–31 July 2026 | Email | `sydney_email` | `?event=sydney&campaign=carsi_ccw_growth_days_2026&source=sydney_email#booking` |

Use these suffixes with `https://carsi.com.au/events/ccw-roadshow`. Do not publish or regenerate QR/email assets until marketing/founder approval. The server rejects a wrong campaign, unknown source, or source that does not match the selected city. A registration with no campaign and no source remains unattributed.

## Event contract

`event_registration → course_view → checkout_started → purchase | subscription`

- `event_registration`: written after the existing roadshow registration succeeds.
- `course_view`: written once per journey and real catalogue course when an attributed browser mounts a CARSI course page. Arbitrary slugs are rejected, repeats are idempotent, and the route applies an instance-local per-client-IP limit that cannot be reset by cycling journey IDs. Public registration itself is bounded to five attempts per client IP per hour before body parsing.
- `checkout_started`: written only after Stripe returns a checkout session.
- `purchase`: written after a paid one-off course checkout is fulfilled.
- `subscription`: written when Stripe starts the subscription and for each paid invoice; unique transaction IDs make retries idempotent.

## Privacy, notice and retention boundary

Attribution starts only after an attendee submits the existing registration form from an allowlisted campaign link. The server creates a random journey UUID and stores it in a first-party `HttpOnly`, `SameSite=Lax`, secure-in-production cookie for 45 days. Client code cannot read it. The UUID is **pseudonymous attribution data**, not anonymous or PII-free: it persists across sessions and is copied to Stripe metadata, where it can be linked to a payer.

The attribution table and Stripe metadata contain the opaque journey UUID, allowlisted campaign/source, event city slug, stage, optional course slug, verified AUD cents and provider transaction reference. They do not directly contain attendee/learner name, email, phone, company, IP, user ID, free-entry token, form goals or cookie preference state. Existing GA4/PostHog behaviour is unchanged; CARSI has no separate analytics-consent preference control to reuse. The existing privacy notice and browser-cookie controls therefore apply: clearing or blocking the cookie stops later stage linkage, and a request without it is a no-op.

Ledger rows have a 90-day retention boundary. Reports exclude older rows, and registration/report activity opportunistically deletes expired rows. This is operational attribution retention, not Stripe's separate payment-record retention.

Malformed attribution is fail-closed. Attribution storage failure is fail-open for the commercial operation: it is logged but never blocks registration, checkout, payment fulfilment or entitlement.

## Deployment and founder gate

This PR includes an additive Prisma migration. Applying the production migration, enabling subscriptions, publishing links/QR/email, merging and deploying are founder-gated actions. No production database, Stripe, environment, email, QR or pricing state is changed by the PR.

## First report after deployment

An authenticated admin can request:

`GET /api/admin/attribution/report`

The response uses complete database-side aggregation across the retained campaign window and reports unique journeys at every funnel stage plus `netRevenueAud` by source. Net revenue subtracts cumulative partial/full refunds and disputes from the original signature-verified paid event; a later merchant-won dispute restores that amount. Gross payment history remains in the ledger and reversal snapshots are ordered/idempotent by Stripe event ID and timestamp. It does not return partial totals from an oldest/newest row window. The first useful read should be taken after the Melbourne event, then again after Sydney, with the exact deployed commit and report timestamp recorded.

Campaign/source values are public and self-asserted. The report is last-touch marketing attribution, not fraud-resistant proof that a registration came from a particular QR code or email.
