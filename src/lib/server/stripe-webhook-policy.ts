/**
 * Decide whether Stripe should retry delivery after a checkout-fulfillment
 * failure.
 *
 * Returning a 2xx from the webhook tells Stripe the event is handled and it will
 * NOT retry. Returning a 5xx makes Stripe retry (with backoff, for up to ~3
 * days). We only acknowledge *terminal* business conditions; any other failure
 * (e.g. a transient database error) must be retried so a paid enrolment is never
 * silently dropped.
 */

const TERMINAL_FULFILLMENT_REASONS = new Set<string>(['ALREADY_ON_TEAM']);

export function shouldRetryWebhookFulfillment(errorMessage: string): boolean {
  return !TERMINAL_FULFILLMENT_REASONS.has(errorMessage);
}
