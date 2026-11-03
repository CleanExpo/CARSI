/**
 * GP-632 review round 2: a paid coaching-monthly checkout whose coach notice did not go out
 * must not be acknowledged. The webhook releases its claim and returns 500 so Stripe delivers
 * the event again; the fulfillment then sends only what is still owed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  construct: vi.fn(),
  markProcessed: vi.fn(),
  release: vi.fn(),
  fulfil: vi.fn(),
}));

vi.mock('@/lib/api/stripe', () => ({
  constructWebhookEvent: mocks.construct,
  resolveStripeWebhookSecret: () => 'whsec_test_webhook_secret',
  isVerifiedStripeEventShape: (event: { id?: string; object?: string }) =>
    typeof event.id === 'string' && event.id.startsWith('evt_') && event.object === 'event',
  webhookLivemodeMatchesApiKey: () => true,
  getStripeClient: vi.fn(),
}));
vi.mock('@/lib/server/carsi-coaching-monthly-fulfillment', () => ({
  processCarsiCoachingMonthlyCheckoutCompleted: mocks.fulfil,
}));
vi.mock('@/lib/server/stripe-webhook-idempotency', () => ({
  claimStripeWebhookEvent: mocks.claim,
  markStripeWebhookEventProcessed: mocks.markProcessed,
  releaseStripeWebhookEventClaim: mocks.release,
}));
vi.mock('@/lib/server/sentry', () => ({ captureServerError: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    stripeWebhookEvent: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { POST } from '../../../app/api/lms/webhooks/stripe/route';

const ORIGINAL_ENV = { ...process.env };

function deliver() {
  return POST(
    new Request('https://carsi.com.au/api/lms/webhooks/stripe', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': `t=1710000000,v1=${'ab'.repeat(32)}`,
      },
      body: '{}',
    }) as never
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_webhook_secret';
  process.env.DATABASE_URL = 'postgresql://offline.invalid/test';
  mocks.claim.mockResolvedValue({ claimed: true });
  mocks.release.mockResolvedValue(undefined);
  mocks.markProcessed.mockResolvedValue(undefined);
  mocks.construct.mockReturnValue({
    id: 'evt_coaching_monthly',
    object: 'event',
    livemode: false,
    type: 'checkout.session.completed',
    created: 1_784_467_200,
    data: {
      object: {
        id: 'cs_coaching_monthly',
        payment_status: 'paid',
        metadata: { source: 'carsi-coaching-monthly' },
      },
    },
  });
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('Stripe webhook coaching-monthly coach notice retry', () => {
  it('returns 500 and releases the claim while the coach notice is still owed', async () => {
    mocks.fulfil.mockResolvedValue({
      fulfilled: true,
      customerEmailSent: true,
      founderEmailSent: false,
    });

    const response = await deliver();

    expect(response.status).toBe(500);
    expect(mocks.release).toHaveBeenCalledWith(expect.anything(), 'evt_coaching_monthly');
    expect(mocks.markProcessed).not.toHaveBeenCalled();
  });

  it('acknowledges once both emails are sent', async () => {
    mocks.fulfil.mockResolvedValue({
      fulfilled: true,
      customerEmailSent: true,
      founderEmailSent: true,
    });

    const response = await deliver();

    expect(response.status).toBe(200);
    expect(mocks.markProcessed).toHaveBeenCalledWith(expect.anything(), 'evt_coaching_monthly');
    expect(mocks.release).not.toHaveBeenCalled();
  });

  it('still acknowledges a session it does not fulfil (nothing owed to retry)', async () => {
    mocks.fulfil.mockResolvedValue({ fulfilled: false, skipped: 'no_email' });

    const response = await deliver();

    expect(response.status).toBe(200);
    expect(mocks.release).not.toHaveBeenCalled();
  });
});
