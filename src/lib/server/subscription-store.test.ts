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

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsSubscription: {
      findUnique: db.findUnique,
      upsert: db.upsert,
      updateMany: db.updateMany,
    },
  },
}));

import {
  markSubscriptionStatusBySubscriptionId,
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

beforeEach(() => {
  db.store.row = null;
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

describe('markSubscriptionStatusBySubscriptionId — legacy id-keyed write', () => {
  it('updates an existing row by subscription id', async () => {
    await upsertSubscription(activeInput(T1));
    await markSubscriptionStatusBySubscriptionId(SUB, 'canceled');
    expect(row()?.status).toBe('canceled');
  });

  it('is a no-op when no row matches the subscription id', async () => {
    await markSubscriptionStatusBySubscriptionId('sub_absent', 'canceled');
    expect(row()).toBeNull();
  });
});
