import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-764 rebuilt on main: where the amount-paid record meets what main already does.
 *
 *  - GP-761 (#1333): the confirm route keeps the retrieved paid session for the tax invoice
 *    (`payment.checkout`), and a session that is not paid is refused. GP-764 reads the same
 *    session for the amount it records. Both must come from the one session.
 *  - GP-641 (#1345): subscription refunds and chargebacks are stored in the SAME ledger table,
 *    with the same `payment-reversed:` id prefix and `payment_reversed:` type prefix that admin
 *    revenue reads (`reversedCheckoutSessionIds`). A subscription reversal must never mark a
 *    course checkout reversed, and a course refund must still take its recorded dollars out.
 *
 * Driven through the real confirm and Stripe webhook routes, the real seat step and the real
 * admin revenue reader over one stateful fake database. Only the enrolment writer, learner
 * resolution, Stripe and outbound side effects are faked. Partial refunds are the control: they
 * never reverse, so a test that passes because nothing is ever counted would fail it.
 */

type Row = Record<string, unknown>;

const USER = '11111111-1111-4111-8111-111111111111';
const EMAIL = 'buyer@gp764-interplay.invalid';
const COURSE_ID = '22222222-2222-4222-8222-222222222222';
const SLUG = 'gp764-interplay-course';
const SUB = 'sub_gp764_interplay';
const T0 = 1_790_000_000;

const db = vi.hoisted(() => ({ tables: {} as Record<string, Array<Record<string, unknown>>>, seq: 0 }));
const h = vi.hoisted(() => ({
  event: null as Record<string, unknown> | null,
  sessions: new Map<string, Record<string, unknown>>(),
  // payment intent id -> checkout sessions Stripe lists for it (course purchases only).
  sessionsByIntent: new Map<string, string[]>(),
  // payment intent id -> invoice (subscription charges only).
  invoiceByIntent: new Map<string, Record<string, unknown>>(),
  welcomeEmails: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/lib/api/stripe', () => ({
  constructWebhookEvent: () => h.event,
  resolveStripeWebhookSecret: () => 'whsec_test_placeholder',
  isVerifiedStripeEventShape: () => true,
  webhookLivemodeMatchesApiKey: () => true,
  getStripeClient: () => ({
    checkout: {
      sessions: {
        retrieve: vi.fn(async (id: string) => {
          const s = h.sessions.get(id);
          if (!s) throw new Error('No such checkout.session');
          return s;
        }),
        list: vi.fn(async (a: { payment_intent: string }) => ({
          data: (h.sessionsByIntent.get(a.payment_intent) ?? []).map((id) => ({ id })),
        })),
      },
    },
    paymentIntents: {
      retrieve: vi.fn(async (id: string) => ({ id, invoice: h.invoiceByIntent.get(id) ?? null })),
    },
    // The reversed invoice is the member's latest payment, so GP-641 decides "blocked" on its
    // normal path (not the fail-closed path a failed Stripe read takes).
    subscriptions: {
      retrieve: vi.fn(async (id: string) => ({
        id,
        object: 'subscription',
        status: 'active',
        latest_invoice: {
          id: 'in_gp764_sub',
          created: 1_790_000_005,
          status: 'paid',
          amount_paid: 79_500,
        },
      })),
    },
    customers: { retrieve: vi.fn(async () => ({ id: 'cus_gp764', email: null })) },
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
vi.mock('@/lib/server/ga4-measurement-protocol', () => ({ sendGa4PurchaseEvent: vi.fn(async () => {}) }));
vi.mock('@/lib/server/partner-referral-sales', () => ({ recordPartnerReferralSale: vi.fn(async () => {}) }));
vi.mock('@/lib/server/lms-auth', () => ({
  sessionClaimsForUserId: vi.fn(async (id: string) => ({ sub: id, email: EMAIL, role: null })),
}));
vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: vi.fn(async () => ({ sub: USER, email: EMAIL, role: null })),
}));
vi.mock('@/lib/server/enrollment-email', () => ({
  sendEnrollmentWelcomeEmail: vi.fn(async (args: Record<string, unknown>) => {
    h.welcomeEmails.push(args);
  }),
}));
vi.mock('@/lib/server/crm-enrollment-notify', () => ({ notifyCrmEnrollmentCreated: vi.fn() }));
vi.mock('@/lib/server/sentry', () => ({ captureServerError: vi.fn(async () => {}) }));
vi.mock('@/lib/server/first-lesson', () => ({ getFirstLessonLearnPath: vi.fn(async () => null) }));
vi.mock('@/lib/server/teams', () => ({
  createUniqueTeamSlug: vi.fn(async () => `team-${(db.seq += 1)}`),
}));
// The enrolment writer has its own tests; here it only has to hold one row per learner/course.
vi.mock('@/lib/server/enrollment-service', () => ({
  prepareEnrolment: vi.fn(async (claims: { sub: string }, _slug: string, paymentReference: string) => ({
    studentId: claims.sub,
    courseId: COURSE_ID,
    paymentReference,
    prerequisiteGated: false,
    refusal: null,
  })),
  issuePreparedEnrolment: vi.fn(
    async (_tx: unknown, e: { studentId: string; courseId: string; paymentReference: string }) => {
      const rows = (db.tables.lmsEnrollment ??= []);
      const held = rows.find((r) => r.studentId === e.studentId && r.courseId === e.courseId);
      if (held && held.status === 'active') return 'already_enrolled';
      db.seq += 1;
      rows.push({ id: `e-${db.seq}`, ...e, status: 'active', revokedReason: null });
      return { enrollmentId: `e-${db.seq}`, courseId: e.courseId };
    },
  ),
}));

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
    // A compound unique key (`studentId_courseId: { studentId, courseId }`).
    if (
      cond && typeof cond === 'object' && !(cond instanceof Date) &&
      Object.keys(cond).length > 0 && Object.keys(cond).every((x) => !OPS.has(x))
    ) {
      return match(row, cond as Row);
    }
    return cmp(row[k], cond);
  });
}

vi.mock('@/lib/prisma', () => {
  function model(name: string) {
    const t = () => (db.tables[name] ??= []);
    const copy = (r: Row | undefined) => (r ? { ...r } : null);
    const create = (data: Row) => {
      if (name === 'lmsCheckoutPayment' && t().some((r) => r.checkoutSessionId === data.checkoutSessionId)) {
        throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      }
      const row: Row = { id: `${name}-${(db.seq += 1)}`, ...data };
      t().push(row);
      return { ...row };
    };
    return {
      findUnique: async (a: { where: Row }) => copy(t().find((x) => match(x, a.where))),
      findFirst: async (a?: { where?: Row }) => copy(t().find((x) => match(x, a?.where))),
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
      aggregate: async (a: { where: Row }) => ({
        _sum: {
          seatLimit: t()
            .filter((x) => match(x, a.where))
            .reduce((s, x) => s + ((x.seatLimit as number) ?? 0), 0),
        },
      }),
    };
  }
  const client: Row = new Proxy({} as Row, {
    get(target, prop: string) {
      if (prop === 'then') return undefined;
      if (prop === '$transaction') {
        return async (fn: (tx: unknown) => Promise<unknown>) => fn(client);
      }
      return (target[prop] ??= model(prop));
    },
  });
  return { prisma: client };
});
vi.mock('@/lib/server/db-tx', async () => {
  const { prisma } = await import('@/lib/prisma');
  return { runSerializable: (fn: (tx: unknown) => Promise<unknown>) => fn(prisma) };
});

const { POST: webhookPOST } = await import('../../../app/api/lms/webhooks/stripe/route');
const { POST: confirmPOST } = await import('../../../app/api/lms/enrollments/confirm/route');
const { loadCheckoutPaymentsForRevenue } = await import('@/lib/admin/admin-checkout-payments');

function paidSession(id: string, amount: number, extra: Row = {}): Row {
  const s: Row = {
    id,
    object: 'checkout.session',
    payment_status: 'paid',
    amount_total: amount,
    currency: 'aud',
    created: T0 + 10,
    customer_email: EMAIL,
    customer_details: { email: EMAIL },
    metadata: { course_slug: SLUG, purchase_mode: 'self', student_id: USER },
    ...extra,
  };
  h.sessions.set(id, s);
  return s;
}

let evt = 0;
async function deliver(type: string, at: number, object: Row): Promise<number> {
  evt += 1;
  h.event = { id: `evt_gp764_${evt}`, object: 'event', livemode: false, type, created: T0 + at, data: { object } };
  const res = await webhookPOST(
    new Request('https://carsi.com.au/api/lms/webhooks/stripe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': `t=${T0},v1=${'ab'.repeat(32)}` },
      body: '{}',
    }) as never,
  );
  return res.status;
}

