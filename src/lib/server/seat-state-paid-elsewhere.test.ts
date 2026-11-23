import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-759 follow-up (Phill 23/11/2026, "Ship step, fix next"; ruling 22/11/2026 "only seats that
 * team paid for"): a learner who already holds the course through another payment joins a team at
 * its full paid limit without taking a seat, through a token invite and through a direct invite.
 * The fake database and entry points are the same as seat-state-races.test.ts.
 *
 * Original header of the shared fake follows.
 *
 * GP-759, Phill's ruling 23/11/2026 ("Fix the design once"): every grant and every reversal of
 * session and team seat state goes through one serialisable step. These are the four races that
 * kept coming back, driven through the real entry points over one stateful fake database:
 *
 *  1. two token invites accepted at once at the last paid seat;
 *  2. a direct invite and a token invite at once at the last paid seat;
 *  3. two direct invites at once at the last paid seat;
 *  4. a refund arriving after fulfilment has started but before its seat block is written
 *     (and the refund delivered before the checkout, which Stripe does not prevent).
 *
 * The fake runs transactions one after another (the outcome Postgres SERIALIZABLE guarantees
 * after a retry). Writes made outside a transaction land a few milliseconds late, so a
 * check-then-write split across statements is seen racing, as it would in production.
 */

type Row = Record<string, unknown>;

const COURSE = { id: 'course-1', slug: 'team-course', title: 'Team course' };
const OTHER_TEAM_COURSE = { id: 'course-1', slug: 'team-course' };

const db = vi.hoisted(() => ({
  tables: {} as Record<string, Array<Record<string, unknown>>>,
  beforeNextTx: null as null | (() => Promise<unknown>),
  seq: 0,
}));
const h = vi.hoisted(() => ({ event: null as Record<string, unknown> | null, refundedSession: '' }));

vi.mock('@/lib/api/stripe', () => ({
  constructWebhookEvent: () => h.event,
  resolveStripeWebhookSecret: () => 'whsec_test_placeholder',
  isVerifiedStripeEventShape: () => true,
  webhookLivemodeMatchesApiKey: () => true,
  getStripeClient: () => ({
    paymentIntents: { retrieve: vi.fn(async () => ({ invoice: null })) },
    checkout: { sessions: { list: vi.fn(async () => ({ data: [{ id: h.refundedSession }] })) } },
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
vi.mock('@/lib/server/subscriptions-flag', () => ({ teamSubscriptionsEnabled: () => true }));
vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: vi.fn(async (req: Request) => {
    const sub = req.headers.get('x-test-user');
    return sub ? { sub, email: `${sub}@seat-race-test.invalid` } : null;
  }),
}));
vi.mock('@/lib/server/lms-auth', () => ({
  sessionClaimsForUserId: vi.fn(async (userId: string) => ({ sub: userId, email: `${userId}@seat-race-test.invalid` })),
  hashPassword: vi.fn(async () => 'hashed-placeholder'),
}));
vi.mock('@/lib/server/lms-user-sync', () => ({ ensureLmsUserFromClaims: vi.fn(async () => {}) }));
vi.mock('@/lib/server/course-catalog-sync', () => ({
  getOrCreateCourseBySlug: vi.fn(async () => ({ id: COURSE.id, slug: COURSE.slug, meta: null })),
}));
vi.mock('@/lib/server/course-prerequisites', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/course-prerequisites')>()),
  findCoursePrerequisiteBlock: vi.fn(async () => null),
}));
vi.mock('@/lib/server/transactional-email', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/transactional-email')>()),
  sendTeamMemberAddedEmail: vi.fn(async () => {}),
  sendEnrollmentWelcomeEmail: vi.fn(async () => {}),
}));
vi.mock('@/lib/server/first-lesson', () => ({ getFirstLessonLearnPath: vi.fn(async () => null) }));
vi.mock('@/lib/server/teams', async (importOriginal) => {
  const teamView = (teamId: string) => {
    const team = db.tables.lmsTeam.find((t) => t.id === teamId);
    if (!team) return null;
    const members = db.tables.lmsTeamMember
      .filter((m) => m.teamId === teamId)
      .map((m) => ({ ...m, user: db.tables.lmsUser.find((u) => u.id === m.userId) ?? { email: `${m.userId}@seat-race-test.invalid` } }));
    return { ...team, members };
  };
  const forUser = async (userId: string) => {
    const m = db.tables.lmsTeamMember.find((x) => x.userId === userId);
    return m ? teamView(m.teamId as string) : null;
  };
  return {
    ...(await importOriginal<typeof import('@/lib/server/teams')>()),
    repairAndGetTeamForUser: vi.fn(forUser),
    getTeamForUser: vi.fn(forUser),
    createUniqueTeamSlug: vi.fn(async () => `team-${(db.seq += 1)}`),
  };
});

