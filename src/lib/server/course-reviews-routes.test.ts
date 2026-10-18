/**
 * Route-level oracle for the compliant review flow (spec 2026-10-18 D2, D5, D6, D7; AC-2, AC-3).
 *
 * DATABASE_URL is SET for every test: the routes short-circuit to `{ ok: true }` without it,
 * which would make "the audit write happened" vacuously true. Prisma is mocked at the client
 * boundary so the real service code (course-reviews.ts) runs.
 */
import { NextRequest } from 'next/server';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  claims: vi.fn(),
  courseFind: vi.fn(),
  enrolmentFind: vi.fn(),
  reviewFindUnique: vi.fn(),
  reviewFindFirst: vi.fn(),
  reviewFindMany: vi.fn(),
  reviewUpdate: vi.fn(),
  reviewUpsert: vi.fn(),
  eventCreate: vi.fn(),
  userFind: vi.fn(),
  transaction: vi.fn(),
  /** Current database rows the shared resolveCurrentAdmin reads (by lower(email)). */
  lmsRows: new Map<string, { id: string; is_active: boolean; role: string | null }>(),
  roleRows: new Map<string, string[]>(),
  /** Raw SQL in order, prefixed 'TX:' when run inside the interactive transaction. */
  rawSql: [] as string[],
  /** Order of writes inside the transaction (raw locks and Prisma writes). */
  txOps: [] as string[],
  /** The enrolment status upsertReview reads under its row lock (a revocation may have committed). */
  lockedEnrolmentStatus: 'completed' as string | null,
  /** After this many lms_users lookups, the account reads as demoted to student (a concurrent demotion). */
  demoteAfterLookups: null as number | null,
  lmsLookups: 0,
}));

function rawQuery(inTx: boolean) {
  return async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const sql = strings.join('?');
    mocks.rawSql.push(`${inTx ? 'TX:' : ''}${sql}`);
    if (inTx) mocks.txOps.push(sql.includes('FOR NO KEY UPDATE') ? 'lock-enrolment' : 'raw');
    if (sql.includes('"admin_users"')) return [];
    if (sql.includes('"lms_user_roles"')) return (mocks.roleRows.get(String(values[0])) ?? []).map((name) => ({ name }));
    if (sql.includes('"lms_users"')) {
      // By the session's user id (r8), never by its self-asserted email.
      const hit = [...mocks.lmsRows].find(([, row]) => row.id === String(values[0]));
      mocks.lmsLookups += 1;
      const demoted = mocks.demoteAfterLookups !== null && mocks.lmsLookups > mocks.demoteAfterLookups;
      return hit ? [{ ...hit[1], ...(demoted ? { role: 'student' } : {}), email: hit[0] }] : [];
    }
    if (sql.includes('"lms_enrollments"')) return mocks.lockedEnrolmentStatus === null ? [] : [{ status: mocks.lockedEnrolmentStatus }];
    throw new Error(`unexpected raw SQL ${sql}`);
  };
}

