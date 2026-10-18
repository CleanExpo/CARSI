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
}));

vi.mock('@/lib/server/auth-from-request', () => ({ getSessionClaimsFromRequest: mocks.claims }));
vi.mock('@/lib/prisma', () => {
  const tx = {
    lmsCourseReview: { update: mocks.reviewUpdate },
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
  mocks.claims.mockResolvedValue({ sub: 'admin-1', role: 'admin' });
  mocks.courseFind.mockResolvedValue(COURSE);
  mocks.reviewFindFirst.mockResolvedValue({ id: 'rev-1', rating: 1, title: 't', body: 'b' });
  mocks.reviewUpdate.mockResolvedValue({
    rating: 1,
    title: 'Too basic',
    body: 'Not what I needed.',
    course: { id: 'course-1', slug: 'water-damage', title: 'Water Damage Restoration' },
  });
  mocks.eventCreate.mockResolvedValue({});
  mocks.reviewFindMany.mockResolvedValue([]);
  mocks.userFind.mockResolvedValue({ fullName: 'Sam Rivers' });
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
    expect(mocks.reviewUpdate.mock.calls[0]![0]).toMatchObject({ where: { id: 'rev-1' }, data: { isPublished: false } });
    expect(mocks.eventCreate).toHaveBeenCalledTimes(1);
    expect(mocks.eventCreate.mock.calls[0]![0]).toEqual({
      data: {
        reviewId: 'rev-1',
        // Snapshots so the audit survives deletion of the review or course.
        reviewRef: 'rev-1',
        courseRef: 'course-1',
        courseSlug: 'water-damage',
        courseTitle: 'Water Damage Restoration',
        action: 'hide',
        reason: 'spam_or_fake',
        // The actor is the session user, never the body's `actor_id`.
        actorId: 'admin-1',
        ratingAtAction: 1,
        contentSha256: reviewContentSha256('Too basic', 'Not what I needed.'),
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

  it('moderators see the latest hide reason and an edit-after-hide flag', async () => {
    mocks.reviewFindMany.mockResolvedValue([
      { id: 'r1', rating: 1, title: 'New text', body: 'edited', reply: null, repliedAt: null, isPublished: false,
        createdAt: new Date('2026-10-02'), student: { fullName: 'Jo' },
        moderationEvents: [{ action: 'hide', reason: 'offensive', contentSha256: reviewContentSha256('Old', 'old'), ratingAtAction: 1,
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