const OPS = new Set(['in', 'notIn', 'not', 'gt', 'gte', 'lt', 'lte', 'equals', 'startsWith']);
function cmp(v: unknown, cond: unknown): boolean {
  if (cond === null || typeof cond !== 'object' || cond instanceof Date) {
    if (cond instanceof Date) return v instanceof Date && v.getTime() === cond.getTime();
    return (v ?? null) === cond;
  }
  const c = cond as Record<string, unknown>;
  const keys = Object.keys(c);
  if (!keys.every((k) => OPS.has(k))) return v !== null && typeof v === 'object' && match(v as Row, c);
  return keys.every((k) => {
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
    if (k === 'course') return match(db.tables.lmsCourse.find((c) => c.id === row.courseId) ?? {}, cond as Row);
    if (k.includes('_') && cond && typeof cond === 'object' && !(k in row)) return match(row, cond as Row);
    return cmp(row[k], cond);
  });
}

vi.mock('@/lib/prisma', () => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let chain: Promise<unknown> = Promise.resolve();

  function model(name: string, inTx: boolean) {
    const t = () => db.tables[name];
    const late = async () => {
      if (!inTx) await sleep(5);
    };
    const shape = (r: Row, args?: { include?: Row }) => {
      if (args?.include?.course) return { ...r, course: db.tables.lmsCourse.find((c) => c.id === r.courseId) };
      if (name === 'lmsTeamInvite') return { ...r, team: db.tables.lmsTeam.find((x) => x.id === r.teamId) };
      return { ...r };
    };
    const create = (data: Row) => {
      const row: Row = { id: `${name}-${(db.seq += 1)}`, ...data };
      if (name === 'lmsEnrollment') row.enrolledAt ??= new Date(Date.UTC(2026, 10, 23, 0, db.seq));
      if (name === 'lmsEnrollment' && t().some((e) => e.studentId === row.studentId && e.courseId === row.courseId)) {
        throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      }
      if (name === 'lmsTeam') {
        const members = (data.members as { create?: Row } | undefined)?.create;
        delete row.members;
        if (members) db.tables.lmsTeamMember.push({ teamId: row.id, ...members });
      }
      t().push(row);
      return row;
    };
    return {
      findUnique: async (a: { where: Row; include?: Row }) => {
        const r = t().find((x) => match(x, a.where));
        return r ? shape(r, a) : null;
      },
      findFirst: async (a: { where?: Row; include?: Row }) => {
        const r = t().find((x) => match(x, a?.where));
        if (!r) return null;
        if (name === 'lmsTeamMember' && a?.include?.team) return { ...r, team: db.tables.lmsTeam.find((x) => x.id === r.teamId) };
        return shape(r, a);
      },
      findMany: async (a?: { where?: Row; include?: Row; orderBy?: Row }) => {
        const rows = t().filter((x) => match(x, a?.where)).map((r) => shape(r, a));
        if (a?.orderBy && 'enrolledAt' in a.orderBy) rows.sort((x, y) => (y.enrolledAt as Date).getTime() - (x.enrolledAt as Date).getTime());
        return rows;
      },
      count: async (a?: { where?: Row }) => t().filter((x) => match(x, a?.where)).length,
      aggregate: async (a: { where?: Row }) => ({
        _sum: { seatLimit: t().filter((x) => match(x, a.where)).reduce((s, x) => s + (x.seatLimit as number), 0) },
      }),
      create: async (a: { data: Row }) => {
        await late();
        return create(a.data);
      },
      update: async (a: { where: Row; data: Row }) => {
        await late();
        const r = t().find((x) => match(x, a.where));
        if (!r) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
        Object.assign(r, a.data);
        return { ...r };
      },
      updateMany: async (a: { where: Row; data: Row }) => {
        await late();
        const rows = t().filter((x) => match(x, a.where));
        rows.forEach((r) => Object.assign(r, a.data));
        return { count: rows.length };
      },
      upsert: async (a: { where: Row; create: Row; update: Row }) => {
        await late();
        const r = t().find((x) => match(x, a.where));
        if (r) {
          Object.assign(r, a.update);
          return { ...r };
        }
        return create(a.create);
      },
    };
  }

  const NAMES = ['lmsTeam', 'lmsTeamMember', 'lmsTeamInvite', 'lmsTeamCoursePurchase', 'lmsTeamSubscription', 'lmsEnrollment', 'lmsCourse', 'lmsUser', 'stripeWebhookEvent'];
  function client(inTx: boolean): Row {
    const c: Row = Object.fromEntries(NAMES.map((n) => [n, model(n, inTx)]));
    c.$executeRaw = async () => 0;
    c.$queryRaw = async () => [];
    return c;
  }
  const outer = client(false);
  const txClient = client(true);
  outer.$transaction = async (fn: (tx: unknown) => Promise<unknown>) => {
    if (db.beforeNextTx) {
      const f = db.beforeNextTx;
      db.beforeNextTx = null;
      await f();
    }
    const run = chain.then(() => fn(txClient));
    chain = run.catch(() => {});
    return run;
  };
  return { prisma: outer };
});

