import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rows, delegate, sendEmail, sendFounder, sessionsUpdate } = vi.hoisted(() => {
  const rows = new Map<string, { id: string; type: string; processedAt: Date | null }>();
  const prismaError = (code: string) => Object.assign(new Error(code), { code });
  const delegate = {
    create: vi.fn(async ({ data }: { data: { id: string; type: string } }) => {
      if (rows.has(data.id)) throw prismaError('P2002');
      const row = { ...data, processedAt: null };
      rows.set(data.id, row);
      return row;
    }),
    update: vi.fn(
      async ({ where, data }: { where: { id: string }; data: { processedAt: Date } }) => {
        const row = rows.get(where.id);
        if (!row) throw prismaError('P2025');
        row.processedAt = data.processedAt;
        return row;
      }
    ),
    delete: vi.fn(async ({ where }: { where: { id: string } }) => {
      if (!rows.delete(where.id)) throw prismaError('P2025');
      return {};
    }),
  };
  return {
    rows,
    delegate,
    sendEmail: vi.fn(),
    sendFounder: vi.fn(),
    sessionsUpdate: vi.fn(),
  };
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    stripeWebhookEvent: delegate,
    lmsUser: { findUnique: vi.fn(async () => null) },
  },
}));
vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({
    checkout: { sessions: { update: sessionsUpdate } },
    subscriptions: { retrieve: vi.fn() },
  }),
}));
vi.mock('@/lib/server/email', () => ({ sendEmail }));
vi.mock('@/lib/server/carsi-coaching-monthly-notify', () => ({
  sendCarsiCoachingMonthlyFounderNotificationEmail: sendFounder,
}));
vi.mock('@/lib/server/carsi-coaching-subscription-store', () => ({
  upsertCoachingMonthlySubscription: vi.fn(),
}));

import { CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE } from '@/lib/server/carsi-coaching-monthly-checkout';
import {
  isCarsiCoachingMonthlyCheckoutSession,
  processCarsiCoachingMonthlyCheckoutCompleted,
} from '@/lib/server/carsi-coaching-monthly-fulfillment';

function paidSession(): Stripe.Checkout.Session {
  return {
    id: 'cs_test_gp672',
    payment_status: 'paid',
    status: 'complete',
    mode: 'subscription',
    amount_total: 9900,
    subscription: null,
    customer_details: { email: 'member@example.test', name: 'Test Member' },
    metadata: {
      source: CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE,
      carsi_user_id: 'user_1',
    },
  } as unknown as Stripe.Checkout.Session;
}

const run = () =>
  processCarsiCoachingMonthlyCheckoutCompleted(paidSession(), {
    appOrigin: 'https://example.test',
  });

describe('CARSI coaching monthly fulfillment', () => {
  it('recognises coaching checkout sessions by metadata source', () => {
    expect(
      isCarsiCoachingMonthlyCheckoutSession({
        metadata: { source: CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE },
      } as Stripe.Checkout.Session)
    ).toBe(true);
    expect(
      isCarsiCoachingMonthlyCheckoutSession({
        metadata: { source: 'other' },
      } as Stripe.Checkout.Session)
    ).toBe(false);
  });
});

describe('GP-672 coaching monthly emails are sent at most once', () => {
  beforeEach(() => {
    rows.clear();
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    sendEmail.mockResolvedValue({ sent: true });
    sendFounder.mockResolvedValue({ sent: true });
    // The Stripe "sent" metadata flag write fails on every run.
    sessionsUpdate.mockRejectedValue(new Error('stripe unavailable'));
  });

  it('does not resend either email when the Stripe sent-flag write failed on the first run', async () => {
    const first = await run();
    expect(first.customerEmailSent).toBe(true);
    expect(first.founderEmailSent).toBe(true);

    const second = await run();
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendFounder).toHaveBeenCalledTimes(1);
    expect(second.customerEmailSent).toBe(false);
    expect(second.customerEmailDelivery).toBe('already_claimed');
    expect(second.founderEmailDelivery).toBe('already_claimed');
  });

  it('marks each delivery record processed after a good send', async () => {
    await run();
    const records = [...rows.values()];
    expect(records).toHaveLength(2);
    expect(records.every((r) => r.type === 'carsi_coaching_monthly_email')).toBe(true);
    expect(records.every((r) => r.processedAt instanceof Date)).toBe(true);
  });

  it('two simultaneous runs send each email once', async () => {
    await Promise.all([run(), run()]);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendFounder).toHaveBeenCalledTimes(1);
  });

  it('does not retry after an uncertain send failure (at most once)', async () => {
    sendEmail.mockResolvedValueOnce({ sent: false, reason: 'send_failed' });
    sendFounder.mockRejectedValueOnce(new Error('timeout'));
    const first = await run();
    expect(first.customerEmailDelivery).toBe('failed');
    expect(first.founderEmailDelivery).toBe('failed');
    await run();
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendFounder).toHaveBeenCalledTimes(1);
    expect([...rows.values()].every((r) => r.processedAt === null)).toBe(true);
  });

  it('releases the record when mail is not configured, so a later run can send', async () => {
    sendEmail.mockResolvedValueOnce({ sent: false, reason: 'not_configured' });
    sendFounder.mockResolvedValueOnce({ sent: false, reason: 'not_configured' });
    const first = await run();
    expect(first.customerEmailDelivery).toBe('not_configured');
    expect(rows.size).toBe(0);

    const second = await run();
    expect(second.customerEmailSent).toBe(true);
    expect(second.founderEmailSent).toBe(true);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it('sends nothing when the delivery record cannot be written', async () => {
    const dbDown = Object.assign(new Error('db down'), { code: 'P1001' });
    delegate.create.mockRejectedValueOnce(dbDown).mockRejectedValueOnce(dbDown);
    const result = await run();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendFounder).not.toHaveBeenCalled();
    expect(result.customerEmailDelivery).toBe('unavailable');
    expect(result.founderEmailDelivery).toBe('unavailable');
  });

  it('still honours the Stripe metadata fast path', async () => {
    const session = paidSession();
    session.metadata = { ...session.metadata, coaching_monthly_emails_sent: 'true' };
    const result = await processCarsiCoachingMonthlyCheckoutCompleted(session);
    expect(result.skipped).toBe('already_emailed');
    expect(sendEmail).not.toHaveBeenCalled();
    expect(delegate.create).not.toHaveBeenCalled();
  });
});