vi.mock('@/lib/server/auth-from-request', () => ({ getSessionClaimsFromRequest: mocks.claims }));
vi.mock('@/lib/prisma', () => {
  const tx = {
    $queryRaw: rawQuery(true),
    lmsCourseReview: {
      update: mocks.reviewUpdate,
      upsert: (...a: unknown[]) => {
        mocks.txOps.push('upsert-review');
        return mocks.reviewUpsert(...a);
      },
      // The private (moderator) read: recorded so a test can prove it ran INSIDE the transaction.
      findMany: (...a: unknown[]) => {
        mocks.txOps.push('read-reviews');
        return mocks.reviewFindMany(...a);
      },
    },
    lmsCourseReviewModerationEvent: { create: mocks.eventCreate },
  };
  return {
    prisma: {
      lmsCourse: { findUnique: mocks.courseFind },
      lmsEnrollment: { findUnique: mocks.enrolmentFind },
      lmsCourseReview: {
        findUnique: mocks.reviewFindUnique,
        findFirst: mocks.reviewFindFirst,
        findMany: mocks.reviewFindMany,
        update: mocks.reviewUpdate,
        upsert: mocks.reviewUpsert,
      },
      lmsCourseReviewModerationEvent: { create: mocks.eventCreate },
      lmsUser: { findUnique: mocks.userFind },
      $queryRaw: rawQuery(false),
      $transaction: mocks.transaction.mockImplementation(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    },
  };
});

const { POST: publishPOST } = await import('../../../app/api/lms/courses/[slug]/reviews/[id]/publish/route');
const { GET: reviewsGET, POST: reviewsPOST } = await import('../../../app/api/lms/courses/[slug]/reviews/route');
const { POST: replyPOST } = await import('../../../app/api/lms/courses/[slug]/reviews/[id]/reply/route');
const { REVIEW_HIDE_REASONS, reviewContentSha256 } = await import('./course-reviews');

const COURSE = { id: 'course-1', title: 'Water Damage Restoration', slug: 'water-damage', category: 'restoration' };
const ORIGINAL_DB = process.env.DATABASE_URL;
const ORIGINAL_GOOGLE = process.env.GOOGLE_REVIEW_URL;
const GOOGLE = 'https://g.page/r/CARSIexample123/review';

function req(url: string, body?: unknown): NextRequest {
  return new NextRequest(url, body === undefined ? undefined : { method: 'POST', body: JSON.stringify(body) });
}
function publish(body: unknown) {
  return publishPOST(req('http://localhost/api/lms/courses/water-damage/reviews/rev-1/publish', body), {
    params: Promise.resolve({ slug: 'water-damage', id: 'rev-1' }),
  });
}
function getReviews() {
  return reviewsGET(req('http://localhost/api/lms/courses/water-damage/reviews'), {
    params: Promise.resolve({ slug: 'water-damage' }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = 'postgres://test';
  process.env.GOOGLE_REVIEW_URL = GOOGLE;
  mocks.claims.mockResolvedValue({ sub: 'admin-1', role: 'admin', email: 'moderator@carsi.com.au' });
  mocks.courseFind.mockResolvedValue(COURSE);
  mocks.reviewFindFirst.mockResolvedValue({ id: 'rev-1', rating: 1, title: 't', body: 'b' });
  mocks.reviewUpdate.mockResolvedValue({
    rating: 1,
    title: 'Too basic',
    body: 'Not what I needed.',
    moderationVersion: 7,
    course: { id: 'course-1', slug: 'water-damage', title: 'Water Damage Restoration' },
  });
  mocks.eventCreate.mockResolvedValue({});
  mocks.reviewFindMany.mockResolvedValue([]);
  mocks.userFind.mockResolvedValue({ fullName: 'Sam Rivers' });
  mocks.lmsRows = new Map([['moderator@carsi.com.au', { id: 'admin-1', is_active: true, role: 'admin' }]]);
  mocks.rawSql = [];
  mocks.txOps = [];
  mocks.roleRows = new Map();
  mocks.lockedEnrolmentStatus = 'completed';
  mocks.demoteAfterLookups = null;
  mocks.lmsLookups = 0;
});

afterAll(() => {
  process.env.DATABASE_URL = ORIGINAL_DB;
  process.env.GOOGLE_REVIEW_URL = ORIGINAL_GOOGLE;
});

describe('POST /reviews/:id/publish — a hide needs a recorded reason (AC-3, D2)', () => {
  it.each([
    ['missing reason', { is_published: false }],
    ['unknown reason', { is_published: false, reason: 'negative' }],
    ['label instead of code', { is_published: false, reason: 'Spam or fake' }],
    ['non-string reason', { is_published: false, reason: 1 }],
    ['empty reason', { is_published: false, reason: '' }],
  ])('%s → 400 and zero writes', async (_label, body) => {
    const res = await publish(body);
    expect(res.status).toBe(400);
    expect(mocks.reviewUpdate).not.toHaveBeenCalled();
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });

  it('rejects a reasonless hide even with no database configured (validated before the short-circuit)', async () => {
    delete process.env.DATABASE_URL;
    const res = await publish({ is_published: false });
    expect(res.status).toBe(400);
  });

  it('a valid hide flips the flag and appends an audit event with actor, reason, rating and content hash, in one transaction', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-18T09:00:00.000Z'));
    try {
      const res = await publish({ is_published: false, reason: 'spam_or_fake', actor_id: 'forged-admin' });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, is_published: false, hidden_reason: 'spam_or_fake' });
    } finally {
      vi.useRealTimers();
    }
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.reviewUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.reviewUpdate.mock.calls[0]![0]).toMatchObject({
      where: { id: 'rev-1' },
      data: { isPublished: false, moderationVersion: { increment: 1 } },
    });
    expect(mocks.eventCreate).toHaveBeenCalledTimes(1);
    expect(mocks.eventCreate.mock.calls[0]![0]).toEqual({
      data: {
        reviewId: 'rev-1',
        // Snapshots so the audit survives deletion of the review or course.
        reviewRef: 'rev-1',
        courseRef: 'course-1',
        courseSlug: 'water-damage',
        courseTitle: 'Water Damage Restoration',
        // Decision order = the review's version after the locked increment, never a timestamp.
        sequence: 7,
        action: 'hide',
        reason: 'spam_or_fake',
        // The actor is the verified current admin, never the body's `actor_id`.
        actorId: 'admin-1',
        // Durable actor snapshot: survives deleting the admin's account.
        actorKind: 'lms_admin',
        actorRef: 'admin-1',
        actorEmail: 'moderator@carsi.com.au',
        ratingAtAction: 1,
        contentSha256: reviewContentSha256('Too basic', 'Not what I needed.', 1),
      },
    });
  });

  it('accepts every listed reason', async () => {
    for (const reason of REVIEW_HIDE_REASONS) {
      const res = await publish({ is_published: false, reason });
      expect(res.status).toBe(200);
    }
    expect(mocks.eventCreate).toHaveBeenCalledTimes(REVIEW_HIDE_REASONS.length);
  });

  it('unhide needs no reason but is still recorded with the actor', async () => {
    const res = await publish({ is_published: true });
    expect(res.status).toBe(200);
    expect(mocks.eventCreate.mock.calls[0]![0].data).toMatchObject({ action: 'unhide', reason: null, actorId: 'admin-1' });
  });

  it.each([
    ['r7 reviewer case: demoted to student in the database, still active, old admin token', { id: 'admin-1', is_active: true, role: 'student' }],
    ['deactivated in the database, old admin token', { id: 'admin-1', is_active: false, role: 'admin' }],
    ['no current account for the token email', null],
  ])('%s → 403 and zero writes (the admin is re-checked in the database)', async (_label, row) => {
    if (row) mocks.lmsRows.set('moderator@carsi.com.au', row);
    else mocks.lmsRows.clear();
    for (const body of [{ is_published: false, reason: 'offensive' }, { is_published: true }]) {
      const res = await publish(body);
      expect(res.status).toBe(403);
    }
    expect(mocks.reviewUpdate).not.toHaveBeenCalled();
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });

  it('r7: demoted by removing the admin role row (column still says admin) → 403 and zero writes', async () => {
    mocks.roleRows.set('admin-1', ['student']);
    expect((await publish({ is_published: false, reason: 'offensive' })).status).toBe(403);
    expect(mocks.reviewUpdate).not.toHaveBeenCalled();
    mocks.enrolmentFind.mockResolvedValue(null);
    expect((await (await getReviews()).json()).can_moderate).toBe(false);
  });

  it('r7: a former admin cannot even probe which reviews exist (403 before any lookup)', async () => {
    mocks.lmsRows.set('moderator@carsi.com.au', { id: 'admin-1', is_active: true, role: 'student' });
    mocks.courseFind.mockResolvedValue(null);
    expect((await publish({ is_published: true })).status).toBe(403);
    expect(mocks.courseFind).not.toHaveBeenCalled();
  });

  it.each([
    ['an LMS account self-registered with the ADMIN_EMAIL address (stale admin token)', 'founder@carsi.com.au', { ADMIN_EMAIL: 'founder@carsi.com.au' }],
    ['an LMS student whose address is in ADMIN_PANEL_EMAILS', 'support@carsi.com.au', { ADMIN_PANEL_EMAILS: 'support@carsi.com.au' }],
  ])('r8: refuses %s — 403, zero writes, no hidden reviews', async (_label, email, env) => {
    const saved = { a: process.env.ADMIN_EMAIL, p: process.env.ADMIN_PANEL_EMAILS };
    Object.assign(process.env, env);
    try {
      mocks.claims.mockResolvedValue({ sub: 'lms-x', role: 'admin', email });
      mocks.lmsRows = new Map([[email, { id: 'lms-x', is_active: true, role: 'student' }]]);
      expect((await publish({ is_published: false, reason: 'offensive' })).status).toBe(403);
      expect(mocks.reviewUpdate).not.toHaveBeenCalled();
      mocks.enrolmentFind.mockResolvedValue(null);
      expect((await (await getReviews()).json()).can_moderate).toBe(false);
    } finally {
      for (const [k, v] of [['ADMIN_EMAIL', saved.a], ['ADMIN_PANEL_EMAILS', saved.p]] as const) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });

  it('a demotion that lands after the route check is still caught inside the moderation transaction', async () => {
    // The route's early check passes, then the admin is demoted before the decision's transaction.
    mocks.demoteAfterLookups = 1;
    const res = await publish({ is_published: false, reason: 'offensive' });
    expect(res.status).toBe(403);
    expect(mocks.reviewUpdate).not.toHaveBeenCalled();
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });

  it('r10: a demotion that lands after the reply route\'s check is still caught inside the reply transaction', async () => {
    // The route's early check passes (admin), then the account is demoted before the write's transaction.
    mocks.demoteAfterLookups = 1;
    const res = await replyPOST(req('http://localhost/api/lms/courses/water-damage/reviews/rev-1/reply', { reply: 'Official response' }), {
      params: Promise.resolve({ slug: 'water-damage', id: 'rev-1' }),
    });
    expect(res.status).toBe(403);
    expect(mocks.reviewUpdate).not.toHaveBeenCalled();
  });

  it('the moderator is re-read FOR SHARE inside the moderation transaction, with the shared helper', async () => {
    await publish({ is_published: false, reason: 'offensive' });
    expect(mocks.rawSql.some((q) => /^TX:\s*SELECT "id", "email", "is_active", "role" FROM "lms_users" WHERE "id" = \?::uuid FOR SHARE/.test(q))).toBe(true);
  });

  it('an instructor cannot hide, even with a valid reason (role gate unchanged)', async () => {
    mocks.claims.mockResolvedValue({ sub: 'inst-1', role: 'instructor' });
    const res = await publish({ is_published: false, reason: 'offensive' });
    expect(res.status).toBe(403);
    expect(mocks.reviewUpdate).not.toHaveBeenCalled();
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });
});

