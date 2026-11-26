import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

/**
 * FINDING 1 (GP-441): a subscription refund/dispute must revoke membership
 * access. FINDING 2 parity: the `customer.subscription.deleted` handler must
 * write a sticky terminal state.
 *
 * These tests cover the revocation reader (which resolves a subscription id
 * from a refunded payment intent) and the deletion handler. The reversal
 * itself, and the entitlement it leaves, are tested end to end in
 * subscription-reversal-before-row.test.ts.
 */

import {
  readInvoiceIdFromPaymentIntent,
  readSubscriptionIdFromPaymentIntent,
  readInvoiceSubscriptionId,
} from './stripe-subscription-map';

function pi(overrides: Record<string, unknown>): Stripe.PaymentIntent {
  return overrides as unknown as Stripe.PaymentIntent;
}

describe('readSubscriptionIdFromPaymentIntent (Finding 1 — detect a subscription charge)', () => {
  it('reads the invoice transaction id used by attributed subscription revenue', () => {
    expect(readInvoiceIdFromPaymentIntent(pi({ invoice: 'in_string' }))).toBe('in_string');
    expect(readInvoiceIdFromPaymentIntent(pi({ invoice: { id: 'in_expanded' } }))).toBe(
      'in_expanded',
    );
    expect(readInvoiceIdFromPaymentIntent(pi({ invoice: null }))).toBeNull();
  });

  it('reads the subscription id from an expanded invoice (current clover shape)', () => {
    // charge.refunded → payment_intent retrieved with expand:['invoice'];
    // the invoice carries the subscription under parent.subscription_details.
    const paymentIntent = pi({
      invoice: { parent: { subscription_details: { subscription: 'sub_795' } } },
    });
    expect(readSubscriptionIdFromPaymentIntent(paymentIntent)).toBe('sub_795');
  });

  it('reads the subscription id from a legacy top-level invoice.subscription', () => {
    const paymentIntent = pi({ invoice: { subscription: 'sub_legacy' } });
    expect(readSubscriptionIdFromPaymentIntent(paymentIntent)).toBe('sub_legacy');
  });

  it('returns null for a ONE-OFF charge (no invoice) — membership left untouched', () => {
    expect(readSubscriptionIdFromPaymentIntent(pi({}))).toBeNull();
    expect(readSubscriptionIdFromPaymentIntent(pi({ invoice: null }))).toBeNull();
  });

  it('returns null for a subscription-less invoice (e.g. one-off invoice item)', () => {
    // Sanity check the delegated reader agrees for a parentless invoice.
    expect(readInvoiceSubscriptionId({ parent: null } as unknown as Stripe.Invoice)).toBeNull();
    expect(readSubscriptionIdFromPaymentIntent(pi({ invoice: { parent: null } }))).toBeNull();
  });
});

// Finding 1 end-to-end (refund or chargeback → row written `unpaid` → NOT entitled) is driven
// through the real webhook and reversal step over a stateful fake database in
// subscription-reversal-before-row.test.ts ("Finding 1 end-to-end"). This file mocks the
// subscription store, so it cannot exercise that path; it keeps the reader and deletion tests.

/**
 * Store-integration for the webhook deleted handler. The store module is wrapped so each call is
 * recorded AND runs the real store (over the in-memory database below): the handler tests assert
 * the call, and the GP-796 route tests assert what the database holds afterwards.
 */

const upsertTerminalSubscriptionStatus = vi.fn();
const upsertSubscription = vi.fn();
const resolveUserIdForStripeSubscription = vi.fn(async (): Promise<string | null> => 'user-42');

vi.mock('./subscription-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./subscription-store')>();
  return {
    upsertTerminalSubscriptionStatus: (...a: Parameters<typeof actual.upsertTerminalSubscriptionStatus>) => {
      upsertTerminalSubscriptionStatus(...a);
      return actual.upsertTerminalSubscriptionStatus(...a);
    },
    upsertSubscription: (...a: Parameters<typeof actual.upsertSubscription>) => {
      upsertSubscription(...a);
      return actual.upsertSubscription(...a);
    },
    resolveUserIdForStripeSubscription: () => resolveUserIdForStripeSubscription(),
  };
});

