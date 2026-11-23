import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-641: a refund, chargeback or cancellation of a subscription must remove access even when
 * Stripe delivers it before the membership row exists (or while the row is still an unlinked
 * checkout reservation), and a later "created", "updated" or "invoice" event must not bring the
 * access back. Stripe does not deliver events in order.
 *
 * Driven through the real webhook POST over one stateful fake database, for each subscription
 * kind: individual membership, Teams, organisation and coaching. Partial refunds are the control:
 * they never remove access, so a test that passes because nothing is ever granted would fail it.
 */

type Row = Record<string, unknown>;

const SUB = 'sub_gp641_test';
const USER = 'user-1';
const TEAM = 'team-1';

const db = vi.hoisted(() => ({
  tables: {} as Record<string, Array<Record<string, unknown>>>,
  seq: 0,
  // Runs once, when the next transaction is opened and before its body runs: a concurrent
  // writer landing between a check made before the transaction and the write inside it.
  beforeNextTx: null as null | (() => Promise<unknown>),
}));
const h = vi.hoisted(() => ({
  event: null as Record<string, unknown> | null,
  // What Stripe returns for subscriptions.retrieve (dispute won, invoice events).
  subscription: null as Record<string, unknown> | null,
  paymentIntentRetrieves: 0,
  // Creation time (seconds after T0) of the invoice the next refund or dispute reverses.
  reversedInvoiceAt: 100,
  // The id of that invoice (default: derived from its creation time). Two invoices can be
  // created in the same second, so the id is set on its own.
  reversedInvoiceId: null as string | null,
}));

