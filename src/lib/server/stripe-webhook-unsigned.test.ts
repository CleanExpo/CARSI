import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  construct: vi.fn(),
}));

vi.mock('@/lib/api/stripe', () => ({
  constructWebhookEvent: mocks.construct,
  getStripeClient: vi.fn(),
  resolveStripeWebhookSecret: () => 'whsec_test_webhook_secret',
  isVerifiedStripeEventShape: (event: { id?: string; object?: string }) =>
    typeof event.id === 'string' && event.id.startsWith('evt_') && event.object === 'event',
  webhookLivemodeMatchesApiKey: () => true,
}));
vi.mock('@/lib/server/stripe-webhook-idempotency', () => ({
  claimStripeWebhookEvent: vi.fn(),
  markStripeWebhookEventProcessed: vi.fn(),
  releaseStripeWebhookEventClaim: vi.fn(),
}));
vi.mock('@/lib/server/sentry', () => ({ captureServerError: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: { stripeWebhookEvent: {} },
}));

import { POST } from '../../../app/api/lms/webhooks/stripe/route';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_webhook_secret';
  process.env.DATABASE_URL = 'postgresql://offline.invalid/test';
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('Stripe webhook unsigned deliveries', () => {
  it('returns 400 and never calls constructEvent when Stripe-Signature is absent', async () => {
    const response = await POST(
      new Request('https://carsi.com.au/api/lms/webhooks/stripe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      }) as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid webhook' });
    expect(mocks.construct).not.toHaveBeenCalled();
  });

  it('returns 400 and never calls constructEvent for a probe-shaped signature', async () => {
    const response = await POST(
      new Request('https://carsi.com.au/api/lms/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 'offline-signature' },
        body: '{}',
      }) as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid webhook' });
    expect(mocks.construct).not.toHaveBeenCalled();
  });

  it('returns 400 and never calls constructEvent when the signed body is empty', async () => {
    const response = await POST(
      new Request('https://carsi.com.au/api/lms/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': `t=1710000000,v1=${'ab'.repeat(32)}` },
        body: '',
      }) as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid webhook' });
    expect(mocks.construct).not.toHaveBeenCalled();
  });

  it('returns 405 on GET so health checks cannot use this URL', async () => {
    const { GET } = await import('../../../app/api/lms/webhooks/stripe/route');
    const response = await GET();
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST');
    expect(mocks.construct).not.toHaveBeenCalled();
  });
});
