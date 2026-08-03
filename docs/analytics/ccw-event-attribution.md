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
- `course_view`: written once per journey and real catalogue course when an attributed browser mounts a CARSI course page. Arbitrary slugs are rejected, repeats are idempotent, and the route applies an instance-local per-client-IP limit that cannot be reset by cycling journey IDs. Public registration itself is protected by the existing Turnstile control plus five attempts per client IP per hour before body parsing.
- `checkout_started`: written only after Stripe returns a checkout session.
- `purchase`: written after a paid one-off course checkout is fulfilled.
- `subscription`: written when Stripe starts the subscription and for each paid invoice; unique transaction IDs make retries idempotent.

## Privacy, notice and retention boundary

Attribution starts only after an attendee submits the existing registration form from an allowlisted campaign link. The server creates a random journey UUID and stores it in a first-party `HttpOnly`, `SameSite=Lax`, secure-in-production cookie for 45 days. Client code cannot read it. The UUID is **pseudonymous attribution data**, not anonymous or PII-free: it persists across sessions and is copied to Stripe metadata, where it can be linked to a payer.

The attribution table and Stripe metadata contain the opaque journey UUID, allowlisted campaign/source, event city slug, stage, optional course slug, verified AUD cents and provider transaction reference. They do not directly contain attendee/learner name, email, phone, company, IP, user ID, free-entry token, form goals or cookie preference state. Existing GA4/PostHog behaviour is unchanged; CARSI has no separate analytics-consent preference control to reuse. The existing privacy notice and browser-cookie controls therefore apply: clearing or blocking the cookie stops later stage linkage, and a request without it is a no-op.

Journey/stage rows have a 90-day retention boundary. Reports exclude older rows, and registration/report activity opportunistically deletes expired rows. Raw provider reversal facts are retained separately in `event_attribution_reversals`; they are not deleted by the reporting-window prune because they are the audit trail needed to explain net revenue. This is operational attribution retention, not Stripe's separate payment-record retention.

Malformed attribution is fail-closed. Non-revenue journey-stage attribution remains fail-open for the commercial operation. A signed paid or reversal webhook is different: its revenue fact and any pending-reversal reconciliation must commit before webhook acknowledgement, otherwise CARSI returns 5xx and releases the provider-event claim so Stripe can retry.

## Deployment and founder gate

This PR includes an additive Prisma migration. Applying the production migration, enabling subscriptions, publishing links/QR/email, merging and deploying are founder-gated actions. No production database, Stripe, environment, email, QR or pricing state is changed by the PR.

## First report after deployment

An authenticated admin can request:

`GET /api/admin/attribution/report`

The response uses complete database-side aggregation across the retained campaign window and reports unique journeys at every funnel stage plus `netRevenueAud` by source. Net revenue subtracts cumulative partial/full refunds and disputes from the original signature-verified paid event; a later merchant-won dispute restores that amount. Gross payment history remains in the ledger and reversal snapshots are ordered/idempotent by Stripe event ID and timestamp. It does not return partial totals from an oldest/newest row window. The first useful read should be taken after the Melbourne event, then again after Sydney, with the exact deployed commit and report timestamp recorded.

Campaign/source values are public and self-asserted. The report is last-touch marketing attribution, not fraud-resistant proof that a registration came from a particular QR code or email.

## Durable reversal ordering

Stripe does not guarantee that paid, refund and dispute webhooks arrive in business order. Every signed refund/dispute event is inserted in `event_attribution_reversals` before the webhook is acknowledged. If the paid attribution row is absent, the event stays `pending`. Paid-row creation and reconciliation run in one serializable transaction; serialization conflicts use the shared bounded retry helper. A provider event ID is unique, and a duplicate with different immutable facts fails closed as an identity conflict.

The materialised reversal columns on `event_attribution_events` remain the report source. Reconciliation replays at most 1,000 ledger events for one transaction. Exceeding that defensive bound returns a retryable error rather than silently producing an incomplete total. Cumulative refunds use their largest cumulative amount. A merchant-won dispute restores disputed revenue but never erases a real refund. For equal Stripe timestamps the fixed reason order is `disputed`, `dispute_won`, then `refunded`; amount and event ID provide the final deterministic tie-breakers.

### Canonical transaction keys

| Paid surface | Stripe transaction key | Reversal lookup path |
| --- | --- | --- |
| One-off course checkout | `checkout.session.id` (`cs_…`) | charge/dispute → payment intent → checkout session |
| Membership renewal | `invoice.id` (`in_…`) | charge/dispute → payment intent → invoice |

The payment-intent ID and charge ID are correlation identifiers only. They are never substituted for the original paid transaction key. When an invoice exists it wins over any checkout-session lookup so one Stripe event ID maps to exactly one ledger row.

### Telemetry and operator interpretation

`[event-attribution] reversal reconciliation` logs only `status` and `appliedRows`; no payment, learner or journey identifier is emitted. `pending` means durable but not yet attributable, `applied` means the materialised paid row was updated, and `duplicate` means the immutable provider event already existed and was safely replayed. Ledger rows with another currency are marked `currency_mismatch`; superseded events are `stale`. Pending rows that remain after the expected webhook retry window are operationally orphaned and require investigation, not deletion.

## Historical recovery (approval-required, dry-run only)

Already-acknowledged reversals from before the ledger migration cannot be inferred from CARSI's database. An authorised operator must first obtain an offline Stripe event export through the approved access path. The planner has no Stripe client, imports no Prisma client and performs no mutation:

```text
npm run attribution:reversal-recovery:plan -- \
  --dry-run \
  --authorised-by=<approval-reference> \
  --input=<offline-stripe-events.json> \
  --output=<new-plan-file.json>
```

The command refuses to run without `--dry-run`, an authorisation reference and an input file; the output file must not already exist. Its result is candidate evidence only. A human must resolve each payment intent to exactly one canonical invoice/checkout key, review duplicates and currency, and approve any separate write tool. This repository deliberately contains no recovery mutation command. Do not point the planner at production and do not run a recovery write from this task.

### Rollback and containment

Roll application code back first while retaining `event_attribution_reversals` as audit evidence. Do not drop or truncate the ledger during an application rollback. Disabling or deleting the ledger is a destructive production-data action requiring separate founder approval. While code is contained, Stripe retries persistence failures and the existing materialised report remains at its last successfully reconciled state.