vi.mock('@/lib/api/stripe', () => ({
  constructWebhookEvent: () => h.event,
  resolveStripeWebhookSecret: () => 'whsec_test_placeholder',
  isVerifiedStripeEventShape: () => true,
  webhookLivemodeMatchesApiKey: () => true,
  getStripeClient: () => ({
    paymentIntents: {
      retrieve: vi.fn(async () => {
        h.paymentIntentRetrieves += 1;
        return {
          id: 'pi_gp641',
          invoice: {
            id: h.reversedInvoiceId ?? `in_gp641_${h.reversedInvoiceAt}`,
            created: 1_790_000_000 + h.reversedInvoiceAt,
            parent: { subscription_details: { subscription: SUB } },
          },
        };
      }),
    },
    checkout: { sessions: { list: vi.fn(async () => ({ data: [] })) } },
    subscriptions: { retrieve: vi.fn(async () => h.subscription) },
    customers: { retrieve: vi.fn(async () => ({ id: 'cus_gp641', email: null })) },
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

const OPS = new Set(['in', 'notIn', 'not', 'gt', 'gte', 'lt', 'lte', 'equals', 'startsWith']);
function cmp(v: unknown, cond: unknown): boolean {
  if (cond === null || typeof cond !== 'object' || cond instanceof Date) {
    if (cond instanceof Date) return v instanceof Date && v.getTime() === cond.getTime();
    return (v ?? null) === cond;
  }
  const c = cond as Record<string, unknown>;
  return Object.keys(c).every((k) => {
    if (!OPS.has(k)) return false;
    const x = c[k];
    const num = (a: unknown) => (a instanceof Date ? a.getTime() : (a as number));
    switch (k) {
      case 'in': return (x as unknown[]).includes(v);
      case 'notIn': return !(x as unknown[]).includes(v);
      case 'not': return !cmp(v, x);
      case 'equals': return cmp(v, x);
      case 'startsWith': return typeof v === 'string' && v.startsWith(x as string);
      case 'gt': return v != null && num(v) > num(x);
      case 'gte': return v != null && num(v) >= num(x);
      case 'lt': return v != null && num(v) < num(x);
      case 'lte': return v != null && num(v) <= num(x);
    }
    return false;
  });
}
function match(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, cond]) => {
    if (k === 'OR') return (cond as Row[]).some((w) => match(row, w));
    if (k === 'AND') return (cond as Row[]).every((w) => match(row, w));
    return cmp(row[k], cond);
  });
}

vi.mock('@/lib/prisma', () => {
  let chain: Promise<unknown> = Promise.resolve();
  function model(name: string) {
    const t = () => (db.tables[name] ??= []);
    const select = (r: Row | undefined) => (r ? { ...r } : null);
    const create = (data: Row) => {
      const row: Row = { id: `${name}-${(db.seq += 1)}`, createdAt: new Date(), ...data };
      t().push(row);
      return { ...row };
    };
    return {
      findUnique: async (a: { where: Row }) => select(t().find((x) => match(x, a.where))),
      findFirst: async (a: { where?: Row }) => select(t().find((x) => match(x, a?.where))),
      findMany: async (a?: { where?: Row }) => t().filter((x) => match(x, a?.where)).map((r) => ({ ...r })),
      count: async (a?: { where?: Row }) => t().filter((x) => match(x, a?.where)).length,
      create: async (a: { data: Row }) => create(a.data),
      update: async (a: { where: Row; data: Row }) => {
        const r = t().find((x) => match(x, a.where));
        if (!r) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
        Object.assign(r, a.data);
        return { ...r };
      },
      updateMany: async (a: { where: Row; data: Row }) => {
        const rows = t().filter((x) => match(x, a.where));
        rows.forEach((r) => Object.assign(r, a.data));
        return { count: rows.length };
      },
      upsert: async (a: { where: Row; create: Row; update: Row }) => {
        const r = t().find((x) => match(x, a.where));
        if (r) {
          Object.assign(r, a.update);
          return { ...r };
        }
        return create(a.create);
      },
      deleteMany: async (a: { where: Row }) => {
        const keep = t().filter((x) => !match(x, a.where));
        const count = t().length - keep.length;
        db.tables[name] = keep;
        return { count };
      },
    };
  }
  const NAMES = [
    'lmsUser',
    'lmsTeam',
    'lmsSubscription',
    'lmsTeamSubscription',
    'lmsOrgSubscription',
    'carsiCoachingMonthlySubscription',
    'stripeWebhookEvent',
  ];
  const client: Row = Object.fromEntries(NAMES.map((n) => [n, model(n)]));
  client.$transaction = async (fn: (tx: unknown) => Promise<unknown>) => {
    if (db.beforeNextTx) {
      const f = db.beforeNextTx;
      db.beforeNextTx = null;
      await f();
    }
    // Transactions run one after another: the outcome SERIALIZABLE guarantees after a retry.
    const run = chain.then(() => fn(client));
    chain = run.catch(() => {});
    return run;
  };
  return { prisma: client };
});

const { POST } = await import('../../../app/api/lms/webhooks/stripe/route');
const { CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE } = await import('./carsi-coaching-monthly-checkout');
const { decideMembershipEntitlement } = await import('./entitlements');
const { decideCoachingPortalEntitlement } = await import('./carsi-coaching-entitlement');

type Kind = 'individual' | 'team' | 'org' | 'coaching';

const KINDS: Record<
  Kind,
  { table: string; metadata: Record<string, string>; ownerKey: Row; reservation: Row }
> = {
  individual: {
    table: 'lmsSubscription',
    metadata: { plan: 'pro_annual', carsi_user_id: USER },
    ownerKey: { userId: USER },
    reservation: { userId: USER, status: 'checkout_pending', plan: 'pro_annual' },
  },
  team: {
    table: 'lmsTeamSubscription',
    metadata: { plan: 'starter', carsi_team_id: TEAM },
    ownerKey: { teamId: TEAM },
    reservation: { teamId: TEAM, status: 'checkout_pending', plan: 'starter', seatLimit: 0 },
  },
  org: {
    table: 'lmsOrgSubscription',
    metadata: { plan: 'org_monthly', carsi_team_id: TEAM },
    ownerKey: { teamId: TEAM },
    reservation: {
      teamId: TEAM,
      status: 'checkout_pending',
      plan: 'org_monthly',
      organisationName: 'Org',
      contactEmail: 'org@gp641-test.invalid',
      seatModel: 'unlimited',
    },
  },
  coaching: {
    table: 'carsiCoachingMonthlySubscription',
    metadata: { source: '', carsi_user_id: USER },
    ownerKey: { userId: USER },
    reservation: { userId: USER, status: 'incomplete' },
  },
};

const T0 = 1_790_000_000;
let evt = 0;

function stripeSubscription(kind: Kind, status: string, metadata?: Record<string, string>) {
  const meta = { ...KINDS[kind].metadata, ...metadata };
  if (kind === 'coaching') meta.source = CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE;
  return {
    id: SUB,
    object: 'subscription',
    status,
    customer: 'cus_gp641',
    cancel_at_period_end: false,
    metadata: meta,
    items: { data: [{ quantity: 5, current_period_end: T0 + 365 * 86_400 }] },
  };
}

async function deliver(type: string, at: number, object: Row): Promise<number> {
  evt += 1;
  h.event = {
    id: `evt_gp641_${evt}`,
    object: 'event',
    livemode: false,
    type,
    created: T0 + at,
    data: { object },
  };
  const res = await POST(
    new Request('https://carsi.com.au/api/lms/webhooks/stripe', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': `t=${T0},v1=${'ab'.repeat(32)}`,
      },
      body: '{}',
    }) as never,
  );
  return res.status;
}

