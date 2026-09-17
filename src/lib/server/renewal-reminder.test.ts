import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

/**
 * Australian Consumer Law practice: a subscriber must be reminded before an
 * automatic renewal charges them. Stripe emits `invoice.upcoming` ahead of each
 * renewal (lead time is a Stripe Billing dashboard setting). These tests drive
 * the SAME entry point the signed webhook route calls (`handleSubscriptionEvent`)
 * with fixture `invoice.upcoming` events and assert:
 *  - individual + team plans send one reminder with plan, date, amount, cancel path
 *  - a duplicate delivery (same or different event id, same renewal) sends once
 *  - a missing amount or renewal date sends nothing and records nothing
 *  - an email failure throws (route → 5xx → Stripe retries) and records nothing
 */

const h = vi.hoisted(() => {
  const notifications = new Map<string, { id: string; userId: string; dedupeKey: string }>();
  const race = {
    /** When set, the NEXT dedupe lookup reads the store, then waits on this gate. */
    gate: null as Promise<void> | null,
    /** Resolves once the gated call has read the store and is parked. */
    parked: null as (() => void) | null,
  };
  return {
    notifications,
    race,
    sendEmail: vi.fn(async (_p: unknown) => ({ sent: true, messageId: 'msg_1' }) as {
      sent: boolean;
      messageId?: string;
      reason?: string;
    }),
    subscriptionsRetrieve: vi.fn(),
    resolveUserId: vi.fn(async () => 'user-ind-1' as string | null),
    resolveTeamId: vi.fn(async () => 'team-1' as string | null),
    prisma: {
      lmsNotification: {
        findUnique: vi.fn(async ({ where }: { where: { dedupeKey: string } }) => {
          const row = notifications.get(where.dedupeKey) ?? null;
          if (race.gate) {
            const gate = race.gate;
            race.gate = null;
            race.parked?.();
            await gate;
          }
          return row;
        }),
        create: vi.fn(
          async ({ data }: { data: { userId: string; dedupeKey: string } }) => {
            if (notifications.has(data.dedupeKey)) {
              throw Object.assign(new Error('unique'), { code: 'P2002' });
            }
            const row = { id: `n-${notifications.size + 1}`, ...data };
            notifications.set(data.dedupeKey, row);
            return { id: row.id };
          },
        ),
        delete: vi.fn(async ({ where }: { where: { dedupeKey: string } }) => {
          const row = notifications.get(where.dedupeKey);
          if (!row) throw Object.assign(new Error('not found'), { code: 'P2025' });
          notifications.delete(where.dedupeKey);
          return row;
        }),
      },
      lmsUser: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
          if (where.id === 'user-ind-1') {
            return { email: 'member@example.com', fullName: 'Casey Member' };
          }
          if (where.id === 'owner-1') {
            return { email: 'owner@example.com', fullName: 'Olive Owner' };
          }
          return null;
        }),
      },
      lmsTeam: {
        findUnique: vi.fn(async () => ({ ownerId: 'owner-1', name: 'Dry Crew Pty Ltd' })),
      },
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: h.prisma }));
vi.mock('@/lib/server/email', () => ({
  sendEmail: (p: unknown) => h.sendEmail(p),
  isEmailConfigured: () => true,
}));
vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({
    customers: { retrieve: vi.fn(async () => ({ email: 'member@example.com' })) },
    subscriptions: { retrieve: (...a: unknown[]) => h.subscriptionsRetrieve(...a) },
  }),
}));
vi.mock('./subscription-store', () => ({
  upsertSubscription: vi.fn(async () => {}),
  markSubscriptionStatusBySubscriptionId: vi.fn(async () => {}),
  upsertTerminalSubscriptionStatus: vi.fn(async () => {}),
  resolveUserIdForStripeSubscription: () => h.resolveUserId(),
}));
vi.mock('./team-subscription-store', () => ({
  readSubscriptionSeatQuantity: vi.fn(() => 5),
  upsertTeamSubscription: vi.fn(async () => {}),
  markTeamSubscriptionStatusBySubscriptionId: vi.fn(async () => {}),
  upsertTerminalTeamSubscriptionStatus: vi.fn(async () => {}),
  resolveTeamIdForStripeSubscription: () => h.resolveTeamId(),
}));
vi.mock('./org-subscription-store', () => ({
  updateOrgSubscriptionFromStripe: vi.fn(async () => true),
  markOrgSubscriptionStatusBySubscriptionId: vi.fn(async () => {}),
  resolveTeamIdForOrgSubscription: vi.fn(async () => 'team-org-1'),
}));
vi.mock('./event-attribution', () => ({
  recordAttributedStage: vi.fn(async () => {}),
  tryRecordAttributedStage: vi.fn(async () => {}),
}));
vi.mock('./subscription-analytics', () => ({
  trackSubscriptionLifecycleEvent: vi.fn(async () => {}),
}));

