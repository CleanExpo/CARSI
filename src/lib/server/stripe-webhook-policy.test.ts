import { describe, expect, it } from 'vitest';

import {
  classifyDeclaredWebhookLength,
  classifyStripeWebhookEnvelope,
  isStripeSignatureHeader,
  shouldRetryWebhookFulfillment,
  STRIPE_WEBHOOK_MAX_BODY_BYTES,
} from './stripe-webhook-policy';

const VALID_V1 = `v1=${'ab'.repeat(32)}`;
const VALID_SIG = `t=1710000000,${VALID_V1}`;

describe('shouldRetryWebhookFulfillment', () => {
  it('does NOT retry a terminal business condition (user already on a team)', () => {
    expect(shouldRetryWebhookFulfillment('ALREADY_ON_TEAM')).toBe(false);
  });

  it('retries an unexpected/transient error so a paid enrolment is not lost', () => {
    expect(shouldRetryWebhookFulfillment("Can't reach database server")).toBe(true);
  });

  it('retries on an empty/unknown error message', () => {
    expect(shouldRetryWebhookFulfillment('')).toBe(true);
  });
});

describe('isStripeSignatureHeader', () => {
  it('accepts the Stripe t=,v1= scheme', () => {
    expect(isStripeSignatureHeader(VALID_SIG)).toBe(true);
    expect(isStripeSignatureHeader(`t=1710000000,v0=${'cd'.repeat(32)},${VALID_V1}`)).toBe(true);
  });

  it('rejects probe-shaped headers', () => {
    expect(isStripeSignatureHeader('offline-signature')).toBe(false);
    expect(isStripeSignatureHeader('t=1,v1=abc')).toBe(false);
    expect(isStripeSignatureHeader(VALID_V1)).toBe(false);
  });
});

describe('classifyStripeWebhookEnvelope', () => {
  it('rejects a missing Stripe-Signature even when the body looks like JSON', () => {
    expect(classifyStripeWebhookEnvelope(null, '{}')).toBe('missing_signature');
    expect(classifyStripeWebhookEnvelope('', '{}')).toBe('missing_signature');
    expect(classifyStripeWebhookEnvelope('   ', '{}')).toBe('missing_signature');
  });

  it('rejects a header that is not the Stripe scheme', () => {
    expect(classifyStripeWebhookEnvelope('offline-signature', '{}')).toBe('malformed_signature');
  });

  it('rejects an empty body when a well-formed signature header is present', () => {
    expect(classifyStripeWebhookEnvelope(VALID_SIG, '')).toBe('empty_body');
    expect(classifyStripeWebhookEnvelope(VALID_SIG, '  \n')).toBe('empty_body');
  });

  it('rejects a non-JSON content type when one is sent', () => {
    expect(
      classifyStripeWebhookEnvelope(VALID_SIG, '{}', { contentType: 'text/plain' }),
    ).toBe('disallowed_content_type');
  });

  it('allows application/json with an optional charset', () => {
    expect(
      classifyStripeWebhookEnvelope(VALID_SIG, '{}', {
        contentType: 'application/json; charset=utf-8',
      }),
    ).toBeNull();
  });

  it('does not pre-reject a scheme-valid signature over {} — Stripe must verify', () => {
    expect(classifyStripeWebhookEnvelope(VALID_SIG, '{}')).toBeNull();
  });

  it('rejects a body larger than the Stripe delivery cap', () => {
    const huge = 'x'.repeat(STRIPE_WEBHOOK_MAX_BODY_BYTES + 1);
    expect(classifyStripeWebhookEnvelope(VALID_SIG, huge)).toBe('body_too_large');
  });
});

describe('classifyDeclaredWebhookLength', () => {
  it('rejects a Content-Length that is missing, negative, or over the cap', () => {
    expect(classifyDeclaredWebhookLength(null)).toBeNull();
    expect(classifyDeclaredWebhookLength('512')).toBeNull();
    expect(classifyDeclaredWebhookLength('-1')).toBe('body_too_large');
    expect(classifyDeclaredWebhookLength('nope')).toBe('body_too_large');
    expect(classifyDeclaredWebhookLength(String(STRIPE_WEBHOOK_MAX_BODY_BYTES + 1))).toBe(
      'body_too_large',
    );
  });
});