describe('GET /reviews — ask and Google link are rating-independent, moderation stays private (D5, D7)', () => {
  it('a completer with no review is asked; the Google link is the validated env value', async () => {
    mocks.claims.mockResolvedValue({ sub: 'learner-1', role: 'student' });
    mocks.enrolmentFind.mockResolvedValue({ status: 'completed', completedAt: new Date('2026-10-01') });
    mocks.reviewFindUnique.mockResolvedValue(null);
    const body = await (await getReviews()).json();
    expect(body.review_ask).toBe(true);
    expect(body.can_review).toBe(true);
    expect(body.google_review_url).toBe(GOOGLE);
    expect(body.reviewer_display_name).toBe('Sam');
  });

  it('a completer of an onboarding programme flagged only by its meta brand is not asked', async () => {
    const { ONBOARDING_BRAND } = await import('@/lib/onboarding/enterprise');
    mocks.courseFind.mockResolvedValue({ ...COURSE, meta: { brand: ONBOARDING_BRAND } });
    mocks.claims.mockResolvedValue({ sub: 'learner-1', role: 'student' });
    mocks.enrolmentFind.mockResolvedValue({ status: 'completed', completedAt: new Date('2026-10-01') });
    mocks.reviewFindUnique.mockResolvedValue(null);
    const body = await (await getReviews()).json();
    expect(body.review_ask).toBe(false);
  });

  it('a learner who has reviewed (even if that review is hidden) is not asked again', async () => {
    mocks.claims.mockResolvedValue({ sub: 'learner-1', role: 'student' });
    mocks.enrolmentFind.mockResolvedValue({ status: 'completed', completedAt: new Date('2026-10-01') });
    mocks.reviewFindUnique.mockResolvedValue({ id: 'rev-hidden', rating: 1, title: null, body: null });
    const body = await (await getReviews()).json();
    expect(body.review_ask).toBe(false);
  });

  it('an active (not completed) learner may review but is not asked', async () => {
    mocks.claims.mockResolvedValue({ sub: 'learner-1', role: 'student' });
    mocks.enrolmentFind.mockResolvedValue({ status: 'active', completedAt: null });
    mocks.reviewFindUnique.mockResolvedValue(null);
    const body = await (await getReviews()).json();
    expect(body.can_review).toBe(true);
    expect(body.review_ask).toBe(false);
  });

  it('a rejected GOOGLE_REVIEW_URL is never sent to the browser', async () => {
    process.env.GOOGLE_REVIEW_URL = 'https://g.page.evil.com/r/abc';
    const body = await (await getReviews()).json();
    expect(body.google_review_url).toBeNull();
  });

  it('a public (anonymous) response carries no moderation fields', async () => {
    mocks.claims.mockResolvedValue(null);
    mocks.reviewFindMany.mockResolvedValue([
      { id: 'r1', rating: 2, title: 'ok', body: 'fine', reply: null, repliedAt: null, isPublished: true,
        createdAt: new Date('2026-10-02'), student: { fullName: null } },
    ]);
    const res = await getReviews();
    const raw = JSON.stringify(await res.json());
    expect(raw).not.toMatch(/hidden_|moderation/);
    // D8: no name on file → neutral label, never anything from the email.
    expect(raw).toContain('CARSI learner');
    // The public query must not even select moderation events.
    expect(mocks.reviewFindMany.mock.calls[0]![0].select).not.toHaveProperty('moderationEvents');
  });

  it('r8 reviewer case: a name a sign-up path derived from the email is never published', async () => {
    mocks.claims.mockResolvedValue(null);
    mocks.reviewFindMany.mockResolvedValue([
      { id: 'r1', rating: 5, title: null, body: null, reply: null, repliedAt: null, isPublished: true, createdAt: new Date('2026-10-02'),
        student: { fullName: 'john.smith.waterdamage', email: 'john.smith.waterdamage@gmail.com' } },
      { id: 'r2', rating: 4, title: null, body: null, reply: null, repliedAt: null, isPublished: true, createdAt: new Date('2026-10-01'),
        student: { fullName: 'John Smith', email: 'john.smith.waterdamage@gmail.com' } },
    ]);
    const body = await (await getReviews()).json();
    expect(body.reviews.map((r: { author: string }) => r.author)).toEqual(['CARSI learner', 'John']);
    expect(JSON.stringify(body)).not.toMatch(/waterdamage|gmail/);
    expect(mocks.reviewFindMany.mock.calls[0]![0].select.student).toEqual({ select: { fullName: true, email: true } });
  });

  it('moderators see the latest hide reason and an edit-after-hide flag', async () => {
    mocks.reviewFindMany.mockResolvedValue([
      { id: 'r1', rating: 1, title: 'New text', body: 'edited', reply: null, repliedAt: null, isPublished: false,
        createdAt: new Date('2026-10-02'), student: { fullName: 'Jo' },
        moderationEvents: [{ action: 'hide', reason: 'offensive', contentSha256: reviewContentSha256('Old', 'old', 1), ratingAtAction: 1,
          createdAt: new Date('2026-10-03T00:00:00.000Z') }] },
      { id: 'r2', rating: 2, title: null, body: null, reply: null, repliedAt: null, isPublished: false,
        createdAt: new Date('2026-09-01'), student: { fullName: 'Al' }, moderationEvents: [] },
    ]);
    const body = await (await getReviews()).json();
    expect(body.reviews[0].moderation).toEqual({
      hidden_reason: 'offensive',
      hidden_at: '2026-10-03T00:00:00.000Z',
      hidden_before_reasons_recorded: false,
      edited_after_hide: true,
    });
    // D3: a legacy hidden row gets no invented reason.
    expect(body.reviews[1].moderation).toMatchObject({ hidden_reason: null, hidden_before_reasons_recorded: true });
    // The latest decision is read by decision sequence, never by timestamp (release-gate r4).
    const select = mocks.reviewFindMany.mock.calls[0]![0].select;
    expect(select.moderationEvents.orderBy).toEqual({ sequence: 'desc' });
    expect(select.moderationEvents.take).toBe(1);
  });
});