// GP-796: one in-memory table per Prisma model (only equality `where`s are used on this path),
// so the route's deletion marker and the guarded membership write are real rows.
const db = vi.hoisted(() => ({ tables: {} as Record<string, Array<Record<string, unknown>>> }));
vi.mock('@/lib/prisma', () => {
  type Row = Record<string, unknown>;
  const same = (a: unknown, b: unknown) =>
    a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : (a ?? null) === b;
  const match = (row: Row, where: Row = {}) => Object.entries(where).every(([k, v]) => same(row[k], v));
  const model = (name: string) => {
    const t = () => (db.tables[name] ??= []);
    return {
      findUnique: async (a: { where: Row }) => {
        const r = t().find((x) => match(x, a.where));
        return r ? { ...r } : null;
      },
      findFirst: async (a: { where?: Row }) => {
        const r = t().find((x) => match(x, a?.where));
        return r ? { ...r } : null;
      },
      upsert: async (a: { where: Row; create: Row; update: Row }) => {
        const r = t().find((x) => match(x, a.where));
        if (r) return { ...Object.assign(r, a.update) };
        const row = { ...a.create };
        t().push(row);
        return { ...row };
      },
      updateMany: async (a: { where: Row; data: Row }) => {
        const rows = t().filter((x) => match(x, a.where));
        rows.forEach((r) => Object.assign(r, a.data));
        return { count: rows.length };
      },
    };
  };
  const models: Record<string, ReturnType<typeof model>> = {};
  const client: Record<string, unknown> = new Proxy(
    {},
    {
      get: (_t, key: string) =>
        key === '$transaction'
          ? async (fn: (tx: unknown) => Promise<unknown>) => fn(client)
          : key === 'then'
            ? undefined
            : (models[key] ??= model(key)),
    },
  );
  return { prisma: client };
});

const route = vi.hoisted(() => ({ event: null as Record<string, unknown> | null }));

// Stripe client: customer email lookup in the deleted handler; the route's signature check.
vi.mock('@/lib/api/stripe', () => ({
  constructWebhookEvent: () => route.event,
  resolveStripeWebhookSecret: () => 'whsec_test_placeholder',
  isVerifiedStripeEventShape: () => true,
  webhookLivemodeMatchesApiKey: () => true,
  getStripeClient: () => ({
    customers: { retrieve: vi.fn(async () => ({ email: 'member@example.com' })) },
    subscriptions: { retrieve: vi.fn() },
  }),
}));
vi.mock('@/lib/server/stripe-webhook-idempotency', () => ({
  claimStripeWebhookEvent: vi.fn(async () => ({ claimed: true })),
  markStripeWebhookEventProcessed: vi.fn(async () => {}),
  releaseStripeWebhookEventClaim: vi.fn(async () => {}),
}));
vi.mock('@/lib/server/event-attribution', () => ({
  persistAttributedRevenueReversal: vi.fn(async () => {}),
  recordAttributedStage: vi.fn(async () => {}),
  tryRecordAttributedStage: vi.fn(async () => {}),
}));
vi.mock('@/lib/server/subscription-analytics', () => ({
  trackSubscriptionLifecycleEvent: vi.fn(() => {}),
}));
vi.mock('@/lib/server/sentry', () => ({ captureServerError: vi.fn(async () => {}) }));

import { handleSubscriptionEvent } from './subscription-webhook';
import { decideMembershipEntitlement } from './entitlements';

const { POST } = await import('../../../app/api/lms/webhooks/stripe/route');

const DELETED_AT = 1_760_000_000; // unix seconds

function deletedEvent(): Stripe.Event {
  return {
    id: 'evt_deleted_795',
    type: 'customer.subscription.deleted',
    created: DELETED_AT,
    data: {
      object: {
        id: 'sub_795',
        status: 'canceled',
        customer: 'cus_1',
        items: { data: [] },
        metadata: { carsi_user_id: 'user-42' },
      },
    },
  } as unknown as Stripe.Event;
}

/** A later `customer.subscription.updated` saying the same subscription is active again. */
function activeSnapshotEvent(createdAt: number): Stripe.Event {
  return {
    id: `evt_active_${createdAt}`,
    type: 'customer.subscription.updated',
    created: createdAt,
    data: {
      object: {
        id: 'sub_795',
        status: 'active',
        customer: 'cus_1',
        cancel_at_period_end: false,
        items: { data: [{ current_period_end: DELETED_AT + 365 * 86_400 }] },
        metadata: { carsi_user_id: 'user-42' },
      },
    },
  } as unknown as Stripe.Event;
}

