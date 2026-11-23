// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminCourseProgressForUser, AdminUserProgress } from '@/lib/admin/admin-user-progress';

import { AdminUserDetailClient } from './AdminUserDetailClient';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/users/learner',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function enrollment(status: string): AdminCourseProgressForUser {
  return {
    enrollmentId: `enrollment-${status}`,
    courseSlug: 'synthetic-course',
    courseTitle: 'Synthetic Course',
    status,
    enrolledAt: '2026-01-01T00:00:00.000Z',
    completedAt: status === 'completed' ? '2026-02-01T00:00:00.000Z' : null,
    paymentReference: null,
    certificateIssuedAt: null,
    listPriceAud: 0,
    // CEC-eligible, so the CEC panel and "IICRC CEC course ready" would leak if gated on lessons.
    resolvedCecHours: 2,
    discipline: null,
    totalLessons: 2,
    completedLessons: 2,
    completionPct: 100,
    completedModules: 2,
    remainingLessons: 0,
    modules: [],
    renewalSubmissionId: null,
    renewalStatus: null,
    renewalCommunicationCount: 0,
    renewalSentAt: null,
  };
}

function learner(status: string): AdminUserProgress {
  return {
    userId: 'learner',
    email: 'learner@example.test',
    fullName: 'Synthetic Learner',
    role: 'student',
    isActive: true,
    isVerified: true,
    iicrcMemberNumber: null,
    iicrcExpiryDate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastActiveAt: null,
    overallCompletionPct: 100,
    enrollmentCount: 1,
    completedCourseCount: status === 'completed' ? 1 : 0,
    activeCourseCount: status === 'completed' ? 0 : 1,
    neverStartedCount: 0,
    boughtNotStartedCount: 0,
    paidEnrollmentCount: 0,
    certificatesCount: 0,
    spentAud: 0,
    enrollments: [enrollment(status)],
  };
}

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(status: string) {
  act(() => {
    root.render(
      <AdminUserDetailClient user={learner(status)} roleNames={['student']} catalogCourses={[]} />
    );
  });
  const buttons = Array.from(container.querySelectorAll('button')).map((b) =>
    (b.textContent ?? '').trim()
  );
  return { text: container.textContent ?? '', buttons };
}

describe('AdminUserDetailClient completion display (GP-769)', () => {
  it('does not offer a certificate or IICRC CEC readiness while the enrolment is still active', () => {
    const { text, buttons } = render('active');
    expect(buttons).not.toContain('Certificate');
    expect(buttons).toContain('Mark complete');
    expect(text).not.toMatch(/IICRC CEC courses? ready/);
    expect(text).not.toContain('IICRC CEC hours');
  });

  it('offers the certificate and CEC panel once the enrolment is completed', () => {
    const { text, buttons } = render('completed');
    expect(buttons).toContain('Certificate');
    expect(buttons).not.toContain('Mark complete');
    expect(text).toMatch(/IICRC CEC course ready/);
    expect(text).toContain('IICRC CEC hours');
  });
});