import { handleSubscriptionEvent, isSubscriptionEvent } from './subscription-webhook';

// 2026-10-17T00:00:00Z — 17 October 2026 in Australia/Sydney (AEDT, +11).
const RENEWAL_AT = 1_792_195_200;

function subscription(plan: string, overrides: Record<string, unknown> = {}) {
  return {
    id: plan === 'pro_annual' ? 'sub_ind_1' : 'sub_team_1',
    status: 'active',
    customer: 'cus_1',
    cancel_at_period_end: false,
    items: { data: [{ id: 'si_1', quantity: 5, current_period_end: RENEWAL_AT }] },
    metadata: { plan },
    ...overrides,
  };
}

function upcomingEvent(
  subscriptionId: string,
  invoice: Record<string, unknown> = {},
  eventId = 'evt_upcoming_1',
): Stripe.Event {
  return {
    id: eventId,
    type: 'invoice.upcoming',
    created: RENEWAL_AT - 30 * 86_400,
    data: {
      object: {
        object: 'invoice',
        customer: 'cus_1',
        customer_email: 'billing@example.com',
        currency: 'aud',
        amount_due: 79_500,
        next_payment_attempt: RENEWAL_AT,
        billing_reason: 'upcoming',
        parent: { subscription_details: { subscription: subscriptionId } },
        ...invoice,
      },
    },
  } as unknown as Stripe.Event;
}

type SentEmail = { to: string; subject: string; html: string; text: string };
const lastEmail = () => h.sendEmail.mock.calls.at(-1)?.[0] as SentEmail;

beforeEach(() => {
  vi.clearAllMocks();
  h.notifications.clear();
  h.race.gate = null;
  h.race.parked = null;
  h.subscriptionsRetrieve.mockImplementation(async (id: string) =>
    id === 'sub_ind_1' ? subscription('pro_annual') : subscription('starter'),
  );
});

