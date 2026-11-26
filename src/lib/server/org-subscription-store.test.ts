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

  it('APPLIES an update stamped at the SAME second as the stored state (equal is not stale)', async () => {
    await upsertOrgSubscription({
      teamId: TEAM,
      organisationName: 'Acme',
      contactEmail: 'ops@acme.example',
      stripeCustomerId: null,
      stripeSubscriptionId: SUB,
      status: 'active',
      currentPeriodEnd: T2,
      cancelAtPeriodEnd: false,
      eventTimestamp: T1,
    });
    const applied = await updateOrgSubscriptionFromStripe({
      teamId: TEAM,
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: SUB,
      status: 'canceled', // same event second as the stored active state: a replay, not stale
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      eventTimestamp: T1,
    });
    expect(applied).toBe(true);
    expect(row()?.status).toBe('canceled');
    expect(row()?.statusEventAt).toEqual(T1);
  });

  it('upsertOrgSubscription APPLIES a provisioning write stamped at the SAME second (equal is not stale)', async () => {
    const seed = {
      teamId: TEAM,
      organisationName: 'Acme',
      contactEmail: 'ops@acme.example',
      stripeCustomerId: null,
      stripeSubscriptionId: SUB,
      status: 'active',
      currentPeriodEnd: T2,
      cancelAtPeriodEnd: false,
      eventTimestamp: T1,
    };
    await upsertOrgSubscription(seed);
    await upsertOrgSubscription({ ...seed, cancelAtPeriodEnd: true });
    expect(row()?.cancelAtPeriodEnd).toBe(true);
    expect(row()?.statusEventAt).toEqual(T1);
  });
});

describe('GP-641: a reversal or deletion marker makes the write org row canceled', () => {
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

describe('GP-796: the webhook path (updateOrgSubscriptionFromStripe) on current-format reversal markers', () => {
  const INVOICE_AT = new Date('2026-07-05T09:00:00.000Z');
  const NEWER_AT = new Date('2026-07-05T09:30:00.000Z');

  /** Seed the org row the way provisioning does, linked to `subId`. */
  async function seed(subId: string, status = 'incomplete') {
    await upsertOrgSubscription({
      teamId: TEAM,
      organisationName: 'Acme Pty Ltd',
      contactEmail: 'ops@acme.example',
      stripeCustomerId: null,
      stripeSubscriptionId: subId,
      status,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
  }

  function webhookUpdate(subId: string, eventTimestamp: Date) {
    return updateOrgSubscriptionFromStripe({
      teamId: TEAM,
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: subId,
      status: 'active',
      currentPeriodEnd: T2,
      cancelAtPeriodEnd: false,
      eventTimestamp,
    });
  }

  it('a refund of Stripe\'s latest invoice writes unpaid, after reading Stripe', async () => {
    await seed(SUB);
    plantReversal(SUB, 'refunded', 'in_1', INVOICE_AT);
    stripeLatestInvoice('in_1', INVOICE_AT, true);
    expect(await webhookUpdate(SUB, T1)).toBe(true);
    expect(stripe.retrieve).toHaveBeenCalledWith(SUB, { expand: ['latest_invoice'] });
    expect(row()?.status).toBe('unpaid');
    expect(row()?.statusEventAt).toEqual(T1);
  });

  it('a chargeback of Stripe\'s latest invoice writes unpaid', async () => {
    await seed(SUB);
    plantReversal(SUB, 'disputed', 'in_1', INVOICE_AT);
    stripeLatestInvoice('in_1', INVOICE_AT, true);
    expect(await webhookUpdate(SUB, T1)).toBe(true);
    expect(row()?.status).toBe('unpaid');
  });

  it('an older refunded invoice does not block once Stripe\'s latest invoice is a newer paid one', async () => {
    await seed(SUB);
    plantReversal(SUB, 'refunded', 'in_1', INVOICE_AT);
    stripeLatestInvoice('in_2', NEWER_AT, true);
    expect(await webhookUpdate(SUB, T1)).toBe(true);
    expect(stripe.retrieve).toHaveBeenCalled();
    expect(row()?.status).toBe('active');
  });

  it('an older charged-back invoice does not block once Stripe\'s latest invoice is a newer paid one', async () => {
    await seed(SUB);
    plantReversal(SUB, 'disputed', 'in_1', INVOICE_AT);
    stripeLatestInvoice('in_2', NEWER_AT, true);
    expect(await webhookUpdate(SUB, T1)).toBe(true);
    expect(row()?.status).toBe('active');
  });

  it('a reversal still writes nothing when the org row does not exist yet', async () => {
    plantReversal(SUB, 'refunded', 'in_1', INVOICE_AT);
    stripeLatestInvoice('in_1', INVOICE_AT, true);
    expect(await webhookUpdate(SUB, T1)).toBe(false);
    expect(db.update).not.toHaveBeenCalled();
    expect(row()).toBeNull();
  });

  it('keeps the replacement subscription: a refund of the old one never overwrites the new row', async () => {
    await seed('sub_org_new', 'active');
    plantReversal(SUB, 'refunded', 'in_1', INVOICE_AT);
    stripeLatestInvoice('in_1', INVOICE_AT, true);
    // Handled (the row exists and belongs to the replacement), but nothing is written.
    expect(await webhookUpdate(SUB, T2)).toBe(true);
    expect(db.update).not.toHaveBeenCalled();
    expect(row()?.stripeSubscriptionId).toBe('sub_org_new');
    expect(row()?.status).toBe('active');
  });

  it('keeps the replacement subscription against a chargeback of the old one', async () => {
    await seed('sub_org_new', 'active');
    plantReversal(SUB, 'disputed', 'in_1', INVOICE_AT);
    stripeLatestInvoice('in_1', INVOICE_AT, true);
    expect(await webhookUpdate(SUB, T2)).toBe(true);
    expect(db.update).not.toHaveBeenCalled();
    expect(row()?.stripeSubscriptionId).toBe('sub_org_new');
    expect(row()?.status).toBe('active');
  });
});
