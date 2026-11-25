import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * FINDING 2 (GP-441): out-of-order Stripe webhook events must not corrupt the
 * final subscription state. These tests exercise the store-layer ordering guard
 * against an in-memory fake of the single `lms_subscriptions` row that Prisma
 * would hold, so the guard logic (compare event timestamp vs stored
 * `statusEventAt`, upsert-into-canceled when absent) is proven without a DB.
 */

// A minimal in-memory stand-in for the one membership row, keyed by userId (the
// unique column the store upserts on). `null` means "no row yet".
type Row = {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string;
  plan: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  statusEventAt: Date | null;
} | null;

// `vi.mock` is hoisted above module-level consts, so the fake DB and its spies
// must be created inside a hoisted block to exist when the factory runs.
const db = vi.hoisted(() => {
  const store = { row: null as Row };

  const findUnique = vi.fn(async (args: { where: { userId?: string } }) => {
    const row = store.row;
    if (!row) return null;
    if (args.where.userId && args.where.userId !== row.userId) return null;
    return row;
  });

  const upsert = vi.fn(
    async (args: {
      where: { userId: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => {
      const row = store.row;
      if (row && row.userId === args.where.userId) {
        store.row = { ...row, ...(args.update as Partial<NonNullable<Row>>) };
      } else {
        store.row = {
          plan: 'pro_annual',
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          statusEventAt: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          status: 'active',
          ...(args.create as Partial<NonNullable<Row>>),
        } as NonNullable<Row>;
      }
      return store.row;
    },
  );

  const updateMany = vi.fn(
    async (args: { where: { stripeSubscriptionId?: string }; data: { status: string } }) => {
      const row = store.row;
      if (row && row.stripeSubscriptionId === args.where.stripeSubscriptionId) {
        store.row = { ...row, status: args.data.status };
        return { count: 1 };
      }
      return { count: 0 };
    },
  );

  return { store, findUnique, upsert, updateMany };
});

const markers = vi.hoisted(
  () => new Map<string, { id: string; type: string; processedAt?: Date | null }>(),
);

// GP-796: Stripe's answer for the subscription's latest invoice. The guard reads it before the
// transaction whenever a blocking reversal marker names an invoice (`<state>@<invoice id>`).
const stripe = vi.hoisted(() => ({
  latestInvoice: null as null | { id: string; created: number; status: string; amount_paid: number },
  retrieve: null as unknown as ReturnType<typeof vi.fn>,
}));
stripe.retrieve = vi.fn(async (id: string) => ({ id, latest_invoice: stripe.latestInvoice }));

vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({ subscriptions: { retrieve: stripe.retrieve } }),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsSubscription: {
      findUnique: db.findUnique,
      upsert: db.upsert,
      updateMany: db.updateMany,
    },
    // GP-641: the guarded write reads the reversal markers on its own transaction.
    stripeWebhookEvent: {
      findUnique: async (args: { where: { id: string } }) => markers.get(args.where.id) ?? null,
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn((await import('@/lib/prisma')).prisma),
  },
}));

import {
  upsertSubscription,
  upsertTerminalSubscriptionStatus,
} from './subscription-store';

const USER = 'user-1';
const SUB = 'sub_123';
const T1 = new Date('2026-07-04T10:00:00.000Z'); // earlier
const T2 = new Date('2026-07-04T11:00:00.000Z'); // later

function activeInput(eventTimestamp: Date | null) {
  return {
    userId: USER,
    stripeCustomerId: 'cus_1',
    stripeSubscriptionId: SUB,
    status: 'active',
    currentPeriodEnd: new Date('2027-07-04T00:00:00.000Z'),
    cancelAtPeriodEnd: false,
    eventTimestamp,
  };
}

// Convenience accessor for the fake DB's single row inside assertions.
const row = () => db.store.row;

/**
 * Plant a reversal in the ledger's current format (GP-641): the per-invoice row and the
 * most-recent pointer `payment_reversed:<state>@<invoice id>`, stamped with the invoice's
 * Stripe `created` time. The legacy marker without `@<invoice id>` only exercises the
 * unknown-invoice block and never reaches Stripe's latest-invoice answer.
 */
function plantReversal(subId: string, state: 'refunded' | 'disputed', invoiceId: string, createdAt: Date) {
  const pointer = `payment-reversed:${subId}`;
  markers.set(pointer, { id: pointer, type: `payment_reversed:${state}@${invoiceId}`, processedAt: createdAt });
  const own = `payment-reversed:${subId}:${invoiceId}`;
  markers.set(own, { id: own, type: `payment_reversed:${state}`, processedAt: createdAt });
}

