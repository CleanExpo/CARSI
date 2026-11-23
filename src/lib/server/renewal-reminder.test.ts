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

type NotificationRow = {
  id: string;
  userId: string;
  dedupeKey: string;
  type: string;
  createdAt: Date;
};
type NotificationWhere = {
  dedupeKey: string;
  type?: string;
  createdAt?: Date | { lt: Date };
};

const h = vi.hoisted(() => {
  const notifications = new Map<string, NotificationRow>();
  /** True when a row satisfies a Prisma-style `where` (dedupeKey, type, createdAt equals / lt). */
  const matches = (row: NotificationRow, where: NotificationWhere): boolean => {
    if (row.dedupeKey !== where.dedupeKey) return false;
    if (where.type !== undefined && row.type !== where.type) return false;
    const at = where.createdAt;
    if (at instanceof Date) return row.createdAt.getTime() === at.getTime();
    if (at && 'lt' in at) return row.createdAt.getTime() < at.lt.getTime();
    return true;
  };
  const race = {
    /** When set, the NEXT dedupe lookup reads the store, then waits on this gate. */
    gate: null as Promise<void> | null,
    /** Resolves once the gated call has read the store and is parked. */
    parked: null as (() => void) | null,
    /** When set, the NEXT takeover (updateMany with a createdAt cutoff) parks BEFORE it
     *  evaluates its condition, so another delivery can run in between (GP-595). */
    takeoverGate: null as Promise<void> | null,
    takeoverParked: null as (() => void) | null,
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
          // A snapshot, as a database read returns: later writes do not change it.
          const stored = notifications.get(where.dedupeKey);
          const row = stored ? { ...stored } : null;
          if (race.gate) {
            const gate = race.gate;
            race.gate = null;
            race.parked?.();
            await gate;
          }
          return row;
        }),
        create: vi.fn(
          async ({
            data,
          }: {
            data: { userId: string; dedupeKey: string; type: string; createdAt?: Date };
          }) => {
            if (notifications.has(data.dedupeKey)) {
              throw Object.assign(new Error('unique'), { code: 'P2002' });
            }
            const row = {
              id: `n-${notifications.size + 1}`,
              ...data,
              createdAt: data.createdAt ?? new Date(),
            };
            notifications.set(data.dedupeKey, row);
            return { id: row.id };
          }
        ),
        updateMany: vi.fn(
          async ({
            where,
            data,
          }: {
            where: NotificationWhere;
            data: Partial<Omit<NotificationRow, 'id' | 'dedupeKey'>>;
          }) => {
            const cutoff = where.createdAt;
            if (race.takeoverGate && cutoff && !(cutoff instanceof Date) && 'lt' in cutoff) {
              const gate = race.takeoverGate;
              race.takeoverGate = null;
              race.takeoverParked?.();
              await gate;
            }
            const row = notifications.get(where.dedupeKey);
            if (!row || !matches(row, where)) return { count: 0 };
            Object.assign(row, data);
            return { count: 1 };
          }
        ),
        deleteMany: vi.fn(async ({ where }: { where: NotificationWhere }) => {
          const row = notifications.get(where.dedupeKey);
          if (!row || !matches(row, where)) return { count: 0 };
          notifications.delete(where.dedupeKey);
          return { count: 1 };
        }),
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
    expect(created.dedupeKey).toBe('renewal_reminder:sub_ind_1:2026-10-17');
    // Once the email is out, the stored record reads as a sent reminder.
    expect(h.notifications.get(created.dedupeKey)?.type).toBe('renewal_reminder');
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
    h.prisma.lmsNotification.deleteMany.mockRejectedValueOnce(new Error('db down'));
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

describe('GP-595: a claim left behind by a failed attempt never loses the reminder', () => {
  const KEY = 'renewal_reminder:sub_ind_1:2026-10-17';
  const MINUTE = 60_000;

  /** A claim row as a killed attempt leaves it: saved, email never confirmed. */
  function leftBehindClaim(ageMs: number) {
    h.notifications.set(KEY, {
      id: 'n-orphan',
      userId: 'user-ind-1',
      dedupeKey: KEY,
      type: 'renewal_reminder_pending',
      createdAt: new Date(Date.now() - ageMs),
    });
  }

  it('process killed after claiming: the redelivery after the stale window sends the email once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    leftBehindClaim(10 * MINUTE);

    await handleSubscriptionEvent(upcomingEvent('sub_ind_1', {}, 'evt_retry_after_kill'));

    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    expect(h.notifications.get(KEY)?.type).toBe('renewal_reminder');
    // A later delivery for the same renewal sends nothing more.
    await handleSubscriptionEvent(upcomingEvent('sub_ind_1', {}, 'evt_after_recovery'));
    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('send failed and the claim could not be released: a later redelivery still sends once', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    h.sendEmail.mockResolvedValueOnce({ sent: false, reason: 'provider_error' });
    h.prisma.lmsNotification.delete.mockRejectedValueOnce(new Error('db down'));
    h.prisma.lmsNotification.deleteMany.mockRejectedValueOnce(new Error('db down'));
    await expect(handleSubscriptionEvent(upcomingEvent('sub_ind_1'))).rejects.toThrow(
      /renewal reminder/i
    );
    expect(h.notifications.has(KEY)).toBe(true); // the claim is stuck

    // Stripe redelivers after the stale window.
    const row = h.notifications.get(KEY)!;
    row.createdAt = new Date(Date.now() - 10 * MINUTE);
    await handleSubscriptionEvent(upcomingEvent('sub_ind_1', {}, 'evt_retry_after_stuck'));

    expect(h.sendEmail).toHaveBeenCalledTimes(2); // the failed try, then the one real email
    expect(h.sendEmail.mock.results[1]?.type).toBe('return');
    expect(h.notifications.get(KEY)?.type).toBe('renewal_reminder');
    err.mockRestore();
    warn.mockRestore();
  });

  it('two redeliveries that both find the same stale claim send one email', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    leftBehindClaim(10 * MINUTE);
    let release!: () => void;
    h.race.takeoverGate = new Promise<void>((r) => (release = r));
    const parked = new Promise<void>((r) => (h.race.takeoverParked = r));

    // A reaches its takeover of the stale claim and is parked before the takeover's
    // condition is checked; B takes the claim over, sends and confirms meanwhile. When A
    // resumes, only the takeover condition (pending AND older than the window) stops it.
    const a = handleSubscriptionEvent(upcomingEvent('sub_ind_1', {}, 'evt_stale_a')).then(
      () => 'done',
      () => 'threw'
    );
    await parked;
    await handleSubscriptionEvent(upcomingEvent('sub_ind_1', {}, 'evt_stale_b'));
    release();
    await a;

    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    expect(h.notifications.get(KEY)?.type).toBe('renewal_reminder');
    warn.mockRestore();
    err.mockRestore();
  });

  it('a young claim (another delivery may still be sending) sends nothing and throws so Stripe retries', async () => {
    leftBehindClaim(30_000);
    await expect(
      handleSubscriptionEvent(upcomingEvent('sub_ind_1', {}, 'evt_while_in_flight'))
    ).rejects.toThrow(/renewal reminder/i);
    expect(h.sendEmail).not.toHaveBeenCalled();
    // The other delivery's claim is left alone.
    expect(h.notifications.get(KEY)?.id).toBe('n-orphan');
  });

  it('a claim whose write took past the send deadline is released and nothing is sent', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const realCreate = h.prisma.lmsNotification.create.getMockImplementation()!;
      // The database is slow: the claim lands six minutes after its claim time, already
      // stale, so another delivery could take it over while this one sends.
      h.prisma.lmsNotification.create.mockImplementationOnce(async (args) => {
        vi.setSystemTime(Date.now() + 6 * MINUTE);
        return realCreate(args);
      });
      await expect(
        handleSubscriptionEvent(upcomingEvent('sub_ind_1', {}, 'evt_slow_claim')),
      ).rejects.toThrow(/renewal reminder/i);
      expect(h.sendEmail).not.toHaveBeenCalled();
      expect(h.notifications.has(KEY)).toBe(false); // released, so the retry can send
    } finally {
      vi.useRealTimers();
      err.mockRestore();
    }
  });

  it('a sent reminder is never resent, however old its record is', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    leftBehindClaim(60 * MINUTE);
    h.notifications.get(KEY)!.type = 'renewal_reminder';
    await handleSubscriptionEvent(upcomingEvent('sub_ind_1', {}, 'evt_old_sent'));
    expect(h.sendEmail).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('a failed send removes only its own claim, never a sent reminder', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    // While this attempt's email fails, another delivery's sent record replaces the claim.
    h.sendEmail.mockImplementationOnce(async () => {
      const row = h.notifications.get(KEY)!;
      h.notifications.set(KEY, { ...row, id: 'n-other', type: 'renewal_reminder' });
      return { sent: false, reason: 'provider_error' };
    });
    await expect(handleSubscriptionEvent(upcomingEvent('sub_ind_1'))).rejects.toThrow(
      /renewal reminder/i
    );
    expect(h.notifications.get(KEY)?.id).toBe('n-other');
    err.mockRestore();
  });
});

describe('GP-595: renewal reminders state the GST in the price (fixed 10% line)', () => {
  it('Teams owner plan at A$1,295: amount incl. GST and a GST line of A$117.73 (total / 11)', async () => {
    await handleSubscriptionEvent(
      upcomingEvent('sub_team_1', { amount_due: 129_500, customer_email: null }, 'evt_team_gst')
    );
    const email = lastEmail();
    for (const body of [email.text, email.html]) {
      expect(body).toContain('A$1,295.00 incl. GST');
      expect(body).toContain('GST included');
      expect(body).toContain('A$117.73');
    }
  });

  it('individual membership at A$795: GST line of A$72.27', async () => {
    await handleSubscriptionEvent(upcomingEvent('sub_ind_1', {}, 'evt_ind_gst'));
    const email = lastEmail();
    for (const body of [email.text, email.html]) {
      expect(body).toContain('A$795.00 incl. GST');
      expect(body).toContain('GST included');
      expect(body).toContain('A$72.27');
    }
  });
});
