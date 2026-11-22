import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-759 (c): refunding a team seat checkout revokes those seats.
 *
 * Drives the real Stripe webhook route with a signed-shape `charge.refunded` event over a
 * stateful fake database. Before the fix only the buyer's own enrolment (keyed by the checkout
 * session) was revoked; the seat block, the team's seat limit and every member seat stayed live.
 * A replayed fulfilment of the refunded session must not put the seats back.
 */

type Purchase = { id: string; teamId: string; courseSlug: string; seatLimit: number; paymentReference: string | null };
type Enrolment = {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
  paymentReference: string;
  enrolledAt: Date;
  revokedReason: string | null;
};

const db = vi.hoisted(() => ({
  purchases: [] as Purchase[],
  enrolments: [] as Enrolment[],
  team: { id: 'team-1', slug: 'team-one', ownerId: 'owner', seatLimit: 0 },
  members: [] as string[],
  refundedSession: '',
}));
const h = vi.hoisted(() => ({ event: null as Record<string, unknown> | null }));

const COURSE = { id: 'course-1', slug: 'team-course' };

vi.mock('@/lib/api/stripe', () => ({
  constructWebhookEvent: () => h.event,
  resolveStripeWebhookSecret: () => 'whsec_test_placeholder',
  isVerifiedStripeEventShape: () => true,
  webhookLivemodeMatchesApiKey: () => true,
  getStripeClient: () => ({
    paymentIntents: { retrieve: vi.fn(async () => ({ invoice: null })) },
    checkout: { sessions: { list: vi.fn(async () => ({ data: [{ id: db.refundedSession }] })) } },
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
}));
vi.mock('@/lib/server/sentry', () => ({ captureServerError: vi.fn(async () => {}) }));
// The buyer's own enrolment is revoked by its checkout session (covered by its own tests).
vi.mock('@/lib/server/stripe-revocation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/stripe-revocation')>()),
  revokeEnrollmentsByPaymentReference: vi.fn(async (ref: string) => {
    let revoked = 0;
    for (const e of db.enrolments) {
      if (e.paymentReference === ref && e.status !== 'revoked') {
        e.status = 'revoked';
        e.revokedReason = 'refunded';
        revoked += 1;
      }
    }
    return { revoked };
  }),
}));

// Spare-invite path: the real member-enrol entry point, with the enrolment writer faked to
// reactivate the row the way the real writer does for a revoked team seat.
const enrolSpy = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/enrollment-service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/enrollment-service')>()),
  enrollStudentInCourse: enrolSpy,
}));
vi.mock('@/lib/server/team-course-slug-db', () => ({
  readTeamCourseSlug: vi.fn(async () => 'team-course'),
  writeTeamCourseSlug: vi.fn(async () => {}),
}));
vi.mock('@/lib/server/lms-auth', () => ({
  sessionClaimsForUserId: vi.fn(async (userId: string) => ({ sub: userId, email: `${userId}@seat-refund-test.invalid` })),
}));