const refund = (at: number, full = true, invoiceAt = 100, invoiceId: string | null = null) => {
  h.reversedInvoiceAt = invoiceAt;
  h.reversedInvoiceId = invoiceId;
  return deliver('charge.refunded', at, {
    id: 'ch_gp641',
    payment_intent: 'pi_gp641',
    amount: 79_500,
    amount_refunded: full ? 79_500 : 10_000,
    currency: 'aud',
  });
};
const dispute = (at: number, invoiceAt = 100, invoiceId: string | null = null) => {
  h.reversedInvoiceAt = invoiceAt;
  h.reversedInvoiceId = invoiceId;
  return deliver('charge.dispute.created', at, {
    id: 'dp_gp641',
    payment_intent: 'pi_gp641',
    amount: 79_500,
    currency: 'aud',
    status: 'needs_response',
  });
};
const disputeWon = (at: number, invoiceAt = 100, invoiceId: string | null = null) => {
  h.reversedInvoiceAt = invoiceAt;
  h.reversedInvoiceId = invoiceId;
  return deliver('charge.dispute.closed', at, {
    id: 'dp_gp641',
    payment_intent: 'pi_gp641',
    amount: 79_500,
    currency: 'aud',
    status: 'won',
  });
};
/** `invoiceAt`: when the paid invoice was created (default: the delivery time). */
const invoicePaid = (at: number, amountPaid: number, invoiceAt = at, invoiceId?: string) =>
  deliver('invoice.paid', at, {
    id: invoiceId ?? `in_gp641_${invoiceAt}`,
    created: T0 + invoiceAt,
    amount_paid: amountPaid,
    currency: 'aud',
    billing_reason: 'subscription_cycle',
    parent: { subscription_details: { subscription: SUB } },
  });
const created = (kind: Kind, at: number, metadata?: Record<string, string>) =>
  deliver('customer.subscription.created', at, stripeSubscription(kind, 'active', metadata));
const updated = (kind: Kind, at: number) =>
  deliver('customer.subscription.updated', at, stripeSubscription(kind, 'active'));
const deleted = (kind: Kind, at: number, metadata?: Record<string, string>) =>
  deliver('customer.subscription.deleted', at, stripeSubscription(kind, 'canceled', metadata));

function rowFor(kind: Kind): Row | undefined {
  return (db.tables[KINDS[kind].table] ?? []).find((r) => match(r, KINDS[kind].ownerKey));
}

// The clock reads T0 + 1000 s: a re-read from Stripe after a reopen is written as of "now",
// newer than every event below 1000 and older than any event after it.
const NOW_AT = 1_000;
afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date((T0 + NOW_AT) * 1000));
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_placeholder';
  process.env.DATABASE_URL = 'postgresql://offline.invalid/test';
  h.subscription = null;
  h.paymentIntentRetrieves = 0;
  h.reversedInvoiceAt = 100;
  h.reversedInvoiceId = null;
  db.beforeNextTx = null;
  db.tables = {
    lmsUser: [{ id: USER, email: 'member@gp641-test.invalid' }],
    lmsTeam: [{ id: TEAM, name: 'Team', ownerId: USER, seatLimit: 0, bundleTier: 'teams_subscription' }],
    lmsSubscription: [],
    lmsTeamSubscription: [],
    lmsOrgSubscription: [],
    carsiCoachingMonthlySubscription: [],
    stripeWebhookEvent: [],
  };
});

