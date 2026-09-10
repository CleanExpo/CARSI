import { afterEach, describe, expect, it } from 'vitest';
import Stripe from 'stripe';

import {
  constructWebhookEvent,
  isVerifiedStripeEventShape,
  normalizeStripeWebhookSecret,
  resolveStripeWebhookSecret,
  webhookLivemodeMatchesApiKey,
} from './stripe';

const ORIGINAL_ENV = { ...process.env };
const SECRET = 'whsec_test_construct_secret';

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function signedPayload(livemode: boolean) {
  const payload = JSON.stringify({
    id: 'evt_test_webhook_hardening',
    object: 'event',
    type: 'ping',
    livemode,
    data: { object: {} },
  });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
  return { payload, signature };
}

describe('Stripe webhook secret + constructEvent', () => {
  it('strips quotes and spaces from a pasted whsec_ secret', () => {
    expect(normalizeStripeWebhookSecret('  "whsec_abc123456789"  ')).toBe('whsec_abc123456789');
  });

  it('refuses a secret that is not a Stripe signing secret', () => {
    expect(() => resolveStripeWebhookSecret('test_webhook_secret')).toThrow(/webhook secret/);
    expect(() => resolveStripeWebhookSecret('sk_test_not_a_webhook')).toThrow(/webhook secret/);
  });

  it('verifies a Stripe-signed payload without using STRIPE_SECRET_KEY', () => {
    delete process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    const { payload, signature } = signedPayload(false);
    const event = constructWebhookEvent(payload, signature);
    expect(event.id).toBe('evt_test_webhook_hardening');
    expect(isVerifiedStripeEventShape(event)).toBe(true);
  });

  it('rejects a tampered body against a valid signature header', () => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    const { payload, signature } = signedPayload(false);
    expect(() => constructWebhookEvent(`${payload} `, signature)).toThrow();
  });
});

describe('webhookLivemodeMatchesApiKey', () => {
  it('rejects a test event against a live secret key', () => {
    expect(webhookLivemodeMatchesApiKey(false, 'sk_live_abc')).toBe(false);
    expect(webhookLivemodeMatchesApiKey(true, 'sk_live_abc')).toBe(true);
  });

  it('rejects a live event against a test secret key', () => {
    expect(webhookLivemodeMatchesApiKey(true, 'sk_test_abc')).toBe(false);
    expect(webhookLivemodeMatchesApiKey(false, 'sk_test_abc')).toBe(true);
  });

  it('does not drop a verified event when the API key shape is unknown', () => {
    expect(webhookLivemodeMatchesApiKey(true, '')).toBe(true);
    expect(webhookLivemodeMatchesApiKey(false, 'not-a-stripe-key')).toBe(true);
  });
});
