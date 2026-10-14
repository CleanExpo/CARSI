/**
 * Route-level cover for `POST /api/lms/enrollments/guest-free`.
 *
 * Codex review codex-carsi-b7077ba9 P1-DRAFT-GUEST-ACCESS: the route checked only
 * that a course was free, so a direct POST naming an unpublished draft (the free
 * ozone/hydroxyl course is seeded as `status: draft`, `isPublished: false`) created
 * an account, enrolled it and sent the welcome email. A draft must be refused with
 * the same 404 a missing course gets, and refused BEFORE any account is created.
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dbCourse: vi.fn(),
  findOrCreateGuestUser: vi.fn(),
  enrol: vi.fn(),
  welcome: vi.fn(),
  crm: vi.fn(),
  learnPath: vi.fn(),
  turnstile: vi.fn(),
  sign: vi.fn(),
}));

vi.mock('@/lib/server/course-catalog-sync', () => ({ getOrCreateCourseBySlug: mocks.dbCourse }));
vi.mock('@/lib/server/guest-checkout', () => ({ findOrCreateGuestUser: mocks.findOrCreateGuestUser }));
vi.mock('@/lib/server/enrollment-service', () => ({ enrollStudentInCourse: mocks.enrol }));
vi.mock('@/lib/server/enrollment-email', () => ({ sendEnrollmentWelcomeEmail: mocks.welcome }));
vi.mock('@/lib/server/crm-enrollment-notify', () => ({ notifyCrmEnrollmentCreated: mocks.crm }));
vi.mock('@/lib/server/first-lesson', () => ({ getFirstLessonLearnPath: mocks.learnPath }));
vi.mock('@/lib/server/turnstile', () => ({ verifyTurnstileToken: mocks.turnstile }));
vi.mock('@/lib/auth/session-jwt', () => ({ signSessionToken: mocks.sign }));
vi.mock('@/lib/server/sentry', () => ({ captureServerError: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({
  applyRateLimit: () => ({ ok: true, resetAt: Date.now() }),
  clientIpFrom: () => '203.0.113.7',
  UNKNOWN_IP: '__unknown__',
}));

const { POST } = await import('../../../app/api/lms/enrollments/guest-free/route');

const SLUG = 'ozone-and-hydroxyl-generators-what-the-evidence-says';

function request(): NextRequest {
  return new NextRequest('https://carsi.example.test/api/lms/enrollments/guest-free', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      slug: SLUG,
      email: 'learner@example.test',
      password: 'a-long-enough-password',
      full_name: 'Test Learner',
      turnstileToken: 'ok',
    }),
  });
}

function course(overrides: Record<string, unknown>) {
  return { id: 'course-ozone', slug: SLUG, isFree: true, priceAud: '0', ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = 'postgres://test.invalid/carsi';
  mocks.turnstile.mockResolvedValue({ ok: true });
  mocks.findOrCreateGuestUser.mockResolvedValue({
    status: 'created',
    claims: { sub: 'student-1', email: 'learner@example.test' },
  });
  mocks.enrol.mockResolvedValue({ enrollmentId: 'enr-1', courseId: 'course-ozone' });
  mocks.welcome.mockResolvedValue(undefined);
  mocks.learnPath.mockResolvedValue(`/dashboard/learn/${SLUG}`);
  mocks.sign.mockResolvedValue('signed-token');
});

describe('POST /api/lms/enrollments/guest-free — publication gate', () => {
  it.each([
    ['a draft that is not published', { status: 'draft', isPublished: false }],
    ['a draft flagged isPublished', { status: 'draft', isPublished: true }],
    ['a published-status course with isPublished false', { status: 'published', isPublished: false }],
    ['an archived course', { status: 'archived', isPublished: true }],
  ])('refuses %s with 404 and creates no account', async (_label, flags) => {
    mocks.dbCourse.mockResolvedValue(course(flags));

    const res = await POST(request());

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ detail: 'Course not found' });
    expect(mocks.findOrCreateGuestUser).not.toHaveBeenCalled();
    expect(mocks.enrol).not.toHaveBeenCalled();
    expect(mocks.welcome).not.toHaveBeenCalled();
    expect(mocks.crm).not.toHaveBeenCalled();
  });

  it('still enrols a published free course', async () => {
    mocks.dbCourse.mockResolvedValue(course({ status: 'published', isPublished: true }));

    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, learn_url: `/dashboard/learn/${SLUG}` });
    expect(mocks.findOrCreateGuestUser).toHaveBeenCalledTimes(1);
    expect(mocks.enrol).toHaveBeenCalledWith(
      { sub: 'student-1', email: 'learner@example.test' },
      SLUG,
      'free',
    );
  });

  it('still refuses a published paid course with 403 and creates no account', async () => {
    mocks.dbCourse.mockResolvedValue(
      course({ status: 'published', isPublished: true, isFree: false, priceAud: '199' }),
    );

    const res = await POST(request());

    expect(res.status).toBe(403);
    expect(mocks.findOrCreateGuestUser).not.toHaveBeenCalled();
  });
});
