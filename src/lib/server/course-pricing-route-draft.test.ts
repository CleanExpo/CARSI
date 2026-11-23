/**
 * GP-777 / #1262 — `GET /api/lms/courses/[slug]/pricing` must answer only for a live course.
 *
 * "Live" is `status = 'published'` (the canonical rule in `public-courses-list.ts`), NOT the
 * legacy `isPublished` column: about 20 live rows carry `isPublished = false` and must keep
 * their pricing. A draft (or any other status) gets exactly the unknown-slug response, so the
 * route leaks neither title nor price for unpublished content.
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SLUG = 'example-draft-course';

const mocks = vi.hoisted(() => ({
  dbCourse: vi.fn(),
}));

vi.mock('@/lib/auth/session-jwt', () => ({ verifySessionToken: vi.fn(async () => null) }));
vi.mock('@/lib/server/course-catalog-sync', () => ({ getOrCreateCourseBySlug: mocks.dbCourse }));
vi.mock('@/lib/server/user-discounts', () => ({
  findActiveUserDiscount: vi.fn(async () => null),
  computeDiscountedAud: (n: number) => n,
}));

const { GET } = await import('../../../app/api/lms/courses/[slug]/pricing/route');

function call(slug = SLUG) {
  const req = new NextRequest(`https://carsi.example.test/api/lms/courses/${slug}/pricing`);
  return GET(req, { params: Promise.resolve({ slug }) });
}

function course(status: string, isPublished: boolean) {
  return {
    id: 'crs-1',
    slug: SLUG,
    title: 'Unreleased Draft Title',
    priceAud: 149,
    isFree: false,
    status,
    isPublished,
  };
}

describe('GET /api/lms/courses/[slug]/pricing — live courses only (GP-777)', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://test';
    mocks.dbCourse.mockReset();
  });

  it('returns the unknown-slug 404 for a draft course, with no title or price', async () => {
    mocks.dbCourse.mockRejectedValueOnce(new Error('Course not found'));
    const unknown = await call('no-such-course');
    const unknownBody = await unknown.json();

    mocks.dbCourse.mockResolvedValueOnce(course('draft', false));
    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(res.status).toBe(unknown.status);
    expect(body).toEqual(unknownBody);
    const text = JSON.stringify(body);
    expect(text).not.toContain('Unreleased Draft Title');
    expect(text).not.toContain('149');
  });

  it.each(['archived', 'review', '', '  published  '])(
    'treats status %j as not live (404)',
    async (status) => {
      mocks.dbCourse.mockResolvedValueOnce(course(status, true));
      const res = await call();
      expect(res.status).toBe(404);
    }
  );

  it('returns 200 with the price for a published course', async () => {
    mocks.dbCourse.mockResolvedValueOnce(course('published', true));
    const res = await call();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ slug: SLUG, listPriceAud: 149, payableAud: 149, isFree: false });
  });

  it('still returns 200 for a published course whose legacy isPublished flag is off', async () => {
    mocks.dbCourse.mockResolvedValueOnce(course('Published', false));
    const res = await call();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ listPriceAud: 149, payableAud: 149 });
  });
});
