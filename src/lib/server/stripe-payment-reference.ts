/**
 * Resolves the idempotency key for a Stripe checkout fulfillment from the
 * session id. Returns the trimmed id, or null when it is missing/blank.
 *
 * Pure (no imports). Crucially it NEVER returns a shared literal fallback — a
 * shared key (the old "stripe_webhook") collapses unrelated purchases into one
 * idempotency bucket, which breaks de-duplication. A null result means
 * "no reliable key", so callers should skip rather than provision.
 */
export function resolveStripePaymentReference(sessionId: unknown): string | null {
  if (typeof sessionId !== 'string') return null;
  const trimmed = sessionId.trim();
  return trimmed.length > 0 ? trimmed : null;
}