const { POST: acceptPost } = await import('../../../app/api/lms/teams/invite/accept/route');
const { POST: webhookPost } = await import('../../../app/api/lms/webhooks/stripe/route');
const { addCourseTeamMemberByEmail } = await import('./team-member-provision');
const { fulfillCourseCheckoutForUser } = await import('./team-course-purchase');
const { findCoursePrerequisiteBlock } = await import('@/lib/server/course-prerequisites');
const { getOrCreateCourseBySlug } = await import('@/lib/server/course-catalog-sync');
const { sendTeamMemberAddedEmail } = await import('@/lib/server/transactional-email');

function accept(userId: string, token: string) {
  return acceptPost(
    new Request('https://carsi.com.au/api/lms/teams/invite/accept', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': userId },
      body: JSON.stringify({ token }),
    }) as never,
  ).then((r) => r.status);
}

function direct(email: string) {
  return addCourseTeamMemberByEmail({
    ownerId: 'owner',
    inviterName: 'Owner',
    email,
    appOrigin: 'https://carsi.com.au',
    courseSlugs: [COURSE.slug],
  }).then(
    () => 200,
    (e: Error) => (e.message === 'COURSE_SEATS_FULL' ? 409 : 500),
  );
}

let evt = 0;
function refund(sessionId: string) {
  evt += 1;
  h.refundedSession = sessionId;
  h.event = {
    id: `evt_gp759_race_${evt}`,
    object: 'event',
    livemode: false,
    type: 'charge.refunded',
    created: 1_790_000_000 + evt,
    data: { object: { payment_intent: `pi_${sessionId}`, amount: 100_000, amount_refunded: 100_000, currency: 'aud' } },
  };
  return webhookPost(
    new Request('https://carsi.com.au/api/lms/webhooks/stripe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': `t=1790000000,v1=${'ab'.repeat(32)}` },
      body: '{}',
    }) as never,
  );
}

function fulfil(sessionId: string) {
  return fulfillCourseCheckoutForUser({
    claims: { sub: 'buyer', email: 'buyer@seat-race-test.invalid' } as never,
    courseSlug: COURSE.slug,
    paymentReference: sessionId,
    purchaseMode: 'team',
    teamSeatCount: 3,
  });
}

