import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-764: every paid course checkout records what Stripe actually charged (the session's
 * `amount_total` and `currency`), once per checkout session, inside the seat step. On main the
 * database kept no amount, so admin revenue could only say "price at purchase unknown".
 *
 * Driven through the real `fulfillCourseCheckoutForUser` and the real seat step over a small
 * stateful fake database; the enrolment writer is faked (its own tests cover it).
 */

type Row = Record<string, unknown>;
const db = vi.hoisted(() => ({ tables: {} as Record<string, Row[]>, seq: 0 }));

vi.mock('@/lib/server/db-tx', () => ({
  runSerializable: (fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx()),
}));
vi.mock('@/lib/prisma', () => ({ prisma: fakeTx() }));
vi.mock('@/lib/server/teams', () => ({
  createUniqueTeamSlug: vi.fn(async () => `team-${(db.seq += 1)}`),
}));
vi.mock('@/lib/server/enrollment-service', () => ({
  prepareEnrolment: vi.fn(
    async (claims: { sub: string }, _slug: string, paymentReference: string) => ({
      studentId: claims.sub,
      courseId: 'course-1',
      paymentReference,
      prerequisiteGated: false,
      refusal: null,
    })
  ),
  issuePreparedEnrolment: vi.fn(
    async (_tx: unknown, e: { studentId: string; courseId: string; paymentReference: string }) => {
      const held = db.tables.lmsEnrollment.find(
        (r) => r.studentId === e.studentId && r.courseId === e.courseId
      );
      if (held && held.status === 'active') return 'already_enrolled';
      db.tables.lmsEnrollment.push({ id: `e-${(db.seq += 1)}`, ...e, status: 'active' });
      return { enrollmentId: `e-${db.seq}`, courseId: e.courseId };
    }
  ),
}));
vi.mock('@/lib/server/first-lesson', () => ({ getFirstLessonLearnPath: vi.fn(async () => null) }));

function fakeTx(): Row {
  const where = (row: Row, w: Row) => Object.entries(w).every(([k, v]) => row[k] === v);
  const flat = (w: Row): Row =>
    Object.fromEntries(
      Object.entries(w).flatMap(([k, v]) =>
        v && typeof v === 'object' && !(v instanceof Date) ? Object.entries(v as Row) : [[k, v]]
      )
    );
  const model = (name: string) => ({
    findUnique: async (a: { where: Row }) =>
      db.tables[name].find((r) => where(r, flat(a.where))) ?? null,
    findFirst: async (a: { where: Row; include?: Row }) => {
      const r = db.tables[name].find((x) => where(x, flat(a.where)));
      if (r && name === 'lmsTeamMember' && a.include?.team)
        return { ...r, team: db.tables.lmsTeam.find((t) => t.id === r.teamId) };
      return r ?? null;
    },
    create: async (a: { data: Row }) => {
      const row: Row = { ...a.data };
      if (name === 'lmsTeam') {
        row.id = `team-${(db.seq += 1)}`;
        const member = (a.data.members as { create?: Row } | undefined)?.create;
        delete row.members;
        if (member) db.tables.lmsTeamMember.push({ teamId: row.id, ...member });
      }
      if (
        name === 'lmsCheckoutPayment' &&
        db.tables[name].some((r) => r.checkoutSessionId === row.checkoutSessionId)
      ) {
        throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      }
      db.tables[name].push(row);
      return row;
    },
    update: async (a: { where: Row; data: Row }) => {
      const r = db.tables[name].find((x) => where(x, flat(a.where)))!;
      Object.assign(r, a.data);
      return r;
    },
    aggregate: async (a: { where: Row }) => ({
      _sum: {
        seatLimit: db.tables[name]
          .filter((r) => where(r, a.where))
          .reduce((s, r) => s + (r.seatLimit as number), 0),
      },
    }),
  });
  const names = [
    'lmsEnrollment',
    'lmsCheckoutPayment',
    'stripeWebhookEvent',
    'lmsTeam',
    'lmsTeamMember',
    'lmsTeamCoursePurchase',
    'lmsUser',
  ];
  return Object.fromEntries(names.map((n) => [n, model(n)]));
}