vi.mock('@/lib/prisma', () => {
  const client = {
    lmsTeamCoursePurchase: {
      findMany: vi.fn(async (args: { where: { paymentReference?: string; seatLimit?: { gt: number }; teamId?: string } }) =>
        db.purchases.filter(
          (p) =>
            (args.where.paymentReference === undefined || p.paymentReference === args.where.paymentReference) &&
            (args.where.seatLimit === undefined || p.seatLimit > args.where.seatLimit.gt) &&
            (args.where.teamId === undefined || p.teamId === args.where.teamId),
        ),
      ),
      findFirst: vi.fn(async (args: { where: { paymentReference: string } }) =>
        db.purchases.find((p) => p.paymentReference === args.where.paymentReference) ?? null,
      ),
      update: vi.fn(async (args: { where: { id: string }; data: { seatLimit: number } }) => {
        const p = db.purchases.find((x) => x.id === args.where.id)!;
        p.seatLimit = args.data.seatLimit;
        return p;
      }),
      create: vi.fn(async (args: { data: Omit<Purchase, 'id'> }) => {
        const p = { id: `p-${db.purchases.length + 1}`, ...args.data };
        db.purchases.push(p);
        return p;
      }),
      aggregate: vi.fn(async (args: { where: { teamId: string } }) => ({
        _sum: {
          seatLimit: db.purchases
            .filter((p) => p.teamId === args.where.teamId)
            .reduce((s, p) => s + p.seatLimit, 0),
        },
      })),
    },
    lmsTeam: {
      update: vi.fn(async (args: { data: { seatLimit?: number } }) => {
        if (typeof args.data.seatLimit === 'number') db.team.seatLimit = args.data.seatLimit;
        return db.team;
      }),
    },
    lmsTeamMember: {
      findMany: vi.fn(async () => db.members.map((userId) => ({ userId }))),
      findFirst: vi.fn(async (args: { where: { userId: string } }) =>
        db.members.includes(args.where.userId) ? { userId: args.where.userId, team: db.team } : null,
      ),
    },
    lmsCourse: {
      findUnique: vi.fn(async (args: { where: { slug: string } }) =>
        args.where.slug === COURSE.slug ? { id: COURSE.id } : null,
      ),
    },
    lmsEnrollment: {
      findMany: vi.fn(
        async (args: {
          where: {
            courseId: string;
            studentId?: { in: string[] };
            status: { in: string[] };
            paymentReference?: { in: string[] };
          };
        }) =>
          db.enrolments
            .filter(
              (e) =>
                e.courseId === args.where.courseId &&
                (args.where.studentId === undefined || args.where.studentId.in.includes(e.studentId)) &&
                (args.where.paymentReference === undefined ||
                  args.where.paymentReference.in.includes(e.paymentReference)) &&
                args.where.status.in.includes(e.status),
            )
            .sort((a, b) => b.enrolledAt.getTime() - a.enrolledAt.getTime()),
      ),
      updateMany: vi.fn(async (args: { where: { id: { in: string[] } }; data: Partial<Enrolment> }) => {
        let count = 0;
        for (const e of db.enrolments) {
          if (args.where.id.in.includes(e.id)) {
            Object.assign(e, args.data);
            count += 1;
          }
        }
        return { count };
      }),
    },
    async $transaction(fn: (tx: unknown) => Promise<unknown>) {
      return fn(client);
    },
  };
  return { prisma: client };
});

const { POST } = await import('../../../app/api/lms/webhooks/stripe/route');
const { provisionTeamCoursePurchase, enrollTeamMemberInPurchasedCourse } = await import('./team-course-purchase');

let seq = 0;
async function refund(sessionId: string, amountRefunded = 100_000) {
  seq += 1;
  db.refundedSession = sessionId;
  h.event = {
    id: `evt_gp759_seats_${seq}`,
    object: 'event',
    livemode: false,
    type: 'charge.refunded',
    created: 1_790_000_000 + seq,
    data: { object: { payment_intent: `pi_${sessionId}`, amount: 100_000, amount_refunded: amountRefunded, currency: 'aud' } },
  };
  return POST(
    new Request('https://carsi.com.au/api/lms/webhooks/stripe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': `t=1790000000,v1=${'ab'.repeat(32)}` },
      body: '{}',
    }) as never,
  );
}

const active = () => db.enrolments.filter((e) => e.status === 'active').map((e) => e.studentId);