const ROW_ABSENT_KINDS: Kind[] = ['individual', 'team', 'coaching'];
const ALL_KINDS: Kind[] = ['individual', 'team', 'org', 'coaching'];

describe('GP-641: a reversal delivered before the membership row exists still removes access', () => {
  it.each(ROW_ABSENT_KINDS)('%s: full refund first, then "created" (no row yet)', async (kind) => {
    expect(await refund(200)).toBe(200);
    expect(h.paymentIntentRetrieves).toBe(1);
    expect(await created(kind, 100)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
  });

  it.each(ALL_KINDS)('%s: full refund first, while the row is an unlinked checkout reservation', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await refund(200)).toBe(200);
    expect(await updated(kind, 100)).toBe(200);
    expect(rowFor(kind)?.stripeSubscriptionId).toBe(SUB);
    expect(rowFor(kind)?.status).toBe('unpaid');
  });

  it.each(ALL_KINDS)('%s: chargeback first, then "created"; a won dispute restores it', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await dispute(200)).toBe(200);
    expect(await created(kind, 100)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');

    h.subscription = stripeSubscription(kind, 'active');
    expect(await disputeWon(300)).toBe(200);
    expect(rowFor(kind)?.status).toBe('active');
  });

  it.each(ALL_KINDS)('%s: a refund on a live row stays put when a newer "active" snapshot arrives', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await created(kind, 100)).toBe(200);
    expect(rowFor(kind)?.status).toBe('active');
    expect(await refund(200)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
    // Stripe keeps a refunded subscription active; its next update must not re-grant, nor a
    // late re-delivery of the invoice the refund reversed, nor a $0 invoice.
    expect(await updated(kind, 300)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
    h.subscription = stripeSubscription(kind, 'active');
    expect(await invoicePaid(350, 79_500, 100)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
    expect(await invoicePaid(360, 0)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
  });

  it.each(ALL_KINDS)('%s: a newer paid invoice after the refund is a fresh payment and restores access', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await refund(200)).toBe(200);
    expect(await created(kind, 100)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
    h.subscription = stripeSubscription(kind, 'active');
    expect(await invoicePaid(400, 79_500)).toBe(200);
    expect(rowFor(kind)?.status).toBe('active');
    // A late refund, or a later chargeback, of the older invoice does not take the newer
    // payment's access away.
    expect(await refund(300)).toBe(200);
    expect(rowFor(kind)?.status).toBe('active');
    expect(await dispute(500)).toBe(200);
    expect(rowFor(kind)?.status).toBe('active');
    // A refund of the newest invoice does.
    expect(await refund(600, true, 400)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
  });

  it.each(ALL_KINDS)('%s: a late re-delivery of an older paid invoice does not undo a newer one', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await created(kind, 50)).toBe(200);
    expect(await refund(200)).toBe(200);
    h.subscription = stripeSubscription(kind, 'active');
    expect(await invoicePaid(400, 79_500)).toBe(200);
    expect(await invoicePaid(450, 79_500, 100)).toBe(200);
    // An update after the re-read (which was written as of now) is still written active.
    expect(await updated(kind, NOW_AT + 500)).toBe(200);
    expect(rowFor(kind)?.statusEventAt).toEqual(new Date((T0 + NOW_AT + 500) * 1000));
    expect(rowFor(kind)?.status).toBe('active');
  });

  it.each(ALL_KINDS)('%s: a late chargeback of an older invoice does not undo a newer refund', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await created(kind, 50)).toBe(200);
    h.subscription = stripeSubscription(kind, 'active');
    expect(await invoicePaid(410, 79_500, 400)).toBe(200);
    expect(await refund(500, true, 400)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
    expect(await dispute(600, 100)).toBe(200);
    expect(await updated(kind, 700)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
  });

  it.each(ALL_KINDS)('%s: a newer invoice paid BEFORE the older refund arrives keeps access', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await created(kind, 50)).toBe(200);
    h.subscription = stripeSubscription(kind, 'active');
    expect(await invoicePaid(400, 79_500)).toBe(200);
    expect(await refund(450)).toBe(200);
    expect(rowFor(kind)?.status).toBe('active');
  });

  it.each(ALL_KINDS)('%s: a fresh payment restores access even after a newer snapshot was blocked', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await created(kind, 50)).toBe(200);
    expect(await refund(200)).toBe(200);
    // Stripe keeps sending updates; each is written blocked and stamped with its event time.
    expect(await updated(kind, 500)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
    h.subscription = stripeSubscription(kind, 'active');
    expect(await invoicePaid(450, 79_500, 400)).toBe(200);
    expect(rowFor(kind)?.status).toBe('active');
  });

  it.each(ALL_KINDS)('%s: the refund lands between the "created" handler starting and its write', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    // The marker must be read on the write's own transaction, not before it.
    db.beforeNextTx = () => refund(200);
    expect(await created(kind, 100)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
  });

  it.each(ALL_KINDS)('%s: an ended subscription never cancels the row of the subscription the owner moved to', async (kind) => {
    const NEW_SUB = 'sub_gp641_new';
    db.tables[KINDS[kind].table].push({
      ...KINDS[kind].reservation,
      status: 'active',
      stripeSubscriptionId: NEW_SUB,
      statusEventAt: new Date((T0 + 50) * 1000),
    });
    expect(await refund(200)).toBe(200);
    expect(await updated(kind, 300)).toBe(200);
    expect(rowFor(kind)?.stripeSubscriptionId).toBe(NEW_SUB);
    expect(rowFor(kind)?.status).toBe('active');
  });

  it.each(ALL_KINDS)('%s control: a partial refund never removes access', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await refund(200, false)).toBe(200);
    expect(await created(kind, 100)).toBe(200);
    expect(rowFor(kind)?.status).toBe('active');
  });
});