/** Live seats the team paid for: the seat references and the blocks' own checkouts. */
function paidHolders(teamId = 'team-1') {
  const refs = [`team:${teamId}`, ...db.tables.lmsTeamCoursePurchase.filter((p) => p.teamId === teamId).map((p) => p.paymentReference)];
  return db.tables.lmsEnrollment.filter((e) => ['active', 'completed'].includes(e.status as string) && refs.includes(e.paymentReference));
}

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_placeholder';
  process.env.DATABASE_URL = 'postgresql://offline.invalid/test';
  db.beforeNextTx = null;
  const expiresAt = new Date(Date.UTC(2099, 0, 1));
  db.tables = {
    lmsCourse: [{ ...COURSE }],
    lmsUser: [{ id: 'owner', email: 'owner@seat-race-test.invalid', fullName: 'Owner' }, { id: 'buyer', email: 'buyer@seat-race-test.invalid', fullName: 'Buyer' },
      { id: 'ua', email: 'ua@seat-race-test.invalid', fullName: null },
      { id: 'ub', email: 'ub@seat-race-test.invalid', fullName: null },
    ],
    // Team one: two paid seats; the owner holds one, one is free.
    lmsTeam: [
      { id: 'team-1', slug: 'team-one', name: 'Team one', ownerId: 'owner', seatLimit: 2, bundleTier: 'course_purchase', courseSlug: COURSE.slug },
      { id: 'team-2', slug: 'team-two', name: 'Team two', ownerId: 'buyer', seatLimit: 0, bundleTier: 'course_purchase', courseSlug: null },
    ],
    lmsTeamMember: [
      { teamId: 'team-1', userId: 'owner', role: 'owner' },
      { teamId: 'team-2', userId: 'buyer', role: 'owner' },
    ],
    lmsTeamCoursePurchase: [{ id: 'p-1', teamId: 'team-1', courseSlug: COURSE.slug, seatLimit: 2, paymentReference: 'cs_test_block', purchasedAt: new Date(Date.UTC(2026, 10, 1)) }],
    lmsTeamSubscription: [],
    lmsTeamInvite: [
      { id: 'i-a', token: 'tok-a', teamId: 'team-1', email: 'ua@seat-race-test.invalid', role: 'member', acceptedAt: null, expiresAt },
      { id: 'i-b', token: 'tok-b', teamId: 'team-1', email: 'ub@seat-race-test.invalid', role: 'member', acceptedAt: null, expiresAt },
    ],
    lmsEnrollment: [
      { id: 'e-owner', studentId: 'owner', courseId: OTHER_TEAM_COURSE.id, status: 'active', paymentReference: 'cs_test_block', enrolledAt: new Date(Date.UTC(2026, 10, 1)), revokedReason: null, statusEventAt: null },
    ],
    stripeWebhookEvent: [],
  };
});

describe('GP-759 follow-up: a member paid for elsewhere joins a full team without a seat', () => {
  beforeEach(() => {
    // Both paid course seats are held (owner and ux); the team's limit is its real paid limit.
    db.tables.lmsEnrollment.push(
      { id: 'e-x', studentId: 'ux', courseId: COURSE.id, status: 'active', paymentReference: 'team:team-1', enrolledAt: new Date(Date.UTC(2026, 10, 2)), revokedReason: null, statusEventAt: null },
      // ua bought the course themselves.
      { id: 'e-ua', studentId: 'ua', courseId: COURSE.id, status: 'active', paymentReference: 'cs_test_own', enrolledAt: new Date(Date.UTC(2026, 10, 3)), revokedReason: null, statusEventAt: null },
    );
    db.tables.lmsTeamMember.push({ teamId: 'team-1', userId: 'ux', role: 'member' });
  });

  it('token invite: joins at the full paid limit, keeps their own enrolment, takes no seat', async () => {
    expect(await accept('ua', 'tok-a')).toBe(200);
    expect(db.tables.lmsTeamMember.map((m) => m.userId)).toContain('ua');
    expect(paidHolders()).toHaveLength(2);
    expect(db.tables.lmsEnrollment.find((e) => e.id === 'e-ua')?.paymentReference).toBe('cs_test_own');
  });

  it('direct invite: joins at the full paid limit, keeps their own enrolment, takes no seat', async () => {
    expect(await direct('ua@seat-race-test.invalid')).toBe(200);
    expect(db.tables.lmsTeamMember.map((m) => m.userId)).toContain('ua');
    expect(paidHolders()).toHaveLength(2);
    expect(db.tables.lmsEnrollment.find((e) => e.id === 'e-ua')?.paymentReference).toBe('cs_test_own');
  });

  it('control: a token invitee without the course is still refused at the full limit', async () => {
    expect(await accept('ub', 'tok-b')).toBe(409);
    expect(db.tables.lmsTeamMember.map((m) => m.userId)).not.toContain('ub');
  });

  it('control: a direct invitee without the course is still refused at the full limit', async () => {
    expect(await direct('dz@seat-race-test.invalid')).toBe(409);
    expect(paidHolders()).toHaveLength(2);
    // No sign-in account is created for someone refused at a full team.
    expect(db.tables.lmsUser.map((u) => u.email)).not.toContain('dz@seat-race-test.invalid');
  });
});

/**
 * Codex round 1 (Kind B): "holds the course" must be the access rule's own answer
 * (`isEnrolmentAccessAllowed`: active or completed), not "any row that is not revoked". A pending
 * or unrecognised own enrolment gives no access, so it must not let a learner past a full team,
 * and where a seat is free the seat is issued over that row (updated, not a second row).
 */