/** What Stripe returns as the subscription's latest invoice. */
function stripeLatestInvoice(id: string, createdAt: Date, paid: boolean) {
  stripe.latestInvoice = {
    id,
    created: Math.floor(createdAt.getTime() / 1000),
    status: paid ? 'paid' : 'open',
    amount_paid: paid ? 29900 : 0,
  };
}

beforeEach(() => {
  db.store.row = null;
  markers.clear();
  stripe.latestInvoice = null;
  vi.clearAllMocks();
});

describe('upsertSubscription — out-of-order guard', () => {
  it('applies the first snapshot and records its statusEventAt', async () => {
    await upsertSubscription(activeInput(T1));
    expect(row()?.status).toBe('active');
    expect(row()?.statusEventAt).toEqual(T1);
  });

  it('IGNORES a stale snapshot whose event timestamp is OLDER than the stored one', async () => {
    // A cancel landed at T2 first...
    await upsertTerminalSubscriptionStatus({
      userId: USER,
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: SUB,
      status: 'canceled',
      eventTimestamp: T2,
    });
    expect(row()?.status).toBe('canceled');

    // ...then a LATE `active` snapshot stamped at the earlier T1 arrives.
    await upsertSubscription(activeInput(T1));

    // Guard rejects it: state stays canceled, and no upsert write happened.
    expect(row()?.status).toBe('canceled');
    expect(row()?.statusEventAt).toEqual(T2);
    // The stale call short-circuited before writing.
    expect(db.upsert).toHaveBeenCalledTimes(1); // only the terminal cancel wrote
  });

  it('APPLIES a newer snapshot whose event timestamp is >= the stored one', async () => {
    await upsertSubscription(activeInput(T1));
    // A genuine later reactivation at T2 (e.g. resubscribe) must win.
    await upsertSubscription({ ...activeInput(T2), status: 'active' });
    expect(row()?.status).toBe('active');
    expect(row()?.statusEventAt).toEqual(T2);
  });

  it('APPLIES a replay stamped at the SAME second as the stored state (equal is not stale)', async () => {
    await upsertSubscription(activeInput(T1));
    // A second snapshot carrying the same event timestamp: the guard drops only strictly older
    // events, so this one is written (and its new period end and cancel flag land).
    await upsertSubscription({
      ...activeInput(T1),
      currentPeriodEnd: new Date('2028-07-04T00:00:00.000Z'),
      cancelAtPeriodEnd: true,
    });
    expect(db.upsert).toHaveBeenCalledTimes(2);
    expect(row()?.currentPeriodEnd).toEqual(new Date('2028-07-04T00:00:00.000Z'));
    expect(row()?.cancelAtPeriodEnd).toBe(true);
    expect(row()?.statusEventAt).toEqual(T1);
  });

  it('a terminal cancel at the SAME second as the stored active state is applied', async () => {
    await upsertSubscription(activeInput(T1));
    await upsertTerminalSubscriptionStatus({
      userId: USER,
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: SUB,
      status: 'canceled',
      eventTimestamp: T1,
    });
    expect(row()?.status).toBe('canceled');
  });

  it('applies unconditionally when eventTimestamp is omitted (legacy path)', async () => {
    // Seed a canceled row stamped in the future; an unordered write still applies.
    await upsertTerminalSubscriptionStatus({
      userId: USER,
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: SUB,
      status: 'canceled',
      eventTimestamp: T2,
    });
    await upsertSubscription({ ...activeInput(null) });
    expect(row()?.status).toBe('active');
  });
});

describe('upsertTerminalSubscriptionStatus — sticky cancel (deleted-before-created)', () => {
  it('CREATES a canceled row when none exists yet (deleted arrived before created)', async () => {
    expect(row()).toBeNull();
    await upsertTerminalSubscriptionStatus({
      userId: USER,
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: SUB,
      status: 'canceled',
      eventTimestamp: T1,
    });
    // Row now exists and is canceled — the cancellation was NOT lost.
    expect(row()?.status).toBe('canceled');
    expect(row()?.statusEventAt).toEqual(T1);
  });

  it('stays canceled when a stale earlier active snapshot arrives after it', async () => {
    // deleted-before-created: cancel at T2 creates the row...
    await upsertTerminalSubscriptionStatus({
      userId: USER,
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: SUB,
      status: 'canceled',
      eventTimestamp: T2,
    });
    // ...then the late `created` (active) stamped at the earlier T1 arrives.
    await upsertSubscription(activeInput(T1));
    // Final state is canceled — sticky against the stale active.
    expect(row()?.status).toBe('canceled');
  });

  it('does not resurrect: a strictly newer stored state wins over a stale cancel', async () => {
    // Row already active at T2 (a genuine later state).
    await upsertSubscription(activeInput(T2));
    // A stale cancel stamped at the earlier T1 must not override it.
    await upsertTerminalSubscriptionStatus({
      userId: USER,
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: SUB,
      status: 'canceled',
      eventTimestamp: T1,
    });
    expect(row()?.status).toBe('active');
  });
});