describe('GP-641: what a won dispute lifts, and what it does not', () => {
  const kind: Kind = 'individual';
  beforeEach(() => {
    db.tables.lmsSubscription.push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    h.subscription = stripeSubscription(kind, 'active');
  });

  it('restores access even when a snapshot newer than the win was written while disputed', async () => {
    expect(await dispute(200)).toBe(200);
    expect(await updated(kind, 350)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
    expect(await disputeWon(300)).toBe(200);
    expect(rowFor(kind)?.status).toBe('active');
  });

  it('a delayed dispute-created older than the win does not take access away again', async () => {
    expect(await created(kind, 100)).toBe(200);
    expect(await disputeWon(300)).toBe(200);
    expect(await dispute(200)).toBe(200);
    expect(rowFor(kind)?.status).toBe('active');
  });

  it('a won dispute does not lift a refund', async () => {
    expect(await refund(200)).toBe(200);
    expect(await created(kind, 100)).toBe(200);
    expect(await disputeWon(300)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
  });

  it('a newer paid invoice does not lift a deletion', async () => {
    expect(await deleted(kind, 200)).toBe(200);
    expect(await created(kind, 100)).toBe(200);
    expect(await invoicePaid(400, 79_500)).toBe(200);
    expect(rowFor(kind)?.status).toBe('canceled');
  });
});

describe('GP-641: a cancellation delivered before its owner can be matched still sticks', () => {
  it('individual: "deleted" before the member account matches, then "created" once it does', async () => {
    // At delete time the subscription carries no CARSI user id and the customer has no email.
    db.tables.lmsUser = [];
    expect(await deleted('individual', 200, { carsi_user_id: '' })).toBe(200);
    db.tables.lmsUser = [{ id: USER, email: 'member@gp641-test.invalid' }];
    expect(await created('individual', 100)).toBe(200);
    expect(rowFor('individual')?.status).toBe('canceled');
  });

  it('team: "deleted" before the team matches, then "created" once it does', async () => {
    expect(await deleted('team', 200, { carsi_team_id: '' })).toBe(200);
    expect(await created('team', 100)).toBe(200);
    expect(rowFor('team')?.status).toBe('canceled');
  });
});

describe('GP-641: a blocked row gives no access, on every entitlement reader', () => {
  const FUTURE = new Date((T0 + 365 * 86_400) * 1000);
  const NOW = new Date((T0 + 1_000) * 1000);
  it.each(ALL_KINDS)('%s: refunded row with a paid-through period end is not entitled', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await created(kind, 50)).toBe(200);
    expect(await refund(200)).toBe(200);
    const row = rowFor(kind)!;
    expect(row.currentPeriodEnd).toEqual(FUTURE);
    const input = { status: row.status as string, currentPeriodEnd: row.currentPeriodEnd as Date };
    const decide = kind === 'coaching' ? decideCoachingPortalEntitlement : decideMembershipEntitlement;
    expect(decide(input, NOW).entitled).toBe(false);
  });
});