describe.each(['pending', 'on_hold_unrecognised'])('GP-759 follow-up: an own enrolment with status %s does not hold the course', (status) => {
  function ownRow() {
    return { id: 'e-ua', studentId: 'ua', courseId: COURSE.id, status, paymentReference: 'cs_test_own', enrolledAt: new Date(Date.UTC(2026, 10, 3)), revokedReason: null, statusEventAt: null };
  }

  describe('at the full paid limit', () => {
    beforeEach(() => {
      db.tables.lmsEnrollment.push(
        { id: 'e-x', studentId: 'ux', courseId: COURSE.id, status: 'active', paymentReference: 'team:team-1', enrolledAt: new Date(Date.UTC(2026, 10, 2)), revokedReason: null, statusEventAt: null },
        ownRow(),
      );
      db.tables.lmsTeamMember.push({ teamId: 'team-1', userId: 'ux', role: 'member' });
    });

    it('token invite is refused and the learner is not added', async () => {
      expect(await accept('ua', 'tok-a')).toBe(409);
      expect(db.tables.lmsTeamMember.map((m) => m.userId)).not.toContain('ua');
      expect(paidHolders()).toHaveLength(2);
    });

    it('direct invite is refused and the learner is not added', async () => {
      expect(await direct('ua@seat-race-test.invalid')).toBe(409);
      expect(db.tables.lmsTeamMember.map((m) => m.userId)).not.toContain('ua');
      expect(paidHolders()).toHaveLength(2);
    });
  });

  describe('with a paid seat free', () => {
    beforeEach(() => {
      db.tables.lmsEnrollment.push(ownRow());
    });

    it.each([
      ['token invite', () => accept('ua', 'tok-a')],
      ['direct invite', () => direct('ua@seat-race-test.invalid')],
    ])('%s issues the seat over the existing row', async (_label, join) => {
      expect(await join()).toBe(200);
      const rows = db.tables.lmsEnrollment.filter((e) => e.studentId === 'ua' && e.courseId === COURSE.id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id: 'e-ua', status: 'active', paymentReference: 'team:team-1' });
      expect(paidHolders()).toHaveLength(2);
    });
  });
});

/**
 * Codex round 2 (Kind C): at a full pool the direct invite defers its refusal to the seat step.
 * If a seat cannot be prepared (an error, or the course not found), that step has nothing to
 * refuse with, so the deferred refusal must not be lost: the invite is refused, no member row is
 * written and no email is sent.
 */
describe('GP-759 follow-up: a seat that cannot be prepared at a full pool refuses the direct invite', () => {
  beforeEach(() => {
    db.tables.lmsEnrollment.push(
      { id: 'e-x', studentId: 'ux', courseId: COURSE.id, status: 'active', paymentReference: 'team:team-1', enrolledAt: new Date(Date.UTC(2026, 10, 2)), revokedReason: null, statusEventAt: null },
    );
    db.tables.lmsTeamMember.push({ teamId: 'team-1', userId: 'ux', role: 'member' });
    vi.mocked(sendTeamMemberAddedEmail).mockClear();
  });

  it.each([
    ['the preparation throws', () => vi.mocked(findCoursePrerequisiteBlock).mockRejectedValueOnce(new Error('prerequisite read failed'))],
    ['the course is not found', () => vi.mocked(getOrCreateCourseBySlug).mockRejectedValueOnce(new Error('COURSE_NOT_FOUND'))],
  ])('%s: existing account without the course is refused, not added, not emailed', async (_label, plant) => {
    plant();
    expect(await direct('ub@seat-race-test.invalid')).toBe(409);
    expect(db.tables.lmsTeamMember.map((m) => m.userId)).not.toContain('ub');
    expect(paidHolders()).toHaveLength(2);
    expect(vi.mocked(sendTeamMemberAddedEmail)).not.toHaveBeenCalled();
  });

  it.each([
    ['the preparation throws', () => vi.mocked(findCoursePrerequisiteBlock).mockRejectedValueOnce(new Error('prerequisite read failed'))],
    ['the course is not found', () => vi.mocked(getOrCreateCourseBySlug).mockRejectedValueOnce(new Error('COURSE_NOT_FOUND'))],
  ])('control, token invite: %s and the learner is not added', async (_label, plant) => {
    plant();
    expect(await accept('ub', 'tok-b')).not.toBe(200);
    expect(db.tables.lmsTeamMember.map((m) => m.userId)).not.toContain('ub');
    expect(paidHolders()).toHaveLength(2);
  });
});
