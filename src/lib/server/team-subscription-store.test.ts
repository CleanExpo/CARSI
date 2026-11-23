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

const markers = vi.hoisted(() => new Map<string, { id: string; type: string }>());

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
  beforeEach(() => markers.clear());

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