describe('hidden reviews and reasons go only to a CURRENT admin (release-gate r7)', () => {
  it('a demoted but still-active user with an old admin token gets the public view only', async () => {
    mocks.lmsRows.set('moderator@carsi.com.au', { id: 'admin-1', is_active: true, role: 'student' });
    mocks.enrolmentFind.mockResolvedValue(null);
    const body = await (await getReviews()).json();
    expect(body.can_moderate).toBe(false);
    expect(mocks.reviewFindMany.mock.calls[0]![0].where).toEqual({ courseId: 'course-1', isPublished: true });
  });

  it('a current admin still sees hidden reviews', async () => {
    mocks.enrolmentFind.mockResolvedValue(null);
    const body = await (await getReviews()).json();
    expect(body.can_moderate).toBe(true);
    expect(mocks.reviewFindMany.mock.calls[0]![0].where).toEqual({ courseId: 'course-1' });
  });

  it('r9: the hidden-review read runs INSIDE the transaction that re-validated the admin, after it', async () => {
    mocks.enrolmentFind.mockResolvedValue(null);
    await getReviews();
    // Re-validation reads (TX:) come first, then the private read on the same transaction client.
    expect(mocks.txOps).toEqual(['raw', 'raw', 'read-reviews']);
    expect(mocks.rawSql.every((q) => q.startsWith('TX:'))).toBe(true);
    expect(mocks.reviewFindMany).toHaveBeenCalledTimes(1);
  });

  it('r9: a refused re-validation never performs the private read (public read only, outside it)', async () => {
    mocks.lmsRows.set('moderator@carsi.com.au', { id: 'admin-1', is_active: true, role: 'student' });
    mocks.enrolmentFind.mockResolvedValue(null);
    const body = await (await getReviews()).json();
    expect(body.can_moderate).toBe(false);
    expect(mocks.txOps).not.toContain('read-reviews');
    expect(mocks.reviewFindMany.mock.calls).toHaveLength(1);
    expect(mocks.reviewFindMany.mock.calls[0]![0].where).toEqual({ courseId: 'course-1', isPublished: true });
  });
});

