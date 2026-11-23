import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-759 (b): no paid CARSI Stripe event is acknowledged and dropped silently.
 *
 * Before this fix the webhook answered 200 and kept nothing when it could not match the
 * learner, when a roadshow or coaching fulfilment failed, when a team purchase hit
 * ALREADY_ON_TEAM, and when a live team or org subscription had no owner row yet. Each case
 * must now leave an unfulfilled payment record (in the real ledger module, over a fake
 * `stripe_webhook_events` table), and the cases a retry can fix must return 5xx with the
 * event claim released so Stripe redelivers.
 *
 * Controls: a successful later delivery marks the record resolved; foreign or unpaid events
 * (no CARSI course or source, a canceled subscription) are not put on the list.
 */

type LedgerRow = { id: string; type: string; processedAt: Date | null; createdAt: Date };

const h = vi.hoisted(() => ({
  ledger: new Map<string, LedgerRow>(),
  event: null as Record<string, unknown> | null,
  claim: vi.fn(),
  markProcessed: vi.fn(),
  release: vi.fn(),
  fulfill: vi.fn(),
  claimsForUser: vi.fn(),
  roadshow: vi.fn(),
  businessCoaching: vi.fn(),
  coachingMonthly: vi.fn(),
  resolveTeam: vi.fn(),
  updateOrg: vi.fn(),
  resolveOrgTeam: vi.fn(),
  upsertTeam: vi.fn(),
}));

vi.mock('@/lib/api/stripe', () => ({
  constructWebhookEvent: () => h.event,
  resolveStripeWebhookSecret: () => 'whsec_test_placeholder',
  isVerifiedStripeEventShape: () => true,
  webhookLivemodeMatchesApiKey: () => true,
  getStripeClient: () => ({
    customers: { retrieve: vi.fn(async () => ({ email: 'owner@unfulfilled-test.invalid' })) },
    paymentIntents: { retrieve: vi.fn(async () => ({ invoice: null })) },
    checkout: { sessions: { list: vi.fn(async () => ({ data: [{ id: 'cs_test_reversed' }] })) } },
  }),
}));
vi.mock('@/lib/server/stripe-revocation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/stripe-revocation')>()),
  revokeEnrollmentsByPaymentReference: vi.fn(async () => ({ revoked: 1 })),
  reactivateDisputeWonEnrollmentsByPaymentReference: vi.fn(async () => ({ reactivated: 1 })),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: { findUnique: vi.fn(async () => null) },
    stripeWebhookEvent: {
      upsert: vi.fn(
        async (args: {
          where: { id: string };
          create: { id: string; type: string };
          update: { type?: string; processedAt?: Date | null };
        }) => {
          const existing = h.ledger.get(args.where.id);
          const row = existing
            ? { ...existing, ...args.update }
            : { processedAt: null, createdAt: new Date(), ...args.create };
          h.ledger.set(args.where.id, row as LedgerRow);
          return row;
        },
      ),
      updateMany: vi.fn(
        async (args: {
          where: { id: string; processedAt?: null; type?: string };
          data: { processedAt?: Date | null; type?: string };
        }) => {
          const row = h.ledger.get(args.where.id);
          if (!row) return { count: 0 };
          if ('processedAt' in args.where && row.processedAt !== null) return { count: 0 };
          if (args.where.type !== undefined && row.type !== args.where.type) return { count: 0 };
          Object.assign(row, args.data);
          return { count: 1 };
        },
      ),
      create: vi.fn(async (args: { data: { id: string; type: string; processedAt?: Date } }) => {
        if (h.ledger.has(args.data.id)) throw new Error('P2002 unique constraint');
        const row = { processedAt: null, createdAt: new Date(), ...args.data } as LedgerRow;
        h.ledger.set(args.data.id, row);
        return row;
      }),
      findUnique: vi.fn(async (args: { where: { id: string } }) => h.ledger.get(args.where.id) ?? null),
      deleteMany: vi.fn(async (args: { where: { id: string; type: string } }) => {
        const row = h.ledger.get(args.where.id);
        if (!row || row.type !== args.where.type) return { count: 0 };
        h.ledger.delete(args.where.id);
        return { count: 1 };
      }),
    },
  },
}));

