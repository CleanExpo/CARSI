import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * WS1-E2 (GP-442): team seat subscription store. Proves the same out-of-order
 * guard + sticky terminal write as the individual membership, keyed on teamId,
 * carrying the paid seatLimit.
 */

type Row = {
  teamId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string;
  plan: string;
  seatLimit: number;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  statusEventAt: Date | null;
} | null;

const db = vi.hoisted(() => {
  const store = { row: null as Row };
  const findUnique = vi.fn(async (args: { where: { teamId?: string } }) => {
    const row = store.row;
    if (!row) return null;
    if (args.where.teamId && args.where.teamId !== row.teamId) return null;
    return row;
  });
  const upsert = vi.fn(
    async (args: { where: { teamId: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
      if (store.row && store.row.teamId === args.where.teamId) {
        store.row = { ...store.row, ...(args.update as Partial<NonNullable<Row>>) };
      } else {
        store.row = {
          plan: 'starter',
          seatLimit: 0,
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
      if (store.row && store.row.stripeSubscriptionId === args.where.stripeSubscriptionId) {
        store.row = { ...store.row, status: args.data.status };
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
    lmsTeamSubscription: {
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
  upsertTeamSubscription,
  upsertTerminalTeamSubscriptionStatus,
} from './team-subscription-store';

const TEAM = 'team-1';
const SUB = 'sub_team';
const T1 = new Date('2026-07-05T10:00:00.000Z');
const T2 = new Date('2026-07-05T11:00:00.000Z');
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

function activeInput(eventTimestamp: Date | null, seatLimit = 5) {
  return {
    teamId: TEAM,
    stripeCustomerId: 'cus_1',
    stripeSubscriptionId: SUB,
    status: 'active',
    seatLimit,
    currentPeriodEnd: new Date('2027-07-05T00:00:00.000Z'),
    cancelAtPeriodEnd: false,
    plan: 'starter',
    eventTimestamp,
  };
}

beforeEach(() => {
  db.store.row = null;
  markers.clear();
  stripe.latestInvoice = null;
  vi.clearAllMocks();
});

describe('upsertTeamSubscription — seat + ordering guard', () => {
  it('applies the first snapshot with its seat limit and statusEventAt', async () => {
    await upsertTeamSubscription(activeInput(T1, 15));
    expect(row()?.status).toBe('active');
    expect(row()?.seatLimit).toBe(15);
    expect(row()?.statusEventAt).toEqual(T1);
  });

  it('IGNORES a stale snapshot older than the stored statusEventAt', async () => {
    await upsertTerminalTeamSubscriptionStatus({
      teamId: TEAM,
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: SUB,
      status: 'canceled',
      seatLimit: 5,
      eventTimestamp: T2,
    });
    await upsertTeamSubscription(activeInput(T1));
    expect(row()?.status).toBe('canceled');
    expect(row()?.statusEventAt).toEqual(T2);
  });

  it('applies a newer snapshot (seat expansion arrives as an updated event)', async () => {
    await upsertTeamSubscription(activeInput(T1, 5));
    await upsertTeamSubscription(activeInput(T2, 10));
    expect(row()?.seatLimit).toBe(10);
    expect(row()?.statusEventAt).toEqual(T2);
  });

  it('APPLIES a snapshot stamped at the SAME second as the stored state (equal is not stale)', async () => {
    await upsertTeamSubscription(activeInput(T1, 5));
    await upsertTeamSubscription(activeInput(T1, 12));
    expect(row()?.seatLimit).toBe(12);
    expect(row()?.statusEventAt).toEqual(T1);
  });

  it('a terminal cancel at the SAME second as the stored active state is applied', async () => {
    await upsertTeamSubscription(activeInput(T1, 5));
    await upsertTerminalTeamSubscriptionStatus({
      teamId: TEAM,
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: SUB,
      status: 'canceled',
      seatLimit: 5,
      eventTimestamp: T1,
    });
    expect(row()?.status).toBe('canceled');
    expect(row()?.statusEventAt).toEqual(T1);
  });
});

describe('upsertTerminalTeamSubscriptionStatus — sticky cancel', () => {
  it('creates a canceled row when none exists (deleted-before-created)', async () => {
    await upsertTerminalTeamSubscriptionStatus({
      teamId: TEAM,
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: SUB,
      status: 'canceled',
      seatLimit: 5,
      eventTimestamp: T1,
    });
    expect(row()?.status).toBe('canceled');
  });

  it('stays canceled against a stale later-arriving active snapshot', async () => {
    await upsertTerminalTeamSubscriptionStatus({
      teamId: TEAM,
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: SUB,
      status: 'canceled',
      seatLimit: 5,
      eventTimestamp: T2,
    });
    await upsertTeamSubscription(activeInput(T1));
    expect(row()?.status).toBe('canceled');
  });
});

describe('GP-641: a reversal or deletion marker makes the write Teams row canceled', () => {
  it('writes unpaid (no paid-through access) when the latest payment was refunded', async () => {
    markers.set(`payment-reversed:${SUB}`, { id: `payment-reversed:${SUB}`, type: 'payment_reversed:refunded' });
    await upsertTeamSubscription(activeInput(T1));
    expect(row()?.status).toBe('unpaid');
  });

  it('writes canceled when Stripe deleted the subscription before this write', async () => {
    markers.set(`subscription-ended:${SUB}`, { id: `subscription-ended:${SUB}`, type: 'subscription_ended:deleted' });
    await upsertTeamSubscription(activeInput(T1));
    expect(row()?.status).toBe('canceled');
  });

  it('control: a lifted dispute (won) does not cancel', async () => {
    markers.set(`payment-reversed:${SUB}`, { id: `payment-reversed:${SUB}`, type: 'payment_reversal_lifted:dispute_won' });
    await upsertTeamSubscription(activeInput(T1));
    expect(row()?.status).toBe('active');
  });
});

describe('GP-796: reversal markers in the current format, settled by Stripe\'s latest invoice', () => {
  const INVOICE_AT = new Date('2026-07-05T09:00:00.000Z');
  const NEWER_AT = new Date('2026-07-05T09:30:00.000Z');

  it('a refund of Stripe\'s latest invoice writes unpaid, after reading Stripe', async () => {
    plantReversal(SUB, 'refunded', 'in_1', INVOICE_AT);
    stripeLatestInvoice('in_1', INVOICE_AT, true);
    await upsertTeamSubscription(activeInput(T1));
    expect(stripe.retrieve).toHaveBeenCalledWith(SUB, { expand: ['latest_invoice'] });
    expect(row()?.status).toBe('unpaid');
  });

  it('a chargeback of Stripe\'s latest invoice writes unpaid', async () => {
    plantReversal(SUB, 'disputed', 'in_1', INVOICE_AT);
    stripeLatestInvoice('in_1', INVOICE_AT, true);
    await upsertTeamSubscription(activeInput(T1));
    expect(row()?.status).toBe('unpaid');
  });

  it('an older refunded invoice does not block once Stripe\'s latest invoice is a newer paid one', async () => {
    plantReversal(SUB, 'refunded', 'in_1', INVOICE_AT);
    stripeLatestInvoice('in_2', NEWER_AT, true);
    await upsertTeamSubscription(activeInput(T1));
    expect(stripe.retrieve).toHaveBeenCalled();
    expect(row()?.status).toBe('active');
  });

  it('an older charged-back invoice does not block once Stripe\'s latest invoice is a newer paid one', async () => {
    plantReversal(SUB, 'disputed', 'in_1', INVOICE_AT);
    stripeLatestInvoice('in_2', NEWER_AT, true);
    await upsertTeamSubscription(activeInput(T1));
    expect(row()?.status).toBe('active');
  });

  it('keeps the replacement subscription: a refund of the old one never overwrites the new row', async () => {
    await upsertTeamSubscription({ ...activeInput(T1, 10), stripeSubscriptionId: 'sub_team_new' });
    plantReversal(SUB, 'refunded', 'in_1', INVOICE_AT);
    stripeLatestInvoice('in_1', INVOICE_AT, true);
    await upsertTeamSubscription(activeInput(T2, 5));
    expect(row()?.stripeSubscriptionId).toBe('sub_team_new');
    expect(row()?.status).toBe('active');
    expect(row()?.seatLimit).toBe(10);
    expect(db.upsert).toHaveBeenCalledTimes(1);
  });

  it('keeps the replacement subscription against a chargeback of the old one', async () => {
    await upsertTeamSubscription({ ...activeInput(T1, 10), stripeSubscriptionId: 'sub_team_new' });
    plantReversal(SUB, 'disputed', 'in_1', INVOICE_AT);
    stripeLatestInvoice('in_1', INVOICE_AT, true);
    await upsertTerminalTeamSubscriptionStatus({
      teamId: TEAM,
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: SUB,
      status: 'canceled',
      seatLimit: 5,
      eventTimestamp: T2,
    });
    expect(row()?.stripeSubscriptionId).toBe('sub_team_new');
    expect(row()?.status).toBe('active');
  });
});
