import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * WS1-E3 (GP-443): org subscription store. Proves (a) updateOrgSubscriptionFromStripe
 * only writes when the row already exists (a pure webhook cannot invent org
 * name/contact), (b) the statusEventAt out-of-order guard, and (c) upsert
 * seeding via upsertOrgSubscription. Uses an in-memory fake of the single row.
 */

type Row = {
  teamId: string;
  organisationName: string;
  contactEmail: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string;
  seatModel: string;
  entitledCategory: string;
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
  const update = vi.fn(async (args: { where: { teamId: string }; data: Record<string, unknown> }) => {
    if (!store.row || store.row.teamId !== args.where.teamId) throw new Error('not found');
    store.row = { ...store.row, ...(args.data as Partial<NonNullable<Row>>) };
    return store.row;
  });
  const upsert = vi.fn(
    async (args: { where: { teamId: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
      if (store.row && store.row.teamId === args.where.teamId) {
        store.row = { ...store.row, ...(args.update as Partial<NonNullable<Row>>) };
      } else {
        store.row = {
          seatModel: 'unlimited',
          entitledCategory: 'CARSI Maintenance Company Onboarding',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          statusEventAt: null,
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
  return { store, findUnique, update, upsert, updateMany };
});

const markers = vi.hoisted(() => new Map<string, { id: string; type: string }>());

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsOrgSubscription: {
      findUnique: db.findUnique,
      update: db.update,
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
  updateOrgSubscriptionFromStripe,
  upsertOrgSubscription,
} from './org-subscription-store';

const TEAM = 'team-1';
const SUB = 'sub_org';
const T1 = new Date('2026-07-05T10:00:00.000Z');
const T2 = new Date('2026-07-05T11:00:00.000Z');
const row = () => db.store.row;

beforeEach(() => {
  db.store.row = null;
  vi.clearAllMocks();
});

describe('updateOrgSubscriptionFromStripe', () => {
  it('returns false and writes nothing when the row does not exist yet', async () => {
    const applied = await updateOrgSubscriptionFromStripe({
      teamId: TEAM,
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: SUB,
      status: 'active',
      currentPeriodEnd: T2,
      cancelAtPeriodEnd: false,
      eventTimestamp: T1,
    });
    expect(applied).toBe(false);
    expect(db.update).not.toHaveBeenCalled();
    expect(row()).toBeNull();
  });

  it('updates an existing seeded row to active', async () => {
    await upsertOrgSubscription({
      teamId: TEAM,
      organisationName: 'Acme Pty Ltd',
      contactEmail: 'ops@acme.example',
      stripeCustomerId: null,
      stripeSubscriptionId: SUB,
      status: 'incomplete',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
    const applied = await updateOrgSubscriptionFromStripe({
      teamId: TEAM,
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: SUB,
      status: 'active',
      currentPeriodEnd: T2,
      cancelAtPeriodEnd: false,
      eventTimestamp: T1,
    });
    expect(applied).toBe(true);
    expect(row()?.status).toBe('active');
    expect(row()?.statusEventAt).toEqual(T1);
  });

  it('ignores a stale event (older than the stored statusEventAt) but reports handled', async () => {
    await upsertOrgSubscription({
      teamId: TEAM,
      organisationName: 'Acme',
      contactEmail: 'ops@acme.example',
      stripeCustomerId: null,
      stripeSubscriptionId: SUB,
      status: 'active',
      currentPeriodEnd: T2,
      cancelAtPeriodEnd: false,
      eventTimestamp: T2,
    });
    const applied = await updateOrgSubscriptionFromStripe({
      teamId: TEAM,
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: SUB,
      status: 'canceled', // a LATE stale event stamped at the earlier T1
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      eventTimestamp: T1,
    });
    expect(applied).toBe(true); // row exists → handled
    expect(row()?.status).toBe('active'); // but stale write was dropped
  });
});

describe('GP-641: a reversal or deletion marker makes the write org row canceled', () => {
  beforeEach(() => markers.clear());

  it('writes unpaid (no paid-through access) when the latest payment was refunded', async () => {
    markers.set(`payment-reversed:${SUB}`, { id: `payment-reversed:${SUB}`, type: 'payment_reversed:refunded' });
    await upsertOrgSubscription({
      teamId: TEAM,
      organisationName: 'Acme',
      contactEmail: 'ops@acme.example',
      stripeCustomerId: null,
      stripeSubscriptionId: SUB,
      status: 'active',
      currentPeriodEnd: T2,
      cancelAtPeriodEnd: false,
    });
    expect(row()?.status).toBe('unpaid');
  });

  it('writes canceled when Stripe deleted the subscription before this write', async () => {
    markers.set(`subscription-ended:${SUB}`, { id: `subscription-ended:${SUB}`, type: 'subscription_ended:deleted' });
    await upsertOrgSubscription({
      teamId: TEAM,
      organisationName: 'Acme',
      contactEmail: 'ops@acme.example',
      stripeCustomerId: null,
      stripeSubscriptionId: SUB,
      status: 'active',
      currentPeriodEnd: T2,
      cancelAtPeriodEnd: false,
    });
    expect(row()?.status).toBe('canceled');
  });

  it('control: a lifted dispute (won) does not cancel', async () => {
    markers.set(`payment-reversed:${SUB}`, { id: `payment-reversed:${SUB}`, type: 'payment_reversal_lifted:dispute_won' });
    await upsertOrgSubscription({
      teamId: TEAM,
      organisationName: 'Acme',
      contactEmail: 'ops@acme.example',
      stripeCustomerId: null,
      stripeSubscriptionId: SUB,
      status: 'active',
      currentPeriodEnd: T2,
      cancelAtPeriodEnd: false,
    });
    expect(row()?.status).toBe('active');
  });
});