describe('invoice.upcoming renewal reminder', () => {
  it('is routed by the webhook as a subscription event', () => {
    expect(isSubscriptionEvent('invoice.upcoming')).toBe(true);
  });

  it('individual membership: emails plan, renewal date, AUD amount incl. GST and how to cancel', async () => {
    await handleSubscriptionEvent(upcomingEvent('sub_ind_1'));

    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    const email = lastEmail();
    expect(email.to).toBe('billing@example.com');
    expect(email.subject).toContain('CARSI Yearly Membership');
    expect(email.subject).toContain('17 October 2026');
    for (const body of [email.text, email.html]) {
      expect(body).toContain('CARSI Yearly Membership');
      expect(body).toContain('17 October 2026');
      expect(body).toContain('A$795.00');
      expect(body).toContain('incl. GST');
      expect(body).toMatch(/do not need to do anything/i);
      expect(body).toMatch(/cancel/i);
      expect(body).toContain('/subscribe');
    }
    // Recorded once, against the member, keyed by subscription + renewal date.
    expect(h.prisma.lmsNotification.create).toHaveBeenCalledTimes(1);
    const created = h.prisma.lmsNotification.create.mock.calls[0][0].data as {
      userId: string;
      dedupeKey: string;
      type: string;
    };
    expect(created.userId).toBe('user-ind-1');
    expect(created.type).toBe('renewal_reminder');
    expect(created.dedupeKey).toBe('renewal_reminder:sub_ind_1:2026-10-17');
  });

  it('team plan: emails the billing contact about the team plan and records it for the owner', async () => {
    await handleSubscriptionEvent(
      upcomingEvent('sub_team_1', { amount_due: 29_900, customer_email: null }),
    );

    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    const email = lastEmail();
    // No billing email on the invoice → falls back to the team owner.
    expect(email.to).toBe('owner@example.com');
    expect(email.subject).toContain('CARSI Teams Starter');
    expect(email.text).toContain('A$299.00');
    expect(email.text).toContain('17 October 2026');
    expect(email.text).toContain('Dry Crew Pty Ltd');
    expect(email.text).toMatch(/cancel/i);
    expect(email.text).toMatch(/do not need to do anything/i);
    const created = h.prisma.lmsNotification.create.mock.calls[0][0].data as { userId: string };
    expect(created.userId).toBe('owner-1');
  });

  it('duplicate delivery (same event, and a second event for the same renewal) sends once', async () => {
    await handleSubscriptionEvent(upcomingEvent('sub_ind_1'));
    await handleSubscriptionEvent(upcomingEvent('sub_ind_1'));
    await handleSubscriptionEvent(upcomingEvent('sub_ind_1', {}, 'evt_upcoming_2'));

    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    expect(h.prisma.lmsNotification.create).toHaveBeenCalledTimes(1);
  });

  it('CONCURRENT deliveries with different event ids for the same renewal send exactly once', async () => {
    let release!: () => void;
    h.race.gate = new Promise<void>((r) => (release = r));
    const parked = new Promise<void>((r) => (h.race.parked = r));

    // Delivery A reads the dedupe store (empty) and is parked there.
    const a = handleSubscriptionEvent(upcomingEvent('sub_ind_1', {}, 'evt_race_a'));
    await parked;
    // Delivery B runs to completion while A is parked.
    await handleSubscriptionEvent(upcomingEvent('sub_ind_1', {}, 'evt_race_b'));
    // A resumes with its stale "nothing sent yet" view.
    release();
    await a;

    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    expect(h.notifications.size).toBe(1);
  });

  it('when the claim cannot be removed after a failed send, it still throws (never reports success)', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.sendEmail.mockResolvedValueOnce({ sent: false, reason: 'send_failed' });
    h.prisma.lmsNotification.delete.mockRejectedValueOnce(new Error('db down'));
    await expect(handleSubscriptionEvent(upcomingEvent('sub_ind_1'))).rejects.toThrow(
      /renewal reminder/i,
    );
    err.mockRestore();
  });

  it('missing amount sends nothing and records nothing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await handleSubscriptionEvent(upcomingEvent('sub_ind_1', { amount_due: undefined }));
    expect(h.sendEmail).not.toHaveBeenCalled();
    expect(h.prisma.lmsNotification.create).not.toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).toContain('missing_amount');
    warn.mockRestore();
  });

  it('missing renewal date sends nothing and records nothing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await handleSubscriptionEvent(upcomingEvent('sub_ind_1', { next_payment_attempt: null }));
    expect(h.sendEmail).not.toHaveBeenCalled();
    expect(h.prisma.lmsNotification.create).not.toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).toContain('missing_renewal_date');
    warn.mockRestore();
  });

  it('non-AUD invoice sends nothing (never mislabels a foreign amount as AUD)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await handleSubscriptionEvent(upcomingEvent('sub_ind_1', { currency: 'usd' }));
    expect(h.sendEmail).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('a subscription already set to cancel at period end gets no renewal reminder', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    h.subscriptionsRetrieve.mockResolvedValueOnce(
      subscription('pro_annual', { cancel_at_period_end: true }),
    );
    await handleSubscriptionEvent(upcomingEvent('sub_ind_1'));
    expect(h.sendEmail).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('email failure is surfaced: throws so the route 5xxs and Stripe retries; nothing recorded', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.sendEmail.mockResolvedValueOnce({ sent: false, reason: 'provider_error' });

    await expect(handleSubscriptionEvent(upcomingEvent('sub_ind_1'))).rejects.toThrow(
      /renewal reminder/i,
    );
    // No claim/record survives the failed send.
    expect(h.notifications.size).toBe(0);

    // Stripe's retry then succeeds and sends exactly once more.
    await handleSubscriptionEvent(upcomingEvent('sub_ind_1'));
    expect(h.sendEmail).toHaveBeenCalledTimes(2);
    expect(h.notifications.size).toBe(1);
    err.mockRestore();
  });

  it('email not configured is a failure, not a silent success', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.sendEmail.mockResolvedValueOnce({ sent: false, reason: 'not_configured' });
    await expect(handleSubscriptionEvent(upcomingEvent('sub_ind_1'))).rejects.toThrow();
    expect(h.notifications.size).toBe(0);
    err.mockRestore();
  });

  it('a non-subscription upcoming invoice is ignored', async () => {
    await handleSubscriptionEvent(upcomingEvent('sub_ind_1', { parent: null }));
    expect(h.subscriptionsRetrieve).not.toHaveBeenCalled();
    expect(h.sendEmail).not.toHaveBeenCalled();
  });
});
