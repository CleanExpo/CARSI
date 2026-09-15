import { beforeEach, describe, expect, it, vi } from 'vitest';

import { provisionalPasswordHash } from '@/lib/server/lms-auth';

const mocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  findEnrollment: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: { findUnique: mocks.findUser },
    lmsEnrollment: { findUnique: mocks.findEnrollment },
  },
}));

const { alreadyOwnsPaidCourse, alreadyEnrolledCheckoutPayload, findActivePaidCourseOwnership } =
  await import('@/lib/server/paid-course-ownership');

describe('alreadyOwnsPaidCourse', () => {
  it('is true only for access-granting enrolment statuses', () => {
    expect(alreadyOwnsPaidCourse('active')).toBe(true);
    expect(alreadyOwnsPaidCourse('completed')).toBe(true);
    expect(alreadyOwnsPaidCourse('revoked')).toBe(false);
    expect(alreadyOwnsPaidCourse('refunded')).toBe(false);
    expect(alreadyOwnsPaidCourse(null)).toBe(false);
  });
});

describe('alreadyEnrolledCheckoutPayload', () => {
  const learnPath = '/dashboard/learn/level-1-mould-remediation-2cc96b85';

  it('sends a guest with a provisional password to set-password, not Stripe', () => {
    const body = alreadyEnrolledCheckoutPayload({
      signedIn: false,
      hashedPassword: provisionalPasswordHash(),
      learnPath,
      email: 'brighttouchcleaner@gmail.com',
    });
    expect(body.already_enrolled).toBe(true);
    expect(body.needs_password_setup).toBe(true);
    expect(body.reset_path?.startsWith('/forgot-password?')).toBe(true);
    expect(body.reset_path).toContain('paid=1');
    expect(body.reset_path).toContain('brighttouchcleaner');
    expect(body.learn_path).toBe(learnPath);
    expect(body.detail.toLowerCase()).toContain('set a password');
    expect(body.detail.toLowerCase()).not.toContain('invalid credentials');
  });

  it('sends an established guest to sign in with a next= link into the course', () => {
    const body = alreadyEnrolledCheckoutPayload({
      signedIn: false,
      hashedPassword: '$2a$12$established',
      learnPath,
    });
    expect(body.needs_password_setup).toBeUndefined();
    expect(body.login_path).toBe(`/login?next=${encodeURIComponent(learnPath)}`);
    expect(body.detail.toLowerCase()).toContain('sign in');
  });

  it('sends a signed-in owner straight into the course', () => {
    const body = alreadyEnrolledCheckoutPayload({
      signedIn: true,
      hashedPassword: '$2a$12$established',
      learnPath,
    });
    expect(body.reset_path).toBeUndefined();
    expect(body.login_path).toBeUndefined();
    expect(body.learn_path).toBe(learnPath);
  });

  it('refuses an off-site learn path', () => {
    const body = alreadyEnrolledCheckoutPayload({
      signedIn: true,
      hashedPassword: '$2a$12$established',
      learnPath: 'https://evil.example/phish',
    });
    expect(body.learn_path).toBe('/dashboard/student');
  });
});

describe('findActivePaidCourseOwnership', () => {
  beforeEach(() => {
    mocks.findUser.mockReset();
    mocks.findEnrollment.mockReset();
  });

  it('returns the owner when email matches a paid active enrolment', async () => {
    mocks.findUser.mockResolvedValue({ id: 'user-1', hashedPassword: 'provisional:abc' });
    mocks.findEnrollment.mockResolvedValue({ status: 'active' });

    const owned = await findActivePaidCourseOwnership({
      email: 'brighttouchcleaner@gmail.com',
      courseId: 'course-mould-1',
    });

    expect(owned).toEqual({
      userId: 'user-1',
      hashedPassword: 'provisional:abc',
      enrollmentStatus: 'active',
    });
    expect(mocks.findEnrollment).toHaveBeenCalledWith({
      where: { studentId_courseId: { studentId: 'user-1', courseId: 'course-mould-1' } },
      select: { status: true },
    });
  });

  it('returns null for a different course (no enrolment row)', async () => {
    mocks.findUser.mockResolvedValue({ id: 'user-1', hashedPassword: '$2a$12$x' });
    mocks.findEnrollment.mockResolvedValue(null);

    await expect(
      findActivePaidCourseOwnership({
        email: 'admin@cqldr.com.au',
        courseId: 'course-other',
      })
    ).resolves.toBeNull();
  });

  it('returns null for a revoked enrolment so they may pay again', async () => {
    mocks.findUser.mockResolvedValue({ id: 'user-1', hashedPassword: '$2a$12$x' });
    mocks.findEnrollment.mockResolvedValue({ status: 'revoked' });

    await expect(
      findActivePaidCourseOwnership({
        studentId: 'user-1',
        email: 'refunded@example.test',
        courseId: 'course-1',
      })
    ).resolves.toBeNull();
  });
});