// Serialisable transactions run against the same fake table (one in-memory client).
vi.mock('@/lib/server/db-tx', async () => {
  const { prisma } = await import('@/lib/prisma');
  return { runSerializable: (fn: (tx: unknown) => Promise<unknown>) => fn(prisma) };
});
vi.mock('@/lib/server/stripe-webhook-idempotency', () => ({
  claimStripeWebhookEvent: h.claim,
  markStripeWebhookEventProcessed: h.markProcessed,
  releaseStripeWebhookEventClaim: h.release,
}));
vi.mock('@/lib/server/team-course-purchase', () => ({ fulfillCourseCheckoutForUser: h.fulfill }));
vi.mock('@/lib/server/lms-auth', () => ({ sessionClaimsForUserId: h.claimsForUser }));
vi.mock('@/lib/server/guest-checkout', () => ({
  ensureGuestUserFromStripeEmail: vi.fn(async () => null),
}));
vi.mock('@/lib/server/ccw-roadshow-booking-email', () => ({
  processCcwRoadshowBookingConfirmation: h.roadshow,
}));
vi.mock('@/lib/server/business-coaching-fulfillment', () => ({
  processBusinessCoachingCheckoutCompleted: h.businessCoaching,
}));
vi.mock('@/lib/server/carsi-coaching-monthly-fulfillment', () => ({
  processCarsiCoachingMonthlyCheckoutCompleted: h.coachingMonthly,
}));
vi.mock('@/lib/server/team-subscription-store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/team-subscription-store')>()),
  resolveTeamIdForStripeSubscription: h.resolveTeam,
  upsertTeamSubscription: h.upsertTeam,
}));
vi.mock('@/lib/server/org-subscription-store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/org-subscription-store')>()),
  resolveTeamIdForOrgSubscription: h.resolveOrgTeam,
  updateOrgSubscriptionFromStripe: h.updateOrg,
}));
vi.mock('@/lib/server/event-attribution', () => ({
  persistAttributedRevenueReversal: vi.fn(async () => {}),
  recordAttributedStage: vi.fn(async () => {}),
  tryRecordAttributedStage: vi.fn(async () => {}),
}));
vi.mock('@/lib/server/subscription-analytics', () => ({
  trackSubscriptionLifecycleEvent: vi.fn(async () => {}),
}));
vi.mock('@/lib/server/enrollment-email', () => ({
  sendEnrollmentWelcomeEmail: vi.fn(async () => {}),
}));
vi.mock('@/lib/server/crm-enrollment-notify', () => ({ notifyCrmEnrollmentCreated: vi.fn() }));
vi.mock('@/lib/server/ga4-measurement-protocol', () => ({
  sendGa4PurchaseEvent: vi.fn(async () => {}),
}));
vi.mock('@/lib/server/sentry', () => ({ captureServerError: vi.fn(async () => {}) }));
// GP-759 (c) team seat revocation on refund: team tables, covered by team-seat-refund.test.ts.
vi.mock('@/lib/server/team-seat-refund', () => ({
  revokeTeamSeatBlocksForRefund: vi.fn(async () => {}),
  teamCourseSeatIsFree: vi.fn(async () => true),
}));

const { POST } = await import('../../../app/api/lms/webhooks/stripe/route');
const { isCheckoutPaymentReversed } = await import('./payment-integrity-ledger');

let eventSeq = 0;

function checkoutCompleted(session: Record<string, unknown>) {
  eventSeq += 1;
  h.event = {
    id: `evt_gp759_${eventSeq}`,
    object: 'event',
    livemode: false,
    type: 'checkout.session.completed',
    created: 1_790_000_000,
    data: {
      object: {
        object: 'checkout.session',
        payment_status: 'paid',
        amount_total: 14_900,
        currency: 'aud',
        ...session,
      },
    },
  };
}

function subscriptionUpdated(subscription: Record<string, unknown>) {
  eventSeq += 1;
  h.event = {
    id: `evt_gp759_${eventSeq}`,
    object: 'event',
    livemode: false,
    type: 'customer.subscription.updated',
    created: 1_790_000_000,
    data: { object: { object: 'subscription', customer: 'cus_test', items: { data: [] }, ...subscription } },
  };
}

async function deliver() {
  return POST(
    new Request('https://carsi.com.au/api/lms/webhooks/stripe', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': `t=1790000000,v1=${'ab'.repeat(32)}`,
      },
      body: '{}',
    }) as never,
  );
}

const record = (objectId: string) => h.ledger.get(`unfulfilled-payment:${objectId}`);

