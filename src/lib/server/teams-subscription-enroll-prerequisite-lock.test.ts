/**
 * Teams-subscription self-enrol for a course with a prerequisite — founder decision
 * 03/11/2026 (DECISIONS #53): "Issue a locked seat, same as a bought seat (#49)."
 *
 * Drives the real POST /api/lms/subscription/teams/enroll route over an in-memory Prisma
 * (pattern: team-seat-prerequisite-lock.test.ts). A seated member WITHOUT the prerequisite
 * gets an active, gated enrolment (not a 403 refusal), the response says the seat is locked,
 * and the real lesson route refuses it. WITH the prerequisite the seat is ungated. A
 * prerequisite lookup error must not issue an ungated seat (fail-closed).
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionClaims } from '@/lib/auth/session-jwt';

const L2 = 'level-2-mould-remediation-30ee3492';
const MOULD = 'mould-remediation-fundamentals';

type Enrolment = {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
  paymentReference: string | null;
  enrolledAt: Date;
  prerequisiteGated: boolean;
};

const db = vi.hoisted(() => ({
  enrolments: [] as Enrolment[],
  claims: null as SessionClaims | null,
  factsError: false,
}));

const COURSES = [
  { id: 'crs-l2', slug: L2, title: 'Level 2 — Mould Remediation', meta: null },
  {
    id: 'crs-mould',
    slug: MOULD,
    title: 'CARSI Mould Remediation Practitioner',
    meta: { prerequisites: [{ courseSlug: L2 }] },
  },
];
const LESSON = {
  id: 'les-1',
  title: 'Lesson 1',
  contentType: 'text',
  contentBody: 'body',
  orderIndex: 0,
  isPreview: false,
  resources: null,
  module: {
    courseId: 'crs-mould',
    course: { id: 'crs-mould', slug: MOULD, title: 'CARSI Mould Remediation Practitioner' },
  },
};

function findEnrolment(studentId: string, courseId: string) {
  return db.enrolments.find((e) => e.studentId === studentId && e.courseId === courseId) ?? null;
}

vi.mock('@/lib/prisma', () => {
  type Where = Record<string, unknown>;
  const matchCourse = (where: Where) =>
    COURSES.find((c) =>
      'id' in where ? c.id === where.id : 'slug' in where ? c.slug === where.slug : false
    ) ?? null;
  return {
    prisma: {
      lmsCourse: {
        findUnique: vi.fn(async ({ where }: { where: Where }) => matchCourse(where)),
        findMany: vi.fn(async ({ where }: { where: { slug: { in: string[] } } }) =>
          COURSES.filter((c) => where.slug.in.includes(c.slug))
        ),
      },
      lmsLesson: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
          where.id === LESSON.id ? LESSON : null
        ),
      },
      lmsLessonProgress: { upsert: vi.fn(async () => ({})) },
      lmsEnrollment: {
        findUnique: vi.fn(
          async ({
            where,
          }: {
            where: { studentId_courseId: { studentId: string; courseId: string } };
          }) => findEnrolment(where.studentId_courseId.studentId, where.studentId_courseId.courseId)
        ),
        // loadPrerequisiteFacts: this learner's completed prerequisite enrolments.
        findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
          if (db.factsError) throw new Error('db down');
          const courseIds = (where.courseId as { in: string[] }).in;
          return db.enrolments
            .filter(
              (e) =>
                e.studentId === where.studentId &&
                courseIds.includes(e.courseId) &&
                e.status === where.status
            )
            .map((e) => ({ courseId: e.courseId }));
        }),
        create: vi.fn(
          async ({
            data,
          }: {
            data: Omit<Enrolment, 'enrolledAt' | 'prerequisiteGated'> & {
              prerequisiteGated?: boolean;
            };
          }) => {
            const row: Enrolment = {
              ...data,
              enrolledAt: new Date(),
              prerequisiteGated: data.prerequisiteGated ?? false,
            };
            db.enrolments.push(row);
            return row;
          }
        ),
        update: vi.fn(async () => ({})),
      },
    },
  };
});

vi.mock('@/lib/server/subscriptions-flag', () => ({ teamSubscriptionsEnabled: () => true }));
vi.mock('@/lib/server/entitlements', () => ({
  getTeamEntitlements: vi.fn(async () => ({ hasActiveSeat: true, teamId: 'team-1' })),
}));
vi.mock('@/lib/server/public-courses-list', () => ({
  getPublishedCourseForCheckout: vi.fn(async (slug: string) =>
    COURSES.some((c) => c.slug === slug)
      ? { slug, title: slug, price_aud: 0, is_free: false }
      : null
  ),
}));
vi.mock('@/lib/server/enrollment-email', () => ({
  sendEnrollmentWelcomeEmail: vi.fn(async () => {}),
}));
vi.mock('@/lib/server/crm-enrollment-notify', () => ({ notifyCrmEnrollmentCreated: vi.fn() }));
vi.mock('@/lib/server/lms-user-sync', () => ({ ensureLmsUserFromClaims: vi.fn(async () => {}) }));
vi.mock('@/lib/server/course-catalog-sync', () => ({
  getOrCreateCourseBySlug: vi.fn(async (slug: string) => {
    const c = COURSES.find((x) => x.slug === slug);
    if (!c) throw new Error('COURSE_NOT_FOUND');
    return c;
  }),
}));
vi.mock('@/lib/server/first-lesson', () => ({
  getFirstLessonLearnPath: vi.fn(async () => `/dashboard/learn/${MOULD}/lesson/les-1`),
}));
vi.mock('@/lib/server/upstream-api', () => ({ getUpstreamBaseUrl: () => null }));
vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: vi.fn(async () => db.claims),
}));

const { POST: selfEnrol } = await import('../../../app/api/lms/subscription/teams/enroll/route');
const { GET: getLesson } = await import('../../../app/api/lms/lessons/[lessonId]/route');

const member: SessionClaims = {
  sub: 'mem',
  email: 'tech@firm.com.au',
  full_name: 'Tech',
  role: 'student',
};

function completePrerequisite(studentId: string) {
  db.enrolments.push({
    id: `l2-${studentId}`,
    studentId,
    courseId: 'crs-l2',
    status: 'completed',
    paymentReference: 'cs_l2',
    enrolledAt: new Date('2026-01-01T00:00:00Z'),
    prerequisiteGated: false,
  });
}

async function enrol() {
  db.claims = member;
  const res = await selfEnrol(
    new NextRequest('https://carsi.example.test/api/lms/subscription/teams/enroll', {
      method: 'POST',
      body: JSON.stringify({ slug: MOULD }),
    })
  );
  return {
    status: res.status,
    body: (await res.json()) as {
      ok?: boolean;
      locked?: boolean;
      enrolled?: boolean;
      code?: string;
      detail?: string;
      learn_url?: string;
      prerequisites?: { slug: string }[];
    },
  };
}

async function openLesson() {
  db.claims = member;
  return getLesson(new NextRequest('https://carsi.example.test/api/lms/lessons/les-1'), {
    params: Promise.resolve({ lessonId: 'les-1' }),
  });
}

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://configured';
  db.enrolments = [];
  db.claims = null;
  db.factsError = false;
});

describe('Teams-subscription self-enrol WITHOUT the prerequisite (DECISIONS #53)', () => {
  it('issues an active, gated seat and reports it locked (not a 403 refusal)', async () => {
    const { status, body } = await enrol();
    expect(status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      enrolled: true,
      locked: true,
      code: 'prerequisite_not_met',
    });
    expect(body.detail).toMatch(/^Complete Level 2 — Mould Remediation first\./);
    expect(body.prerequisites?.[0]?.slug).toBe(L2);
    expect(body.learn_url).toBe(`/courses/${MOULD}`);
    expect(findEnrolment(member.sub, 'crs-mould')).toMatchObject({
      status: 'active',
      paymentReference: 'team-seat:team-1',
      prerequisiteGated: true,
    });
  });

  it('the real lesson route refuses the locked seat (403)', async () => {
    await enrol();
    const res = await openLesson();
    expect(res.status).toBe(403);
    expect(((await res.json()) as { code?: string }).code).toBe('prerequisite_not_met');
  });

  it('a repeat self-enrol still reports the seat locked', async () => {
    await enrol();
    const { status, body } = await enrol();
    expect(status).toBe(200);
    expect(body).toMatchObject({ locked: true, enrolled: true });
  });

  it('fails closed: a prerequisite lookup error issues no seat at all', async () => {
    db.factsError = true;
    const { status } = await enrol();
    expect(status).toBe(500);
    expect(findEnrolment(member.sub, 'crs-mould')).toBeNull();
  });
});

describe('Teams-subscription self-enrol WITH the prerequisite', () => {
  it('issues an ungated seat that opens lessons', async () => {
    completePrerequisite(member.sub);
    const { status, body } = await enrol();
    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: true, locked: false });
    expect(body.learn_url).toBe(`/dashboard/learn/${MOULD}/lesson/les-1`);
    expect(findEnrolment(member.sub, 'crs-mould')?.prerequisiteGated).toBe(false);
    expect((await openLesson()).status).toBe(200);
  });
});