describe('GP-641: a reversal or deletion marker makes the write membership canceled', () => {
  it('writes unpaid (no paid-through access) when the latest payment was refunded', async () => {
    markers.set(`payment-reversed:${SUB}`, { id: `payment-reversed:${SUB}`, type: 'payment_reversed:refunded' });
    await upsertSubscription(activeInput(T1));
    expect(row()?.status).toBe('unpaid');
  });

  it('writes canceled when Stripe deleted the subscription before this write', async () => {
    markers.set(`subscription-ended:${SUB}`, { id: `subscription-ended:${SUB}`, type: 'subscription_ended:deleted' });
    await upsertSubscription(activeInput(T1));
    expect(row()?.status).toBe('canceled');
  });

  it('control: a lifted dispute (won) does not cancel', async () => {
    markers.set(`payment-reversed:${SUB}`, { id: `payment-reversed:${SUB}`, type: 'payment_reversal_lifted:dispute_won' });
    await upsertSubscription(activeInput(T1));
    expect(row()?.status).toBe('active');
  });
});

describe('GP-796: reversal markers in the current format, settled by Stripe\'s latest invoice', () => {
  const INVOICE_AT = new Date('2026-07-04T09:00:00.000Z');
  const NEWER_AT = new Date('2026-07-04T09:30:00.000Z');

  it('a refund of Stripe\'s latest invoice writes unpaid, after reading Stripe', async () => {
    plantReversal(SUB, 'refunded', 'in_1', INVOICE_AT);
    stripeLatestInvoice('in_1', INVOICE_AT, true);
    await upsertSubscription(activeInput(T1));
    expect(stripe.retrieve).toHaveBeenCalledWith(SUB, { expand: ['latest_invoice'] });
    expect(row()?.status).toBe('unpaid');
  });

  it('a chargeback of Stripe\'s latest invoice writes unpaid', async () => {
    plantReversal(SUB, 'disputed', 'in_1', INVOICE_AT);
    stripeLatestInvoice('in_1', INVOICE_AT, true);
    await upsertSubscription(activeInput(T1));
    expect(row()?.status).toBe('unpaid');
  });

  it('an older refunded invoice does not block once Stripe\'s latest invoice is a newer paid one', async () => {
    plantReversal(SUB, 'refunded', 'in_1', INVOICE_AT);
    stripeLatestInvoice('in_2', NEWER_AT, true);
    await upsertSubscription(activeInput(T1));
    expect(stripe.retrieve).toHaveBeenCalled();
    expect(row()?.status).toBe('active');
  });

  it('an older charged-back invoice does not block once Stripe\'s latest invoice is a newer paid one', async () => {
    plantReversal(SUB, 'disputed', 'in_1', INVOICE_AT);
    stripeLatestInvoice('in_2', NEWER_AT, true);
    await upsertSubscription(activeInput(T1));
    expect(row()?.status).toBe('active');
  });

  it('keeps the replacement subscription: a refund of the old one never overwrites the new row', async () => {
    // The member moved to a new subscription, which is active and linked to their row.
    await upsertSubscription({ ...activeInput(T1), stripeSubscriptionId: 'sub_new' });
    plantReversal(SUB, 'refunded', 'in_1', INVOICE_AT);
    stripeLatestInvoice('in_1', INVOICE_AT, true);
    // A late snapshot of the old, refunded subscription for the same member.
    await upsertSubscription(activeInput(T2));
    expect(row()?.stripeSubscriptionId).toBe('sub_new');
    expect(row()?.status).toBe('active');
    expect(row()?.statusEventAt).toEqual(T1);
    expect(db.upsert).toHaveBeenCalledTimes(1);
  });

  it('keeps the replacement subscription against a chargeback of the old one', async () => {
    await upsertSubscription({ ...activeInput(T1), stripeSubscriptionId: 'sub_new' });
    plantReversal(SUB, 'disputed', 'in_1', INVOICE_AT);
    stripeLatestInvoice('in_1', INVOICE_AT, true);
    await upsertTerminalSubscriptionStatus({
      userId: USER,
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: SUB,
      status: 'canceled',
      eventTimestamp: T2,
    });
    expect(row()?.stripeSubscriptionId).toBe('sub_new');
    expect(row()?.status).toBe('active');
  });
});