beforeEach(() => {
  vi.clearAllMocks();
  h.ledger.clear();
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_placeholder';
  process.env.DATABASE_URL = 'postgresql://offline.invalid/test';
  h.claim.mockResolvedValue({ claimed: true });
  h.markProcessed.mockResolvedValue(undefined);
  h.release.mockResolvedValue(undefined);
  h.claimsForUser.mockResolvedValue(null);
  h.fulfill.mockResolvedValue({ kind: 'self', alreadyEnrolled: true, redirectPath: '/x' });
  h.resolveTeam.mockResolvedValue(null);
  h.resolveOrgTeam.mockResolvedValue(null);
  h.updateOrg.mockResolvedValue(false);
  h.upsertTeam.mockResolvedValue(undefined);
});

describe('GP-759 (b): paid checkout sessions that cannot be fulfilled are recorded', () => {
  it('learner cannot be matched: recorded and acknowledged (a retry cannot create the account)', async () => {
    checkoutCompleted({
      id: 'cs_test_nolearner',
      customer_email: 'nobody@unfulfilled-test.invalid',
      metadata: { course_slug: 'paid-course' },
    });

    const res = await deliver();

    expect(res.status).toBe(200);
    expect(record('cs_test_nolearner')).toMatchObject({
      type: 'unfulfilled:learner_unmatched',
      processedAt: null,
    });
  });

  it('a later successful fulfilment of the same session marks the record resolved', async () => {
    checkoutCompleted({
      id: 'cs_test_later',
      customer_email: 'later@unfulfilled-test.invalid',
      metadata: { course_slug: 'paid-course' },
    });
    await deliver();
    expect(record('cs_test_later')?.processedAt).toBeNull();

    h.claimsForUser.mockResolvedValue({ sub: 'user-later', email: 'later@unfulfilled-test.invalid' });
    checkoutCompleted({
      id: 'cs_test_later',
      customer_email: 'later@unfulfilled-test.invalid',
      metadata: { course_slug: 'paid-course', student_id: 'user-later' },
    });
    const res = await deliver();

    expect(res.status).toBe(200);
    expect(record('cs_test_later')?.processedAt).toBeInstanceOf(Date);
  });

  it('team purchase by a buyer already on another team: recorded and acknowledged', async () => {
    h.claimsForUser.mockResolvedValue({ sub: 'user-team', email: 'team@unfulfilled-test.invalid' });
    h.fulfill.mockRejectedValue(new Error('ALREADY_ON_TEAM'));
    checkoutCompleted({
      id: 'cs_test_onteam',
      customer_email: 'team@unfulfilled-test.invalid',
      metadata: { course_slug: 'paid-course', student_id: 'user-team', purchase_mode: 'team' },
    });

    const res = await deliver();

    expect(res.status).toBe(200);
    expect(record('cs_test_onteam')?.type).toBe('unfulfilled:already_on_team');
  });

  it('coaching monthly fulfilment throws: recorded, 500, claim released so Stripe retries', async () => {
    h.coachingMonthly.mockRejectedValue(new Error('database unavailable'));
    checkoutCompleted({ id: 'cs_test_coaching', metadata: { source: 'carsi-coaching-monthly' } });

    const res = await deliver();

    expect(res.status).toBe(500);
    expect(h.release).toHaveBeenCalled();
    expect(h.markProcessed).not.toHaveBeenCalled();
    expect(record('cs_test_coaching')?.type).toBe('unfulfilled:fulfilment_failed');
  });

  it('coaching monthly paid but no email to fulfil to: recorded and acknowledged', async () => {
    h.coachingMonthly.mockResolvedValue({ fulfilled: false, skipped: 'no_email' });
    checkoutCompleted({ id: 'cs_test_coaching_noemail', metadata: { source: 'carsi-coaching-monthly' } });

    const res = await deliver();

    expect(res.status).toBe(200);
    expect(record('cs_test_coaching_noemail')?.type).toBe('unfulfilled:fulfilment_failed');
    expect(record('cs_test_coaching_noemail')?.processedAt).toBeNull();
  });

  it('business coaching fulfilment throws: recorded and retried', async () => {
    h.businessCoaching.mockRejectedValue(new Error('database unavailable'));
    checkoutCompleted({ id: 'cs_test_business', metadata: { source: 'carsi-business-coaching' } });

    const res = await deliver();

    expect(res.status).toBe(500);
    expect(record('cs_test_business')?.type).toBe('unfulfilled:fulfilment_failed');
  });

  it('roadshow confirmation not sent: recorded and retried', async () => {
    h.roadshow.mockResolvedValue({ sent: false, reason: 'provider_error' });
    checkoutCompleted({ id: 'cs_test_roadshow', metadata: { source: 'carsi-ccw-roadshow' } });

    const res = await deliver();

    expect(res.status).toBe(500);
    expect(record('cs_test_roadshow')?.type).toBe('unfulfilled:fulfilment_failed');
  });

  it('roadshow booking with unusable metadata: recorded and acknowledged (a retry cannot fix it)', async () => {
    h.roadshow.mockResolvedValue({ sent: false, skipped: 'invalid_metadata' });
    checkoutCompleted({ id: 'cs_test_roadshow_bad', metadata: { source: 'carsi-ccw-roadshow' } });

    const res = await deliver();

    expect(res.status).toBe(200);
    expect(record('cs_test_roadshow_bad')?.type).toBe('unfulfilled:fulfilment_failed');
  });

  it('control: a paid session with no CARSI course or source is not put on the list', async () => {
    checkoutCompleted({ id: 'cs_test_foreign', metadata: {} });

    const res = await deliver();

    expect(res.status).toBe(200);
    expect(h.ledger.size).toBe(0);
  });
});