describe('GP-641: a reversed subscription with no owner yet is owed nothing', () => {
  it('team: a chargeback landing between the hold check and its record leaves nothing open', async () => {
    db.beforeNextTx = () => dispute(200);
    expect(await created('team', 100, { carsi_team_id: '' })).toBe(200);
    const open = db.tables.stripeWebhookEvent.filter(
      (r) => String(r.id).startsWith('unfulfilled-payment:') && r.processedAt == null,
    );
    expect(open).toEqual([]);
  });

  it.each(['team', 'org'] as Kind[])('%s: no retry loop and nothing left on the unfulfilled list', async (kind) => {
    expect(await refund(200)).toBe(200);
    // The owner cannot be matched yet (no team metadata, no row).
    expect(await created(kind, 100, { carsi_team_id: '' })).toBe(200);
    const open = db.tables.stripeWebhookEvent.filter(
      (r) => String(r.id).startsWith('unfulfilled-payment:') && r.processedAt == null,
    );
    expect(open).toEqual([]);
  });
});

/** Stripe's answer for the subscription's latest invoice (what the access check re-reads). */
function withLatestInvoice(kind: Kind, id: string, createdAt: number, amountPaid = 79_500, status = 'paid') {
  h.subscription = {
    ...stripeSubscription(kind, 'active'),
    latest_invoice: { id, object: 'invoice', created: T0 + createdAt, status, amount_paid: amountPaid },
  };
}

const FUTURE_END = new Date((T0 + 365 * 86_400) * 1000);
const AT_NOW = new Date((T0 + NOW_AT) * 1000);
function entitled(kind: Kind): boolean {
  const row = rowFor(kind)!;
  const input = { status: row.status as string, currentPeriodEnd: row.currentPeriodEnd as Date };
  const decide = kind === 'coaching' ? decideCoachingPortalEntitlement : decideMembershipEntitlement;
  return decide(input, AT_NOW).entitled;
}

describe('GP-641 sweep 2: invoices are told apart by id, never by their creation second', () => {
  it.each(ALL_KINDS)('%s: a different invoice paid in the same second as a refunded one restores access', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await created(kind, 50)).toBe(200);
    expect(await refund(200, true, 100, 'in_A')).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
    withLatestInvoice(kind, 'in_B', 100);
    expect(await invoicePaid(300, 79_500, 100, 'in_B')).toBe(200);
    expect(rowFor(kind)?.status).toBe('active');
  });

  it.each(ALL_KINDS)('%s: a refund of an older invoice in the same second as the paid one keeps access', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await created(kind, 50)).toBe(200);
    withLatestInvoice(kind, 'in_B', 100);
    expect(await invoicePaid(150, 79_500, 100, 'in_B')).toBe(200);
    expect(await refund(200, true, 100, 'in_A')).toBe(200);
    expect(rowFor(kind)?.status).toBe('active');
  });

  it.each(ALL_KINDS)('%s control: the same invoice paid and then refunded stays blocked', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await created(kind, 50)).toBe(200);
    withLatestInvoice(kind, 'in_A', 100);
    expect(await invoicePaid(150, 79_500, 100, 'in_A')).toBe(200);
    expect(await refund(200, true, 100, 'in_A')).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
    expect(await updated(kind, 300)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
  });

  it.each(ALL_KINDS)('%s: the latest invoice charged back stays blocked when another invoice of that second was refunded', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await created(kind, 50)).toBe(200);
    withLatestInvoice(kind, 'in_Y', 100);
    expect(await refund(200, true, 100, 'in_X')).toBe(200);
    expect(await dispute(250, 100, 'in_Y')).toBe(200);
    expect(await updated(kind, 300)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
  });

  it.each(ALL_KINDS)('%s: a won dispute of one invoice does not lift the dispute of another in the same second', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await created(kind, 50)).toBe(200);
    withLatestInvoice(kind, 'in_A', 100);
    expect(await dispute(200, 100, 'in_A')).toBe(200);
    expect(await disputeWon(300, 100, 'in_B')).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
  });
});

