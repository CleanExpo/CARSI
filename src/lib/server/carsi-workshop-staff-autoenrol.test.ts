import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionClaims } from '@/lib/auth/session-jwt';

/**
 * GP-737: staff auto-enrolment for the cohort workshop course.
 *
 *   (1) the quiz routes resolve the quiz's course and enrol allow-listed staff, exactly as
 *       the lesson routes do (ensureStaffEnrollmentForQuiz);
 *   (2) a staff session whose own enrolment row is revoked (or any other no-access status)
 *       is reactivated, instead of being shut out by the upsert's empty update. Staff access
 *       follows the role: a staff member with no row is enrolled, so a revoked row must not
 *       lock them out. Learners are never touched.
 *
 * The enrolment table is an in-memory fake keyed on (studentId, courseId), so the upsert,
 * the reactivation and the read-back all see the same rows.
 */
const WORKSHOP = { id: 'course-workshop', slug: 'ccw-2-day-workshop' };
const PAID = { id: 'course-paid', slug: 'water-damage-restoration' };

type Row = {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
  paymentReference: string | null;
  completedAt: Date | null;
  certificateIssuedAt: Date | null;
  lastAccessedLessonId: string | null;
};

const db = vi.hoisted(() => ({ rows: [] as Row[] }));

vi.mock('@/lib/server/lms-user-sync', () => ({ ensureLmsUserFromClaims: vi.fn(async () => {}) }));
vi.mock('@/lib/server/auth-from-request', () => ({ getSessionClaimsFromRequest: vi.fn() }));
vi.mock('@/lib/server/upstream-api', () => ({ getUpstreamBaseUrl: () => null }));
vi.mock('@/lib/prisma', () => {
  const key = (w: { studentId_courseId?: { studentId: string; courseId: string } }) =>
    w.studentId_courseId!;
  const find = (studentId: string, courseId: string) =>
    db.rows.find((r) => r.studentId === studentId && r.courseId === courseId) ?? null;
  const courses = [
    { ...WORKSHOP, quizId: 'quiz-workshop', lessonId: 'lesson-workshop' },
    { ...PAID, quizId: 'quiz-paid', lessonId: 'lesson-paid' },
  ];
  return {
    prisma: {
      lmsQuiz: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
          const c = courses.find((x) => x.quizId === where.id);
          return c ? { course: { id: c.id, slug: c.slug } } : null;
        }),
      },
      lmsLesson: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
          const c = courses.find((x) => x.lessonId === where.id);
          return c ? { module: { course: { id: c.id, slug: c.slug } } } : null;
        }),
      },
      lmsCourse: {
        findUnique: vi.fn(async ({ where }: { where: { slug: string } }) => {
          const c = courses.find((x) => x.slug === where.slug);
          return c
            ? {
                id: c.id,
                slug: c.slug,
                title: 'Course',
                thumbnailUrl: null,
                category: null,
                meta: null,
                modules: [],
                quizzes: [],
              }
            : null;
        }),
      },
      lmsLessonProgress: { findMany: vi.fn(async () => []) },
      lmsEnrollment: {
        findUnique: vi.fn(async ({ where }: { where: Parameters<typeof key>[0] }) => {
          const k = key(where);
          return find(k.studentId, k.courseId);
        }),
        upsert: vi.fn(
          async ({ where, create }: { where: Parameters<typeof key>[0]; create: Row }) => {
            const k = key(where);
            const existing = find(k.studentId, k.courseId);
            if (existing) return existing;
            const row = {
              completedAt: null,
              certificateIssuedAt: null,
              lastAccessedLessonId: null,
              ...create,
            } as Row;
            db.rows.push(row);
            return row;
          }
        ),
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
          const row = db.rows.find((r) => r.id === where.id);
          if (!row) throw new Error('row not found');
          return Object.assign(row, data);
        }),
        // The GP-737 reactivation is one updateMany guarded on the status it read (GP-432).
        updateMany: vi.fn(
          async ({ where, data }: { where: { id: string; status: string }; data: Partial<Row> }) => {
            const row = db.rows.find((r) => r.id === where.id && r.status === where.status);
            if (!row) return { count: 0 };
            Object.assign(row, data);
            return { count: 1 };
          }
        ),
      },
    },
  };
});

const service = await import('./enrollment-service');
const { getSessionClaimsFromRequest } = await import('@/lib/server/auth-from-request');
const curriculum = await import('../../../app/api/lms/courses/[slug]/curriculum/route');

const claimsFor = (role: string, sub = `${role}-1`): SessionClaims => ({
  sub,
  email: `${sub}@example.test`,
  full_name: role,
  role,
});
const instructor = claimsFor('instructor');
const admin = claimsFor('admin');
const learner = claimsFor('student');

function revokedRow(studentId: string, courseId: string, paymentReference = 'cs_test_x'): Row {
  return {
    id: `enr-${studentId}-${courseId}`,
    studentId,
    courseId,
    status: 'revoked',
    paymentReference,
    completedAt: null,
    certificateIssuedAt: null,
    lastAccessedLessonId: null,
  };
}