/** A charge refund on a course checkout's payment intent (path 1 of the webhook). */
function refundCourse(at: number, sessionId: string, full = true) {
  const pi = `pi_${sessionId}`;
  h.sessionsByIntent.set(pi, [sessionId]);
  return deliver('charge.refunded', at, {
    id: `ch_${sessionId}`,
    payment_intent: pi,
    amount: 49_900,
    amount_refunded: full ? 49_900 : 10_000,
    currency: 'aud',
  });
}

/** A full refund or chargeback of a subscription invoice (path 2, GP-641). */
function reverseSubscription(type: 'charge.refunded' | 'charge.dispute.created', at: number) {
  const pi = 'pi_gp764_subscription';
  h.invoiceByIntent.set(pi, {
    id: 'in_gp764_sub',
    created: T0 + 5,
    parent: { subscription_details: { subscription: SUB } },
  });
  return deliver(
    type,
    at,
    type === 'charge.refunded'
      ? { id: 'ch_sub', payment_intent: pi, amount: 79_500, amount_refunded: 79_500, currency: 'aud' }
      : { id: 'dp_sub', payment_intent: pi, amount: 79_500, currency: 'aud', status: 'needs_response' },
  );
}

const confirm = (sessionId: string) =>
  confirmPOST(
    new NextRequest('https://carsi.com.au/api/lms/enrollments/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    }),
  );

const payments = () => db.tables.lmsCheckoutPayment ?? [];
const revenue = () =>
  loadCheckoutPaymentsForRevenue([USER], (db.tables.lmsEnrollment ?? []) as never);

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date((T0 + 1_000) * 1000));
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_placeholder';
  process.env.STRIPE_SECRET_KEY = 'gp764-test-placeholder-not-a-key';
  process.env.DATABASE_URL = 'postgresql://offline.invalid/test';
  db.seq = 0;
  db.tables = {
    lmsUser: [{ id: USER, email: EMAIL }],
    lmsEnrollment: [],
    lmsCheckoutPayment: [],
    stripeWebhookEvent: [],
    partnerReferralSale: [],
    lmsSubscription: [{ id: 'sub-row-1', userId: USER, stripeSubscriptionId: SUB, status: 'active' }],
  };
  h.sessions.clear();
  h.sessionsByIntent.clear();
  h.invoiceByIntent.clear();
  h.welcomeEmails = [];
});