describe('GP-641 sweep 2: a paid invoice not delivered yet does not lock the member out', () => {
  it.each(ALL_KINDS)('%s: an older invoice refunded before the newer invoice.paid arrives keeps access', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await created(kind, 50)).toBe(200);
    withLatestInvoice(kind, 'in_A', 100);
    expect(await invoicePaid(110, 79_500, 100, 'in_A')).toBe(200);
    // Stripe has already issued and charged the newer invoice; its invoice.paid is still queued.
    withLatestInvoice(kind, 'in_B', 400);
    expect(await refund(450, true, 100, 'in_A')).toBe(200);
    expect(rowFor(kind)?.status).toBe('active');
  });

  it.each(ALL_KINDS)('%s control: the newer invoice still open (not paid) leaves access blocked', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await created(kind, 50)).toBe(200);
    withLatestInvoice(kind, 'in_A', 100);
    expect(await invoicePaid(110, 79_500, 100, 'in_A')).toBe(200);
    withLatestInvoice(kind, 'in_B', 400, 0, 'open');
    expect(await refund(450, true, 100, 'in_A')).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
  });

  it.each(ALL_KINDS)('%s: a refund recorded after Stripe was read is not overruled by that read', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await created(kind, 50)).toBe(200);
    expect(await refund(200, true, 100, 'in_A')).toBe(200);
    // The write below reads Stripe first: the latest invoice is B, paid.
    withLatestInvoice(kind, 'in_B', 300);
    // Before its transaction opens, a newer invoice C is issued and refunded.
    db.beforeNextTx = async () => {
      withLatestInvoice(kind, 'in_C', 350);
      await refund(360, true, 350, 'in_C');
    };
    expect(await updated(kind, 400)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
  });

  it.each(ALL_KINDS)('%s: a Stripe read that never settles leaves access blocked', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await created(kind, 50)).toBe(200);
    expect(await refund(200, true, 100, 'in_A')).toBe(200);
    // Stripe keeps answering with an invoice older than the one the ledger has recorded.
    withLatestInvoice(kind, 'in_OLD', 10);
    expect(await updated(kind, 400)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
  });
});

describe('GP-641 sweep 2: every step that changes the decision rewrites the rows to it', () => {
  it.each(ALL_KINDS)('%s: dispute, then deletion, then dispute won leaves the deletion status (canceled)', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await created(kind, 100)).toBe(200);
    expect(await dispute(150)).toBe(200);
    expect(await deleted(kind, 200)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
    expect(await disputeWon(300)).toBe(200);
    expect(rowFor(kind)?.status).toBe('canceled');
    expect(rowFor(kind)?.currentPeriodEnd).toEqual(FUTURE_END);
    // Coaching keeps its paid-through window on a deletion; the memberships read canceled as lapsed.
    expect(entitled(kind)).toBe(kind === 'coaching');
  });

  it.each(ALL_KINDS)('%s: refund, then deletion, then a newer paid invoice leaves the deletion status (canceled)', async (kind) => {
    db.tables[KINDS[kind].table].push({ ...KINDS[kind].reservation, stripeSubscriptionId: null });
    expect(await created(kind, 100)).toBe(200);
    expect(await refund(150)).toBe(200);
    expect(await deleted(kind, 200)).toBe(200);
    expect(rowFor(kind)?.status).toBe('unpaid');
    h.subscription = stripeSubscription(kind, 'canceled');
    expect(await invoicePaid(400, 79_500)).toBe(200);
    expect(rowFor(kind)?.status).toBe('canceled');
    expect(entitled(kind)).toBe(kind === 'coaching');
  });
});