describe('POST /reviews — who may review, and the response never varies with the rating (D6, D7)', () => {
  function submit(rating: number) {
    return reviewsPOST(req('http://localhost/api/lms/courses/water-damage/reviews', { rating, title: 'Same', body: 'Same' }), {
      params: Promise.resolve({ slug: 'water-damage' }),
    });
  }

  it('a revoked (refunded) enrolment cannot post a review', async () => {
    mocks.claims.mockResolvedValue({ sub: 'learner-1', role: 'student' });
    mocks.enrolmentFind.mockResolvedValue({ status: 'revoked', completedAt: null });
    const res = await submit(5);
    expect(res.status).toBe(403);
    expect(mocks.reviewUpsert).not.toHaveBeenCalled();
  });

  it('the POST response is identical for ratings 1 to 5 (no Google link or other routing rides on it)', async () => {
    mocks.claims.mockResolvedValue({ sub: 'learner-1', role: 'student' });
    mocks.enrolmentFind.mockResolvedValue({ status: 'completed', completedAt: new Date('2026-10-01') });
    mocks.reviewUpsert.mockResolvedValue({});
    const bodies: string[] = [];
    for (const rating of [1, 2, 3, 4, 5]) {
      const res = await submit(rating);
      expect(res.status).toBe(201);
      bodies.push(JSON.stringify(await res.json()));
    }
    expect(new Set(bodies).size).toBe(1);
    expect(bodies[0]).not.toMatch(/google/i);
  });

  it.each(['revoked', 'refunded', 'disputed'])(
    'r8 reviewer case: the enrolment became %s after the route check → 403 and no review is written',
    async (status) => {
      mocks.claims.mockResolvedValue({ sub: 'learner-1', role: 'student' });
      mocks.enrolmentFind.mockResolvedValue({ status: 'completed', completedAt: new Date('2026-10-01') });
      mocks.lockedEnrolmentStatus = status; // committed between the route's check and the lock
      const res = await submit(5);
      expect(res.status).toBe(403);
      expect(mocks.reviewUpsert).not.toHaveBeenCalled();
    }
  );

  it('r8: an enrolment deleted after the route check → 403 and no review is written', async () => {
    mocks.claims.mockResolvedValue({ sub: 'learner-1', role: 'student' });
    mocks.enrolmentFind.mockResolvedValue({ status: 'active', completedAt: null });
    mocks.lockedEnrolmentStatus = null;
    expect((await submit(4)).status).toBe(403);
    expect(mocks.reviewUpsert).not.toHaveBeenCalled();
  });

  it('r7: the review is written in a transaction that first locks the enrolment row (serialised with the email send)', async () => {
    mocks.claims.mockResolvedValue({ sub: 'learner-1', role: 'student' });
    mocks.enrolmentFind.mockResolvedValue({ status: 'completed', completedAt: new Date('2026-10-01') });
    mocks.reviewUpsert.mockResolvedValue({});
    expect((await submit(4)).status).toBe(201);
    expect(mocks.txOps).toEqual(['lock-enrolment', 'upsert-review']);
    expect(mocks.rawSql.some((q) => /^TX:\s*SELECT "status" FROM "lms_enrollments"[\s\S]*"student_id" = \?::uuid AND "course_id" = \?::uuid FOR NO KEY UPDATE/.test(q))).toBe(true);
    expect(mocks.reviewUpsert).toHaveBeenCalledTimes(1);
  });
});

