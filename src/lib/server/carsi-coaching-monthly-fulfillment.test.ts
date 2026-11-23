import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE } from '@/lib/server/carsi-coaching-monthly-checkout';
import {
  isCarsiCoachingMonthlyCheckoutSession,
  processCarsiCoachingMonthlyCheckoutCompleted,
} from '@/lib/server/carsi-coaching-monthly-fulfillment';

/**
 * GP-672: the welcome email and the coach's new-member notice must go out at most once per
 * checkout session. The webhook and the success page both run fulfilment, and the Stripe
 * metadata flag that used to be the only record can fail to write. Only the boundaries are
 * mocked: the database (an in-memory table with a real unique key), Stripe and the mail send.
 */

const db = vi.hoisted(() => ({
  rows: new Map<string, { id: string; type: string; processedAt: Date | null }>(),
}));

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  sendNotice: vi.fn(),
  sessionsUpdate: vi.fn(),
}));

function uniqueViolation(): Error {
  return Object.assign(new Error('Unique constraint failed on the fields: (`id`)'), {
    code: 'P2002',
  });
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: { findUnique: vi.fn(async () => null) },
    stripeWebhookEvent: {
      create: vi.fn(async ({ data }: { data: { id: string; type: string } }) => {
        if (db.rows.has(data.id)) throw uniqueViolation();
        const row = { id: data.id, type: data.type, processedAt: null };
        db.rows.set(data.id, row);
        return row;
      }),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: { processedAt: Date } }) => {
          const row = db.rows.get(where.id);
          if (!row) throw Object.assign(new Error('not found'), { code: 'P2025' });
          row.processedAt = data.processedAt;
          return row;
        }
      ),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        const row = db.rows.get(where.id);
        if (!row) throw Object.assign(new Error('not found'), { code: 'P2025' });
        db.rows.delete(where.id);
        return row;
      }),
    },
  },
}));

vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({
    checkout: { sessions: { update: mocks.sessionsUpdate } },
    subscriptions: {
      retrieve: vi.fn(async () => {
        throw new Error('no live Stripe in tests');
      }),
    },
  }),
}));

vi.mock('@/lib/server/email', () => ({ sendEmail: mocks.sendEmail }));

vi.mock('@/lib/server/carsi-coaching-monthly-notify', () => ({
  sendCarsiCoachingMonthlyFounderNotificationEmail: mocks.sendNotice,
}));

function paidSession(id = 'cs_test_gp672'): Stripe.Checkout.Session {
  return {
    id,
    payment_status: 'paid',
    status: 'complete',
    mode: 'subscription',
    amount_total: 9900,
    customer_details: { email: 'Member@Example.com', name: 'Test Member' },
    metadata: { source: CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE },
  } as unknown as Stripe.Checkout.Session;
}

const OPTS = { appOrigin: 'https://carsi.example' };