describe('GP-761 x GP-764: the confirm route reads the tax invoice and the amount from one paid session', () => {
  it('records Stripe amount_total and sends the invoice from the same session', async () => {
    const session = paidSession('cs_test_confirm_paid', 49_900);

    const res = await confirm('cs_test_confirm_paid');

    expect(res.status).toBe(200);
    expect(payments()).toEqual([
      expect.objectContaining({
        checkoutSessionId: 'cs_test_confirm_paid',
        studentId: USER,
        amountTotalCents: 49_900,
        currency: 'aud',
        purchaseMode: 'self',
        seatCount: 1,
      }),
    ]);
    expect((payments()[0].paidAt as Date).getTime()).toBe((T0 + 10) * 1000);
    expect(h.welcomeEmails).toHaveLength(1);
    const payment = h.welcomeEmails[0].payment as { checkout?: unknown } | undefined;
    expect(payment?.checkout).toBe(session);
  });

  it('a session that is not paid is refused: no payment row and no invoice', async () => {
    paidSession('cs_test_confirm_unpaid', 49_900, { payment_status: 'unpaid' });

    const res = await confirm('cs_test_confirm_unpaid');

    expect(res.status).toBe(400);
    expect(payments()).toEqual([]);
    expect(h.welcomeEmails).toEqual([]);
  });

  it('a session refunded before the buyer reaches the success page records nothing', async () => {
    paidSession('cs_test_confirm_refunded', 49_900);
    expect(await refundCourse(5, 'cs_test_confirm_refunded')).toBe(200);

    const res = await confirm('cs_test_confirm_refunded');

    expect(res.status).toBe(403);
    expect(payments()).toEqual([]);
    expect(h.welcomeEmails).toEqual([]);
  });
});