const rowOf = (studentId: string, courseId: string) =>
  db.rows.find((r) => r.studentId === studentId && r.courseId === courseId);

async function getCurriculum(claims: SessionClaims, slug: string) {
  vi.mocked(getSessionClaimsFromRequest).mockResolvedValue(claims);
  return curriculum.GET(new NextRequest(`http://localhost/api/lms/courses/${slug}/curriculum`), {
    params: Promise.resolve({ slug }),
  });
}

beforeEach(() => {
  db.rows = [];
  vi.stubEnv('DATABASE_URL', 'postgresql://synthetic:synthetic@localhost/unused-no-connect');
});

describe('ensureStaffEnrollmentForQuiz (GP-737 1)', () => {
  it('enrols an instructor on a workshop quiz they open first', async () => {
    await service.ensureStaffEnrollmentForQuiz(instructor, 'quiz-workshop');
    expect(rowOf(instructor.sub, WORKSHOP.id)?.status).toBe('active');
    expect(rowOf(instructor.sub, WORKSHOP.id)?.paymentReference).toBe(
      service.ADMIN_ACCESS_PAYMENT_REFERENCE
    );
  });

  it('enrols an admin on any course quiz', async () => {
    await service.ensureStaffEnrollmentForQuiz(admin, 'quiz-paid');
    expect(rowOf(admin.sub, PAID.id)?.status).toBe('active');
  });

  it('never enrols an instructor on a course outside the allow-list', async () => {
    await service.ensureStaffEnrollmentForQuiz(instructor, 'quiz-paid');
    expect(rowOf(instructor.sub, PAID.id)).toBeUndefined();
  });

  it('never enrols a learner, and does not even look the quiz up', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.lmsQuiz.findUnique).mockClear();
    await service.ensureStaffEnrollmentForQuiz(learner, 'quiz-workshop');
    expect(db.rows).toHaveLength(0);
    expect(prisma.lmsQuiz.findUnique).not.toHaveBeenCalled();
  });

  it('does nothing for an unknown quiz', async () => {
    await service.ensureStaffEnrollmentForQuiz(admin, 'quiz-missing');
    expect(db.rows).toHaveLength(0);
  });
});

describe('a revoked staff enrolment row (GP-737 2)', () => {
  it('is reactivated for an instructor opening a workshop lesson', async () => {
    db.rows.push(revokedRow(instructor.sub, WORKSHOP.id));
    await service.ensureStaffEnrollmentForLesson(instructor, 'lesson-workshop');
    const row = rowOf(instructor.sub, WORKSHOP.id)!;
    expect(row.status).toBe('active');
    expect(row.paymentReference).toBe(service.ADMIN_ACCESS_PAYMENT_REFERENCE);
  });

  it('is reactivated for an instructor opening a workshop quiz', async () => {
    db.rows.push(revokedRow(instructor.sub, WORKSHOP.id));
    await service.ensureStaffEnrollmentForQuiz(instructor, 'quiz-workshop');
    expect(rowOf(instructor.sub, WORKSHOP.id)?.status).toBe('active');
  });

  it('no longer blocks the curriculum for an instructor (403 before GP-737)', async () => {
    db.rows.push(revokedRow(instructor.sub, WORKSHOP.id));
    const res = await getCurriculum(instructor, WORKSHOP.slug);
    expect(res.status).toBe(200);
    expect(rowOf(instructor.sub, WORKSHOP.id)?.status).toBe('active');
  });

  it('no longer blocks the curriculum for an admin on any course', async () => {
    db.rows.push(revokedRow(admin.sub, PAID.id));
    expect((await getCurriculum(admin, PAID.slug)).status).toBe(200);
  });

  it('leaves an active or completed staff row untouched', async () => {
    db.rows.push({ ...revokedRow(admin.sub, PAID.id, 'cs_paid'), status: 'completed' });
    await service.ensureStaffEnrollmentForLesson(admin, 'lesson-paid');
    expect(rowOf(admin.sub, PAID.id)).toMatchObject({
      status: 'completed',
      paymentReference: 'cs_paid',
    });
  });

  it('stays revoked for an instructor on a course outside the allow-list', async () => {
    db.rows.push(revokedRow(instructor.sub, PAID.id));
    await service.ensureStaffEnrollmentForLesson(instructor, 'lesson-paid');
    expect(rowOf(instructor.sub, PAID.id)?.status).toBe('revoked');
    expect((await getCurriculum(instructor, PAID.slug)).status).toBe(403);
    expect(rowOf(instructor.sub, PAID.id)?.status).toBe('revoked');
  });

  it('stays revoked for a learner: a refund still shuts them out', async () => {
    db.rows.push(revokedRow(learner.sub, WORKSHOP.id));
    await service.ensureStaffEnrollmentForLesson(learner, 'lesson-workshop');
    expect((await getCurriculum(learner, WORKSHOP.slug)).status).toBe(403);
    expect(rowOf(learner.sub, WORKSHOP.id)?.status).toBe('revoked');
  });
});