describe('GP-759 (a): the refund handler records the reversal before any success-page replay', () => {
  function reversalEvent(type: string, object: Record<string, unknown>) {
    eventSeq += 1;
    h.event = {
      id: `evt_gp759_${eventSeq}`,
      object: 'event',
      livemode: false,
      type,
      created: 1_790_000_000 + eventSeq,
      data: { object: { payment_intent: 'pi_test_reversed', currency: 'aud', ...object } },
    };
  }
  const marker = () => h.ledger.get('payment-reversed:cs_test_reversed');

  it('a full refund writes a refund marker for the checkout session', async () => {
    reversalEvent('charge.refunded', { amount: 14_900, amount_refunded: 14_900 });

    expect((await deliver()).status).toBe(200);
    expect(marker()?.type).toBe('payment_reversed:refunded');
  });

  it('control: a partial refund keeps access and writes no marker', async () => {
    reversalEvent('charge.refunded', { amount: 14_900, amount_refunded: 2_000 });

    expect((await deliver()).status).toBe(200);
    expect(marker()).toBeUndefined();
  });

  it('a full refund takes an unfulfilled session off the admin list (nothing is owed, so no one grants it by hand)', async () => {
    checkoutCompleted({
      id: 'cs_test_reversed',
      customer_email: 'nobody@unfulfilled-test.invalid',
      metadata: { course_slug: 'paid-course' },
    });
    await deliver();
    expect(record('cs_test_reversed')?.processedAt).toBeNull();

    reversalEvent('charge.refunded', { amount: 14_900, amount_refunded: 14_900 });
    expect((await deliver()).status).toBe(200);

    expect(record('cs_test_reversed')?.processedAt).toBeInstanceOf(Date);
  });

  it('a full refund delivered BEFORE the checkout event still keeps the session off the admin list', async () => {
    reversalEvent('charge.refunded', { amount: 14_900, amount_refunded: 14_900 });
    expect((await deliver()).status).toBe(200);

    checkoutCompleted({
      id: 'cs_test_reversed',
      customer_email: 'nobody@unfulfilled-test.invalid',
      metadata: { course_slug: 'paid-course' },
    });
    expect((await deliver()).status).toBe(200);

    expect(record('cs_test_reversed')?.processedAt).toBeInstanceOf(Date);
  });

  it('control: a dispute delivered before the checkout event leaves the session listed (it may be won)', async () => {
    reversalEvent('charge.dispute.created', { id: 'dp_order', amount: 14_900 });
    await deliver();

    checkoutCompleted({
      id: 'cs_test_reversed',
      customer_email: 'nobody@unfulfilled-test.invalid',
      metadata: { course_slug: 'paid-course' },
    });
    await deliver();

    expect(record('cs_test_reversed')?.processedAt).toBeNull();
  });

  it('control: a partial refund leaves an unfulfilled session on the admin list', async () => {
    checkoutCompleted({
      id: 'cs_test_reversed',
      customer_email: 'nobody@unfulfilled-test.invalid',
      metadata: { course_slug: 'paid-course' },
    });
    await deliver();

    reversalEvent('charge.refunded', { amount: 14_900, amount_refunded: 2_000 });
    expect((await deliver()).status).toBe(200);

    expect(record('cs_test_reversed')?.processedAt).toBeNull();
  });

  it('a won dispute lifts a dispute marker but never a refund marker', async () => {
    reversalEvent('charge.dispute.created', { id: 'dp_test', amount: 14_900 });
    await deliver();
    expect(marker()?.type).toBe('payment_reversed:disputed');

    reversalEvent('charge.dispute.closed', { id: 'dp_test', amount: 14_900, status: 'won' });
    await deliver();
    expect(marker()?.type.startsWith('payment_reversed:')).not.toBe(true);

    reversalEvent('charge.refunded', { amount: 14_900, amount_refunded: 14_900 });
    await deliver();
    reversalEvent('charge.dispute.closed', { id: 'dp_test2', amount: 14_900, status: 'won' });
    await deliver();
    expect(marker()?.type).toBe('payment_reversed:refunded');
  });

  it('a dispute-created event delivered after the won close (Stripe order is not guaranteed) does not relock', async () => {
    // Won close at T2 arrives first, then the delayed created event from T1.
    h.event = {
      id: 'evt_gp759_won_first',
      object: 'event',
      livemode: false,
      type: 'charge.dispute.closed',
      created: 1_790_100_200,
      data: { object: { id: 'dp_late', payment_intent: 'pi_test_reversed', currency: 'aud', amount: 14_900, status: 'won' } },
    };
    expect((await deliver()).status).toBe(200);
    h.event = {
      id: 'evt_gp759_created_late',
      object: 'event',
      livemode: false,
      type: 'charge.dispute.created',
      created: 1_790_100_100,
      data: { object: { id: 'dp_late', payment_intent: 'pi_test_reversed', currency: 'aud', amount: 14_900 } },
    };
    expect((await deliver()).status).toBe(200);

    expect(await isCheckoutPaymentReversed('cs_test_reversed')).toBe(false);
  });

  it('control: a NEW dispute after an earlier won one still locks', async () => {
    h.event = {
      id: 'evt_gp759_won_old',
      object: 'event',
      livemode: false,
      type: 'charge.dispute.closed',
      created: 1_790_200_100,
      data: { object: { id: 'dp_one', payment_intent: 'pi_test_reversed', currency: 'aud', amount: 14_900, status: 'won' } },
    };
    await deliver();
    h.event = {
      id: 'evt_gp759_created_new',
      object: 'event',
      livemode: false,
      type: 'charge.dispute.created',
      created: 1_790_200_200,
      data: { object: { id: 'dp_two', payment_intent: 'pi_test_reversed', currency: 'aud', amount: 14_900 } },
    };
    await deliver();

    expect(await isCheckoutPaymentReversed('cs_test_reversed')).toBe(true);
  });
});

