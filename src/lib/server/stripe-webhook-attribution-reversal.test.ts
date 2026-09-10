import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  construct: vi.fn(),
  markProcessed: vi.fn(),
  persistReversal: vi.fn(),
  release: vi.fn(),
}));

vi.mock('@/lib/api/stripe', () => ({
  constructWebhookEvent: mocks.construct,
  resolveStripeWebhookSecret: () => 'whsec_test_webhook_secret',
  isVerifiedStripeEventShape: (event: { id?: string; object?: string }) =>
    typeof event.id === 'string' && event.id.startsWith('evt_') && event.object === 'event',
  webhookLivemodeMatchesApiKey: () => true,
  getStripeClient: () => ({
    paymentIntents: { retrieve: vi.fn().mockResolvedValue({ invoice: null }) },
    checkout: { sessions: { list: vi.fn().mockResolvedValue({ data: [{ id: 'cs_early' }] }) } },
  }),
}));
vi.mock('@/lib/server/event-attribution', () => ({
  persistAttributedRevenueReversal: mocks.persistReversal,
  tryRecordAttributedStage: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_webhook_secret';
  process.env.DATABASE_URL = 'postgresql://offline.invalid/test';
  mocks.claim.mockResolvedValue({ claimed: true });
  mocks.persistReversal.mockRejectedValue(new Error('reversal ledger unavailable'));
  mocks.release.mockResolvedValue(undefined);
  mocks.markProcessed.mockResolvedValue(undefined);
  mocks.construct.mockReturnValue({
    id: 'evt_early_refund',
    object: 'event',
    livemode: false,
    type: 'charge.refunded',
    created: 1_784_467_200,
    data: {
      object: {
        amount: 9_900,
        amount_refunded: 2_500,
        currency: 'aud',
        payment_intent: 'pi_early',
      },
    },
  });
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('Stripe webhook durable attribution reversal', () => {
  it('releases the provider claim and returns 500 when reversal persistence fails', async () => {
    const response = await POST(
      new Request('https://carsi.com.au/api/lms/webhooks/stripe', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': `t=1710000000,v1=${'ab'.repeat(32)}`,
        },
        body: '{}',
      }) as never
    );

    expect(response.status).toBe(500);
    expect(mocks.persistReversal).toHaveBeenCalledWith('cs_early', {
      eventId: 'evt_early_refund',
      providerObjectId: null,
      eventAt: new Date(1_784_467_200_000),
      reason: 'refunded',
      reversedRevenueCents: 2_500,
      currency: 'aud',
    });
    expect(mocks.release).toHaveBeenCalledWith(expect.anything(), 'evt_early_refund');
    expect(mocks.markProcessed).not.toHaveBeenCalled();
  });
});