describe('GP-641 x GP-764: course refunds and subscription reversals share one ledger', () => {
  it('webhook fulfilment records the amount; a full course refund takes it out of revenue', async () => {
    paidSession('cs_test_hook_refund', 49_900);
    expect(await deliver('checkout.session.completed', 10, h.sessions.get('cs_test_hook_refund')!)).toBe(200);
    expect(payments()).toEqual([
      expect.objectContaining({ checkoutSessionId: 'cs_test_hook_refund', amountTotalCents: 49_900 }),
    ]);
    expect(await revenue()).toEqual([expect.objectContaining({ checkoutSessionId: 'cs_test_hook_refund', reversed: false })]);

    expect(await refundCourse(20, 'cs_test_hook_refund')).toBe(200);

    expect(await revenue()).toEqual([expect.objectContaining({ checkoutSessionId: 'cs_test_hook_refund', reversed: true })]);
  });

  it('control: a partial course refund leaves the recorded dollars counted', async () => {
    paidSession('cs_test_hook_partial', 49_900);
    expect(await deliver('checkout.session.completed', 10, h.sessions.get('cs_test_hook_partial')!)).toBe(200);

    expect(await refundCourse(20, 'cs_test_hook_partial', false)).toBe(200);

    expect(await revenue()).toEqual([expect.objectContaining({ checkoutSessionId: 'cs_test_hook_partial', reversed: false })]);
  });

  it.each(['charge.refunded', 'charge.dispute.created'] as const)(
    'a subscription %s blocks the membership but never marks a course checkout reversed',
    async (type) => {
      paidSession('cs_test_hook_cross', 49_900);
      expect(await deliver('checkout.session.completed', 10, h.sessions.get('cs_test_hook_cross')!)).toBe(200);

      expect(await reverseSubscription(type, 20)).toBe(200);

      // #1345 ran: the subscription reversal is in the shared ledger and the membership is blocked.
      const ledger = db.tables.stripeWebhookEvent.map((r) => String(r.id));
      expect(ledger.some((id) => id.startsWith('payment-reversed:') && id.includes(SUB))).toBe(true);
      expect(db.tables.lmsSubscription[0].status).not.toBe('active');
      // GP-764 ran: the course payment is still counted.
      expect(await revenue()).toEqual([
        expect.objectContaining({ checkoutSessionId: 'cs_test_hook_cross', amountTotalCents: 49_900, reversed: false }),
      ]);
    },
  );

  it('a course refund never touches the subscription, and only its own checkout is reversed', async () => {
    paidSession('cs_test_hook_a', 49_900);
    paidSession('cs_test_hook_b', 29_900, {
      metadata: { course_slug: 'other-course', purchase_mode: 'self', student_id: USER },
    });
    expect(await deliver('checkout.session.completed', 10, h.sessions.get('cs_test_hook_a')!)).toBe(200);
    expect(await deliver('checkout.session.completed', 11, h.sessions.get('cs_test_hook_b')!)).toBe(200);

    expect(await refundCourse(20, 'cs_test_hook_a')).toBe(200);

    expect(db.tables.lmsSubscription[0].status).toBe('active');
    const byId = Object.fromEntries((await revenue()).map((p) => [p.checkoutSessionId, p.reversed]));
    expect(byId).toEqual({ cs_test_hook_a: true, cs_test_hook_b: false });
  });
});