describe('CARSI coaching monthly fulfillment', () => {
  beforeEach(() => {
    db.rows.clear();
    mocks.sendEmail.mockReset().mockResolvedValue({ sent: true });
    mocks.sendNotice.mockReset().mockResolvedValue({ sent: true });
    // The Stripe sent-flag write fails on every call: the GP-672 trigger.
    mocks.sessionsUpdate.mockReset().mockRejectedValue(new Error('Stripe API unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

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

  it('sends each email once when the Stripe sent-flag write fails and a later delivery repeats', async () => {
    await processCarsiCoachingMonthlyCheckoutCompleted(paidSession(), OPTS);
    // Webhook retry or success-page reload: the session carries no sent flag.
    await processCarsiCoachingMonthlyCheckoutCompleted(paidSession(), OPTS);

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendNotice).toHaveBeenCalledTimes(1);
  });

  it('sends each email once when the webhook and the success page run at the same time', async () => {
    await Promise.all([
      processCarsiCoachingMonthlyCheckoutCompleted(paidSession(), OPTS),
      processCarsiCoachingMonthlyCheckoutCompleted(paidSession(), OPTS),
    ]);

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendNotice).toHaveBeenCalledTimes(1);
  });

  it('does not resend after an uncertain send (timeout or provider error)', async () => {
    mocks.sendEmail.mockResolvedValueOnce({ sent: false, reason: 'send_failed' });
    mocks.sendNotice.mockResolvedValueOnce({ sent: false, reason: 'provider_error' });
    await processCarsiCoachingMonthlyCheckoutCompleted(paidSession(), OPTS);
    await processCarsiCoachingMonthlyCheckoutCompleted(paidSession(), OPTS);

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendNotice).toHaveBeenCalledTimes(1);
  });

  it('does not resend the coach notice after it threw mid-send', async () => {
    mocks.sendNotice.mockRejectedValueOnce(new Error('socket hang up'));
    await processCarsiCoachingMonthlyCheckoutCompleted(paidSession(), OPTS);
    await processCarsiCoachingMonthlyCheckoutCompleted(paidSession(), OPTS);

    expect(mocks.sendNotice).toHaveBeenCalledTimes(1);
  });

  it('sends on a later delivery when mail was not configured the first time', async () => {
    mocks.sendEmail.mockResolvedValueOnce({ sent: false, reason: 'not_configured' });
    mocks.sendNotice.mockResolvedValueOnce({ sent: false, reason: 'not_configured' });
    await processCarsiCoachingMonthlyCheckoutCompleted(paidSession(), OPTS);
    await processCarsiCoachingMonthlyCheckoutCompleted(paidSession(), OPTS);

    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
    expect(mocks.sendNotice).toHaveBeenCalledTimes(2);
  });

  it('keys the record by checkout session, so a different checkout still gets its emails', async () => {
    await processCarsiCoachingMonthlyCheckoutCompleted(paidSession('cs_test_a'), OPTS);
    await processCarsiCoachingMonthlyCheckoutCompleted(paidSession('cs_test_b'), OPTS);

    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
    expect(mocks.sendNotice).toHaveBeenCalledTimes(2);
  });

  it('still honours the legacy Stripe sent flag on sessions fulfilled before this change', async () => {
    const session = paidSession();
    session.metadata = { ...session.metadata, coaching_monthly_emails_sent: 'true' };
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.stripeWebhookEvent.create).mockClear();
    const result = await processCarsiCoachingMonthlyCheckoutCompleted(session, OPTS);

    expect(result.skipped).toBe('already_emailed');
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.sendNotice).not.toHaveBeenCalled();
    expect(prisma.stripeWebhookEvent.create).not.toHaveBeenCalled();
  });

  it('reports each delivery and marks the records processed after a good send', async () => {
    const first = await processCarsiCoachingMonthlyCheckoutCompleted(paidSession(), OPTS);
    expect(first.customerEmailDelivery).toBe('sent');
    expect(first.founderEmailDelivery).toBe('sent');
    expect(first.customerEmailSent).toBe(true);

    const records = [...db.rows.values()];
    expect(records).toHaveLength(2);
    expect(records.every((r) => r.type === 'carsi_coaching_monthly_email')).toBe(true);
    expect(records.every((r) => r.processedAt instanceof Date)).toBe(true);

    const second = await processCarsiCoachingMonthlyCheckoutCompleted(paidSession(), OPTS);
    expect(second.customerEmailSent).toBe(false);
    expect(second.customerEmailDelivery).toBe('already_claimed');
    expect(second.founderEmailDelivery).toBe('already_claimed');
  });

  it('keeps the record and reports failed after an uncertain send', async () => {
    mocks.sendEmail.mockResolvedValueOnce({ sent: false, reason: 'send_failed' });
    mocks.sendNotice.mockRejectedValueOnce(new Error('timeout'));
    const first = await processCarsiCoachingMonthlyCheckoutCompleted(paidSession(), OPTS);

    expect(first.customerEmailDelivery).toBe('failed');
    expect(first.founderEmailDelivery).toBe('failed');
    expect([...db.rows.values()].every((r) => r.processedAt === null)).toBe(true);
  });

  it('does not set the Stripe sent flag while an email released as not_configured is still owed', async () => {
    mocks.sessionsUpdate.mockReset().mockResolvedValue({});
    mocks.sendNotice.mockResolvedValueOnce({ sent: false, reason: 'not_configured' });
    const first = await processCarsiCoachingMonthlyCheckoutCompleted(paidSession(), OPTS);

    expect(first.customerEmailDelivery).toBe('sent');
    expect(first.founderEmailDelivery).toBe('not_configured');
    expect(mocks.sessionsUpdate).not.toHaveBeenCalled();

    const second = await processCarsiCoachingMonthlyCheckoutCompleted(paidSession(), OPTS);
    expect(second.founderEmailDelivery).toBe('sent');
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendNotice).toHaveBeenCalledTimes(2);
    expect(mocks.sessionsUpdate).toHaveBeenCalledTimes(1);
  });

  it('sends nothing when the delivery record cannot be written', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.stripeWebhookEvent.create).mockRejectedValueOnce(
      Object.assign(new Error("Can't reach database server"), { code: 'P1001' })
    );

    await expect(
      processCarsiCoachingMonthlyCheckoutCompleted(paidSession(), OPTS)
    ).rejects.toThrow();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.sendNotice).not.toHaveBeenCalled();
  });

  // GP-761 review P1: the tax invoice names the buyer from real data only, never the
  // greeting fallback (the email local part).
  it('names the Checkout customer as the tax invoice buyer', async () => {
    vi.stubEnv('CARSI_ABN', '10000000000');
    await processCarsiCoachingMonthlyCheckoutCompleted(paidSession(), OPTS);
    const { text } = mocks.sendEmail.mock.calls[0]![0] as { text: string };
    expect(text).toContain('Tax invoice');
    expect(text).toContain('Buyer: Test Member');
    vi.unstubAllEnvs();
  });

  it('never uses the email local part as the tax invoice buyer', async () => {
    vi.stubEnv('CARSI_ABN', '10000000000');
    const session = paidSession();
    session.customer_details = { email: 'Member@Example.com', name: null } as never;
    await processCarsiCoachingMonthlyCheckoutCompleted(session, OPTS);
    const { text } = mocks.sendEmail.mock.calls[0]![0] as { text: string };
    expect(text).toContain('Hi member');
    expect(text).toContain('Tax invoice');
    expect(text).not.toContain('Buyer');
    vi.unstubAllEnvs();
  });
});