describe('no database → writes fail visibly, never report success (release-gate r3)', () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  async function expectUnavailable(res: Response) {
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).not.toHaveProperty('ok');
    expect(body).not.toHaveProperty('is_published');
    expect(mocks.reviewUpdate).not.toHaveBeenCalled();
    expect(mocks.eventCreate).not.toHaveBeenCalled();
    expect(mocks.reviewUpsert).not.toHaveBeenCalled();
  }

  it('a valid hide returns 503 and stores nothing', async () => {
    await expectUnavailable(await publish({ is_published: false, reason: 'offensive' }));
  });

  it('an unhide returns 503 and stores nothing', async () => {
    await expectUnavailable(await publish({ is_published: true }));
  });

  it('submitting a review returns 503 (the learner is never told it was saved)', async () => {
    mocks.claims.mockResolvedValue({ sub: 'learner-1', role: 'student' });
    await expectUnavailable(
      await reviewsPOST(req('http://localhost/api/lms/courses/water-damage/reviews', { rating: 4, body: 'Own words.' }), {
        params: Promise.resolve({ slug: 'water-damage' }),
      })
    );
  });

  it('publishing a reply returns 503', async () => {
    await expectUnavailable(
      await replyPOST(req('http://localhost/api/lms/courses/water-damage/reviews/rev-1/reply', { reply: 'Thanks.' }), {
        params: Promise.resolve({ slug: 'water-damage', id: 'rev-1' }),
      })
    );
  });
});