/** Deliver `event` through the real signed webhook route. Returns the HTTP status. */
async function deliver(event: Stripe.Event): Promise<number> {
  route.event = { ...event, object: 'event', livemode: false } as unknown as Record<string, unknown>;
  const res = await POST(
    new Request('https://carsi.com.au/api/lms/webhooks/stripe', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': `t=${DELETED_AT},v1=${'ab'.repeat(32)}`,
      },
      body: '{}',
    }) as never,
  );
  return res.status;
}

const membershipRow = () => (db.tables.lmsSubscription ?? []).find((r) => r.userId === 'user-42');
const endedMarker = () => (db.tables.stripeWebhookEvent ?? []).find((r) => r.id === 'subscription-ended:sub_795');

beforeEach(() => {
  vi.clearAllMocks();
  db.tables = {};
  resolveUserIdForStripeSubscription.mockResolvedValue('user-42');
  process.env.DATABASE_URL = 'postgresql://offline.invalid/test';
});

describe('customer.subscription.deleted → sticky terminal write (Finding 2 parity)', () => {
  it('resolves the user and writes a sticky canceled row stamped with event.created', async () => {
    await handleSubscriptionEvent(deletedEvent());
    expect(upsertTerminalSubscriptionStatus).toHaveBeenCalledTimes(1);
    const arg = upsertTerminalSubscriptionStatus.mock.calls[0][0] as {
      userId: string;
      stripeSubscriptionId: string;
      status: string;
      eventTimestamp: Date;
    };
    expect(arg.userId).toBe('user-42');
    expect(arg.stripeSubscriptionId).toBe('sub_795');
    expect(arg.status).toBe('canceled');
    expect(arg.eventTimestamp).toEqual(new Date(DELETED_AT * 1000));
  });

  it('writes no row itself when the user cannot be resolved', async () => {
    resolveUserIdForStripeSubscription.mockResolvedValueOnce(null);
    await handleSubscriptionEvent(deletedEvent());
    expect(upsertTerminalSubscriptionStatus).not.toHaveBeenCalled();
    expect(upsertSubscription).not.toHaveBeenCalled();
    expect(membershipRow()).toBeUndefined();
  });
});

describe('GP-796: the route records the deletion marker, and no later active snapshot undoes it', () => {
  it('an unresolved owner: the route stores the deletion marker, stamped with event.created, and writes no row', async () => {
    resolveUserIdForStripeSubscription.mockResolvedValueOnce(null);
    expect(await deliver(deletedEvent())).toBe(200);
    expect(endedMarker()).toMatchObject({
      type: 'subscription_ended:deleted',
      processedAt: new Date(DELETED_AT * 1000),
    });
    expect(membershipRow()).toBeUndefined();
  });

  it('a later active snapshot, once the owner resolves, is written canceled and gives no access', async () => {
    resolveUserIdForStripeSubscription.mockResolvedValueOnce(null);
    expect(await deliver(deletedEvent())).toBe(200);
    // Stamped AFTER the deletion, so the row's ordering guard alone would let it through.
    expect(await deliver(activeSnapshotEvent(DELETED_AT + 3_600))).toBe(200);
    expect(upsertSubscription).toHaveBeenCalledTimes(1);
    expect(membershipRow()?.status).toBe('canceled');
    expect(
      decideMembershipEntitlement(
        membershipRow() as { status: string; currentPeriodEnd: Date | null },
        new Date((DELETED_AT + 7_200) * 1000),
      ).entitled,
    ).toBe(false);
  });

  it('a resolved owner: the deletion is written canceled and a later active snapshot cannot reopen it', async () => {
    expect(await deliver(deletedEvent())).toBe(200);
    expect(endedMarker()).toBeDefined();
    expect(membershipRow()?.status).toBe('canceled');
    expect(await deliver(activeSnapshotEvent(DELETED_AT + 3_600))).toBe(200);
    expect(membershipRow()?.status).toBe('canceled');
  });
});
