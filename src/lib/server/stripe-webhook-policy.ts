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

/**
 * Rejects traffic that is not a Stripe delivery *before* `constructEvent`.
 *
 * Stripe always sends a `Stripe-Signature` scheme (`t=<unix>,v1=<hex>`) and a
 * signed payload. Health checks, `curl`, and platform probes typically send
 * neither — calling `constructEvent` then throws and looks like a payment
 * incident. A well-formed signature over `{}` still goes through verification
 * (a forged header must fail closed at the Stripe library).
 */
export const STRIPE_WEBHOOK_MAX_BODY_BYTES = 256 * 1024;

export type StripeWebhookEnvelopeReject =
  | 'missing_signature'
  | 'malformed_signature'
  | 'empty_body'
  | 'body_too_large'
  | 'disallowed_content_type';

export function isStripeSignatureHeader(signature: string): boolean {
  const parts = signature
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const hasTimestamp = parts.some((part) => /^t=\d{1,12}$/.test(part));
  const hasV1 = parts.some((part) => /^v1=[0-9a-fA-F]{32,}$/.test(part));
  return hasTimestamp && hasV1;
}

export function isStripeWebhookContentType(contentType: string | null | undefined): boolean {
  if (!contentType?.trim()) return true;
  return /^application\/json(?:\s*;.*)?$/i.test(contentType.trim());
}

export function classifyDeclaredWebhookLength(
  contentLength: string | null | undefined,
): Extract<StripeWebhookEnvelopeReject, 'body_too_large'> | null {
  if (contentLength == null || contentLength === '') return null;
  const n = Number(contentLength);
  if (!Number.isFinite(n) || n < 0 || n > STRIPE_WEBHOOK_MAX_BODY_BYTES) {
    return 'body_too_large';
  }
  return null;
}

export function classifyStripeWebhookEnvelope(
  signature: string | null | undefined,
  rawBody: string,
  options?: { contentType?: string | null },
): StripeWebhookEnvelopeReject | null {
  const header = signature?.trim() ?? '';
  if (!header) return 'missing_signature';
  if (!isStripeSignatureHeader(header)) return 'malformed_signature';
  if (!isStripeWebhookContentType(options?.contentType)) return 'disallowed_content_type';
  if (!rawBody.trim()) return 'empty_body';
  if (Buffer.byteLength(rawBody, 'utf8') > STRIPE_WEBHOOK_MAX_BODY_BYTES) {
    return 'body_too_large';
  }
  return null;
}