const { fulfillCourseCheckoutForUser } = await import('./team-course-purchase');

const BUYER = { sub: 'buyer', email: 'buyer@example.test' } as never;
const NOV_5 = new Date('2026-11-05T01:00:00.000Z');
const AUD_29900 = { amountTotalCents: 29900, currency: 'aud', sessionCreatedAt: NOV_5 };

function fulfil(
  ref: string,
  extra: Partial<Parameters<typeof fulfillCourseCheckoutForUser>[0]> = {}
) {
  return fulfillCourseCheckoutForUser({
    claims: BUYER,
    courseSlug: 'water',
    paymentReference: ref,
    purchaseMode: 'self',
    amountPaid: AUD_29900,
    ...extra,
  } as Parameters<typeof fulfillCourseCheckoutForUser>[0]);
}

const payments = () => db.tables.lmsCheckoutPayment;

beforeEach(() => {
  db.seq = 0;
  db.tables = {
    lmsEnrollment: [],
    lmsCheckoutPayment: [],
    stripeWebhookEvent: [],
    lmsTeam: [],
    lmsTeamMember: [],
    lmsTeamCoursePurchase: [],
    lmsUser: [{ id: 'buyer', email: 'buyer@example.test' }],
  };
});

describe('GP-764: the amount paid is recorded at fulfilment', () => {
  it('a paid self checkout records its Stripe amount and currency', async () => {
    await fulfil('cs_test_self');

    expect(payments()).toEqual([
      expect.objectContaining({
        checkoutSessionId: 'cs_test_self',
        studentId: 'buyer',
        courseId: 'course-1',
        purchaseMode: 'self',
        seatCount: 1,
        amountTotalCents: 29900,
        currency: 'aud',
        paidAt: NOV_5,
      }),
    ]);
  });

  it('a session fulfilled long after it was paid (a revisited success page) is dated by its purchase', async () => {
    const august = new Date('2026-08-14T03:00:00.000Z');
    await fulfil('cs_test_late', {
      amountPaid: { amountTotalCents: 4900, currency: 'aud', sessionCreatedAt: august },
    });

    expect(payments()[0]).toMatchObject({ paidAt: august });
  });

  it('a replay of the same session (webhook then success page) changes nothing', async () => {
    await fulfil('cs_test_self');
    await fulfil('cs_test_self', {
      amountPaid: { amountTotalCents: 1, currency: 'usd', sessionCreatedAt: null },
    });

    expect(payments()).toHaveLength(1);
    expect(payments()[0]).toMatchObject({ amountTotalCents: 29900, currency: 'aud' });
  });

  it('a team purchase is one record for the whole session, never one per seat', async () => {
    await fulfil('cs_test_team', {
      purchaseMode: 'team',
      teamSeatCount: 5,
      amountPaid: { amountTotalCents: 149500, currency: 'aud', sessionCreatedAt: NOV_5 },
    });

    expect(payments()).toEqual([
      expect.objectContaining({
        checkoutSessionId: 'cs_test_team',
        purchaseMode: 'team',
        seatCount: 5,
        amountTotalCents: 149500,
      }),
    ]);
    expect(db.tables.lmsTeamCoursePurchase).toHaveLength(1);
  });

  it('a buyer who already holds the course through another payment still has this payment recorded', async () => {
    db.tables.lmsEnrollment.push({
      id: 'e-old',
      studentId: 'buyer',
      courseId: 'course-1',
      paymentReference: 'cs_test_old',
      status: 'active',
    });
    const team = await fulfil('cs_test_seats', {
      purchaseMode: 'team',
      teamSeatCount: 3,
      amountPaid: { amountTotalCents: 89700, currency: 'aud', sessionCreatedAt: NOV_5 },
    });

    expect(team.alreadyEnrolled).toBe(true);
    expect(payments().map((p) => p.checkoutSessionId)).toEqual(['cs_test_seats']);
  });

  it('an amount Stripe did not report is stored as unknown, never 0', async () => {
    await fulfil('cs_test_unknown', {
      amountPaid: { amountTotalCents: null, currency: null, sessionCreatedAt: null },
    });

    expect(payments()[0]).toMatchObject({ amountTotalCents: null, currency: null });
    // No session time reported: dated by the fulfilment, never left empty.
    expect(payments()[0].paidAt).toBeInstanceOf(Date);
  });

  it('a refunded session is refused and records nothing', async () => {
    db.tables.stripeWebhookEvent.push({
      id: 'payment-reversed:cs_test_refunded',
      type: 'payment_reversed:refunded',
    });

    await expect(fulfil('cs_test_refunded')).rejects.toThrow('PAYMENT_REVERSED');
    expect(payments()).toEqual([]);
  });

  it('a grant that is not a Stripe checkout (free, discount) records nothing', async () => {
    await fulfil('free', { amountPaid: null });
    await fulfil('discount:d-1', { courseSlug: 'mould', amountPaid: null });

    expect(payments()).toEqual([]);
  });
});

