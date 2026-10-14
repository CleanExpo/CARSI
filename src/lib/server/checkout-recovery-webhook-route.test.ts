/**
 * Route-level delivery guarantees for checkout.session.expired (CHECKOUT_RECOVERY_ENABLED on):
 * a transient send failure is NOT acknowledged (the event claim is released and Stripe retries),
 * and duplicate or stale-reclaimed deliveries never send a second email for the same session.
 * Uses the real webhook-claim module over one in-memory `stripe_webhook_events` table.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  construct: vi.fn(),
  send: vi.fn(),
  rows: new Map<string, { type: string; processedAt: Date | null; createdAt: Date }>(),
}));

vi.mock('@/lib/api/stripe', () => ({
  constructWebhookEvent: mocks.construct,
  resolveStripeWebhookSecret: () => 'whsec_test_webhook_secret',
  isVerifiedStripeEventShape: (event: { id?: string; object?: string }) =>
    typeof event.id === 'string' && event.id.startsWith('evt_') && event.object === 'event',
  webhookLivemodeMatchesApiKey: () => true,
  getStripeClient: () => ({}),
}));
vi.mock('@/lib/server/sentry', () => ({ captureServerError: vi.fn() }));
vi.mock('@/lib/server/transactional-email', () => ({ sendCheckoutRecoveryEmail: mocks.send }));
vi.mock('@/lib/prisma', () => {
  const err = (code: string) => Object.assign(new Error(code), { code });
  return {
    prisma: {
      lmsUser: { findFirst: vi.fn().mockResolvedValue(null) },
      lmsCourse: { findUnique: vi.fn().mockResolvedValue({ title: 'Water Damage Essentials' }) },
      stripeWebhookEvent: {
        async create({ data }: { data: { id: string; type: string } }) {
          if (mocks.rows.has(data.id)) throw err('P2002');
          mocks.rows.set(data.id, { type: data.type, processedAt: null, createdAt: new Date() });
          return {};
        },
        async findUnique({ where }: { where: { id: string } }) {
          return mocks.rows.get(where.id) ?? null;
        },
        async update({ where, data }: { where: { id: string }; data: { processedAt: Date } }) {
          const row = mocks.rows.get(where.id);
          if (!row) throw err('P2025');
          row.processedAt = data.processedAt;
          return {};
        },
        async delete({ where }: { where: { id: string } }) {
          if (!mocks.rows.delete(where.id)) throw err('P2025');
          return {};
        },
      },
    },
  };
});

import { POST } from '../../../app/api/lms/webhooks/stripe/route';

const ORIGINAL_ENV = { ...process.env };
const SESSION_ROW = 'checkout_recovery_email:cs_expired_1';
const LONG_AGO = new Date(Date.now() - 60 * 60 * 1000);

function expiredEvent(id: string) {
  return {
    id,
    object: 'event',
    livemode: false,
    type: 'checkout.session.expired',
    created: 1_784_467_200,
    data: {
      object: {
        id: 'cs_expired_1',
        object: 'checkout.session',
        status: 'expired',
        customer_email: 'buyer@example.com',
        customer_details: null,
        metadata: { source: 'carsi-next-local-checkout', course_slug: 'water-damage-essentials' },
        after_expiration: { recovery: { url: 'https://pay.stripe.com/r/cs_expired_1' } },
      },
    },
  };
}

async function deliver(eventId: string) {
  mocks.construct.mockReturnValue(expiredEvent(eventId));
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
  mocks.rows.clear();
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_webhook_secret';
  process.env.DATABASE_URL = 'postgresql://offline.invalid/test';
  process.env.CHECKOUT_RECOVERY_ENABLED = 'true';
  mocks.send.mockResolvedValue({ sent: true });
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('checkout.session.expired webhook delivery', () => {
  it('does not acknowledge a transient send failure; the redelivery sends', async () => {
    mocks.send.mockResolvedValueOnce({ sent: false, reason: 'provider_error' });

    const first = await deliver('evt_exp_1');
    expect(first.status).toBe(500);
    expect(mocks.rows.has('evt_exp_1')).toBe(false); // event claim released for Stripe's retry
    expect(mocks.rows.has(SESSION_ROW)).toBe(false);

    const retry = await deliver('evt_exp_1');
    expect(retry.status).toBe(200);
    expect(mocks.send).toHaveBeenCalledTimes(2);
    expect(mocks.rows.get('evt_exp_1')?.processedAt).toBeInstanceOf(Date);
    expect(mocks.rows.get(SESSION_ROW)?.processedAt).toBeInstanceOf(Date);
  });

  it('a duplicate delivery of a processed event sends nothing', async () => {
    expect((await deliver('evt_exp_1')).status).toBe(200);
    expect((await deliver('evt_exp_1')).status).toBe(200);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });

  it('a stale event claim reclaimed after a crash does not resend a sent email', async () => {
    expect((await deliver('evt_exp_1')).status).toBe(200);
    // Simulate a crash after the send but before the event was marked processed.
    mocks.rows.set('evt_exp_1', { type: 'checkout.session.expired', processedAt: null, createdAt: LONG_AGO });

    const redelivery = await deliver('evt_exp_1');
    expect(redelivery.status).toBe(200);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });

  it('another event id for the same session does not resend', async () => {
    expect((await deliver('evt_exp_1')).status).toBe(200);
    expect((await deliver('evt_exp_2')).status).toBe(200);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });

  it('a crash between provider acceptance and the send record is never resent', async () => {
    mocks.rows.set(SESSION_ROW, { type: 'checkout_recovery_email', processedAt: null, createdAt: LONG_AGO });
    mocks.rows.set('evt_exp_1', { type: 'checkout.session.expired', processedAt: null, createdAt: LONG_AGO });

    const redelivery = await deliver('evt_exp_1');
    expect(redelivery.status).toBe(200);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('a concurrent in-flight send for the session is not acknowledged', async () => {
    mocks.rows.set(SESSION_ROW, { type: 'checkout_recovery_email', processedAt: null, createdAt: new Date() });
    const response = await deliver('evt_exp_2');
    expect(response.status).toBe(500);
    expect(mocks.rows.has('evt_exp_2')).toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
