/**
 * GP-776: POST /api/lms/enrollments/confirm without a Stripe session (a free course, or an
 * admin 100% discount) must refuse a course that is not published, the same as the guest-free
 * route. Otherwise a signed-in learner could enrol in an unreviewed draft by naming its slug.
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dbCourse: vi.fn(),
  fulfil: vi.fn(),
}));

vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: async () => ({ sub: 'user-1', email: 'learner@example.test' }),
}));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/server/course-catalog-sync', () => ({ getOrCreateCourseBySlug: mocks.dbCourse }));
vi.mock('@/lib/server/team-course-purchase', () => ({ fulfillCourseCheckoutForUser: mocks.fulfil }));
vi.mock('@/lib/server/enrollment-email', () => ({ sendEnrollmentWelcomeEmail: vi.fn(async () => undefined) }));
vi.mock('@/lib/server/crm-enrollment-notify', () => ({ notifyCrmEnrollmentCreated: vi.fn(async () => undefined) }));
vi.mock('@/lib/server/sentry', () => ({ captureServerError: vi.fn() }));
vi.mock('@/lib/server/user-discounts', () => ({
  findActiveUserDiscount: vi.fn(async () => null),
  computeDiscountedAud: vi.fn(() => 0),
}));

import { POST } from '../../../app/api/lms/enrollments/confirm/route';

const confirm = () =>
  POST(
    new NextRequest('https://example.test/api/lms/enrollments/confirm', {
      method: 'POST',
      body: JSON.stringify({ slug: 'free-course' }),
      headers: { 'Content-Type': 'application/json' },
    })
  );

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', 'unused-mocked-database');
  mocks.dbCourse.mockReset();
  mocks.fulfil.mockReset();
  mocks.fulfil.mockResolvedValue({ enrollmentId: 'e1', alreadyEnrolled: false });
});

describe('free confirm refuses a course that is not published', () => {
  it.each([
    ['draft', false],
    ['in_review', false],
    ['draft', true],
  ])('status %s, flag %s: 404 and no enrolment', async (status, isPublished) => {
    mocks.dbCourse.mockResolvedValue({ id: 'c1', slug: 'free-course', priceAud: 0, isFree: true, status, isPublished });
    const res = await confirm();
    expect(res.status).toBe(404);
    expect(mocks.fulfil).not.toHaveBeenCalled();
  });

  // Status is the canonical published state (src/lib/server/public-courses-list.ts): about 20
  // live catalogue rows are status 'published' with the legacy isPublished flag false.
  it.each([true, false])('a published free course (flag %s) still enrols', async (isPublished) => {
    mocks.dbCourse.mockResolvedValue({
      id: 'c1', slug: 'free-course', priceAud: 0, isFree: true, status: 'published', isPublished,
    });
    const res = await confirm();
    expect(res.status).not.toBe(404);
    expect(mocks.fulfil).toHaveBeenCalledTimes(1);
  });
});