describe('GP-764: reading the amount from the Stripe session', () => {
  it('takes amount_total and currency as Stripe reports them, and anything else as unknown', async () => {
    const { checkoutAmountPaid } = await import('./checkout-payment');

    const created = NOV_5.getTime() / 1000;
    expect(checkoutAmountPaid({ amount_total: 29900, currency: 'aud', created })).toEqual(
      AUD_29900
    );
    expect(checkoutAmountPaid({ amount_total: 0, currency: 'AUD', created })).toEqual({
      amountTotalCents: 0,
      currency: 'aud',
      sessionCreatedAt: NOV_5,
    });
    expect(
      checkoutAmountPaid({ amount_total: null, currency: 'aud', created }).amountTotalCents
    ).toBeNull();
    expect(
      checkoutAmountPaid({ amount_total: -5, currency: 'aud', created }).amountTotalCents
    ).toBeNull();
    expect(
      checkoutAmountPaid({ amount_total: 12.5, currency: 'aud', created }).amountTotalCents
    ).toBeNull();
    expect(
      checkoutAmountPaid({ amount_total: 100, currency: '' as never, created }).currency
    ).toBeNull();
    expect(
      checkoutAmountPaid({ amount_total: 100, currency: 'au$' as never, created }).currency
    ).toBeNull();
    expect(
      checkoutAmountPaid({ amount_total: 100, currency: 'aud', created: 0 }).sessionCreatedAt
    ).toBeNull();
  });
});

describe('GP-764: every fulfilment path passes the paid session amount', () => {
  const ROOT = join(__dirname, '..', '..', '..');
  function files(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === 'generated' || name.startsWith('.')) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) files(full, out);
      else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
    }
    return out;
  }
  /** The argument text of each `fulfillCourseCheckoutForUser({ ... })` call. */
  function calls(text: string): string[] {
    const out: string[] = [];
    const re = /fulfillCourseCheckoutForUser\(\{/g;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      let depth = 1;
      let i = m.index + m[0].length;
      for (; i < text.length && depth > 0; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') depth--;
      }
      out.push(text.slice(m.index, i));
    }
    return out;
  }

  it('the webhook, confirm, guest-complete and activate-purchase calls each pass amountPaid', () => {
    const found = files(join(ROOT, 'app')).flatMap((f) =>
      calls(readFileSync(f, 'utf8')).map((c) => ({
        path: relative(ROOT, f),
        passes: /\bamountPaid(\s*:\s*checkoutAmountPaid\(session\))?\s*,/.test(c),
      }))
    );
    expect(found.map((c) => c.path).sort()).toEqual([
      join('app', 'api', 'lms', 'enrollments', 'confirm', 'route.ts'),
      join('app', 'api', 'lms', 'enrollments', 'guest-complete', 'route.ts'),
      join('app', 'api', 'lms', 'teams', 'activate-purchase', 'route.ts'),
      join('app', 'api', 'lms', 'webhooks', 'stripe', 'route.ts'),
    ]);
    expect(found.filter((c) => !c.passes)).toEqual([]);
  });
});