describe('GP-759 (b): live team and org subscriptions with no owner row are recorded and retried', () => {
  it('active team subscription whose team cannot be resolved: recorded, 500', async () => {
    subscriptionUpdated({ id: 'sub_test_team', status: 'active', metadata: { plan: 'teams_starter' } });

    const res = await deliver();

    expect(res.status).toBe(500);
    expect(h.release).toHaveBeenCalled();
    expect(record('sub_test_team')?.type).toBe('unfulfilled:team_unresolved');
  });

  it('active org subscription whose row is not provisioned yet: recorded, 500', async () => {
    h.resolveOrgTeam.mockResolvedValue('team-org-1');
    subscriptionUpdated({ id: 'sub_test_org', status: 'active', metadata: { plan: 'org_monthly' } });

    const res = await deliver();

    expect(res.status).toBe(500);
    expect(record('sub_test_org')?.type).toBe('unfulfilled:org_not_provisioned');
  });

  it('the retry that finds the team resolves the record', async () => {
    subscriptionUpdated({ id: 'sub_test_race', status: 'active', metadata: { plan: 'teams_starter' } });
    await deliver();
    expect(record('sub_test_race')?.processedAt).toBeNull();

    h.resolveTeam.mockResolvedValue('team-race-1');
    const res = await deliver();

    expect(res.status).toBe(200);
    expect(h.upsertTeam).toHaveBeenCalled();
    expect(record('sub_test_race')?.processedAt).toBeInstanceOf(Date);
  });

  it('control: a canceled team subscription with no team grants nothing and is not listed', async () => {
    subscriptionUpdated({ id: 'sub_test_dead', status: 'canceled', metadata: { plan: 'teams_starter' } });

    const res = await deliver();

    expect(res.status).toBe(200);
    expect(h.ledger.size).toBe(0);
  });
});