beforeEach(() => {
  enrolSpy.mockReset();
  enrolSpy.mockImplementation(async (claims: { sub: string }, _slug: string, ref: string) => {
    const row = db.enrolments.find((e) => e.studentId === claims.sub);
    if (row) Object.assign(row, { status: 'active', revokedReason: null, paymentReference: ref });
    return { status: 'reactivated' };
  });
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_placeholder';
  process.env.DATABASE_URL = 'postgresql://offline.invalid/test';
  db.team.seatLimit = 8;
  db.purchases = [
    { id: 'p-1', teamId: 'team-1', courseSlug: COURSE.slug, seatLimit: 5, paymentReference: 'cs_test_first' },
    { id: 'p-2', teamId: 'team-1', courseSlug: COURSE.slug, seatLimit: 3, paymentReference: 'cs_test_second' },
  ];
  db.members = ['owner', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6'];
  db.enrolments = db.members.map((studentId, i) => ({
    id: `e-${studentId}`,
    studentId,
    courseId: COURSE.id,
    status: 'active',
    paymentReference: studentId === 'owner' ? 'cs_test_first' : 'team:team-1',
    enrolledAt: new Date(Date.UTC(2026, 10, 1 + i)),
    revokedReason: null,
  }));
});

describe('GP-759 (c): refunding a team seat purchase revokes those seats', () => {
  it('a refunded top-up block lowers the seat limit and revokes the newest seats it no longer covers', async () => {
    const res = await refund('cs_test_second');

    expect(res.status).toBe(200);
    expect(db.purchases.find((p) => p.id === 'p-2')?.seatLimit).toBe(0);
    expect(db.team.seatLimit).toBe(5);
    // 7 seats held, 5 still paid for: the two newest member seats go; the owner keeps theirs.
    expect(active()).toEqual(['owner', 'm1', 'm2', 'm3', 'm4']);
    expect(db.enrolments.find((e) => e.studentId === 'm6')?.revokedReason).toBe('refunded');
  });

  it('refunding every block revokes every member seat and leaves no seats', async () => {
    await refund('cs_test_second');
    await refund('cs_test_first');

    expect(db.team.seatLimit).toBe(0);
    expect(active()).toEqual([]);
  });

  it('a replayed fulfilment of the refunded session does not restore the seats', async () => {
    await refund('cs_test_second');
    await refund('cs_test_first');

    await provisionTeamCoursePurchase({
      ownerId: 'owner',
      ownerEmail: 'owner@seat-refund-test.invalid',
      ownerName: null,
      courseSlug: COURSE.slug,
      seatCount: 5,
      paymentReference: 'cs_test_first',
    });

    expect(db.team.seatLimit).toBe(0);
    expect(db.purchases.map((p) => p.seatLimit)).toEqual([0, 0]);
  });

  it('control: a partial refund keeps every seat', async () => {
    const res = await refund('cs_test_second', 20_000);

    expect(res.status).toBe(200);
    expect(db.team.seatLimit).toBe(8);
    expect(active()).toHaveLength(7);
  });

  it('control: a replayed refund changes nothing further', async () => {
    await refund('cs_test_second');
    await refund('cs_test_second');

    expect(db.team.seatLimit).toBe(5);
    expect(active()).toEqual(['owner', 'm1', 'm2', 'm3', 'm4']);
  });
  it('a spare invite accepted after the refund does not reissue a refunded member seat', async () => {
    await refund('cs_test_second');
    expect(db.enrolments.find((e) => e.studentId === 'm6')?.status).toBe('revoked');

    await enrollTeamMemberInPurchasedCourse('m6', 'team-1');

    expect(enrolSpy).not.toHaveBeenCalled();
    expect(db.enrolments.find((e) => e.studentId === 'm6')?.status).toBe('revoked');
  });

  it('control: a member re-accepting while a paid seat is free is enrolled', async () => {
    db.enrolments.find((e) => e.studentId === 'm6')!.status = 'revoked';

    await enrollTeamMemberInPurchasedCourse('m6', 'team-1');

    expect(enrolSpy).toHaveBeenCalledTimes(1);
    expect(db.enrolments.find((e) => e.studentId === 'm6')?.status).toBe('active');
  });
  it("Phill's ruling: members paid for elsewhere keep access and never use up this team's paid seats", async () => {
    // m7 holds the course through another team; m8 bought it themselves. Both joined team-1 last.
    db.members.push('m7', 'm8');
    db.enrolments.push(
      { id: 'e-m7', studentId: 'm7', courseId: COURSE.id, status: 'active', paymentReference: 'team:team-2', enrolledAt: new Date(Date.UTC(2026, 10, 20)), revokedReason: null },
      { id: 'e-m8', studentId: 'm8', courseId: COURSE.id, status: 'active', paymentReference: 'cs_test_self_paid', enrolledAt: new Date(Date.UTC(2026, 10, 21)), revokedReason: null },
    );

    await refund('cs_test_second');

    // Team-1 paid seats held: owner + m1..m6 = 7, 5 still paid: only m5 and m6 go.
    expect(active()).toEqual(['owner', 'm1', 'm2', 'm3', 'm4', 'm7', 'm8']);
    expect(db.enrolments.find((e) => e.studentId === 'm7')?.status).toBe('active');
    expect(db.enrolments.find((e) => e.studentId === 'm8')?.status).toBe('active');

    // The same rule decides the seat check: 5 paid seats, 5 team-paid holders, none free.
    await enrollTeamMemberInPurchasedCourse('m6', 'team-1');
    expect(enrolSpy).not.toHaveBeenCalled();
  });

  it("control: with a team-paid seat free, a member is enrolled even though others hold the course elsewhere", async () => {
    db.members.push('m7');
    db.enrolments.push(
      { id: 'e-m7', studentId: 'm7', courseId: COURSE.id, status: 'active', paymentReference: 'team:team-2', enrolledAt: new Date(Date.UTC(2026, 10, 20)), revokedReason: null },
    );
    db.enrolments.find((e) => e.studentId === 'm6')!.status = 'revoked';

    await enrollTeamMemberInPurchasedCourse('m6', 'team-1');

    expect(enrolSpy).toHaveBeenCalledTimes(1);
  });
});
