/**
 * Team seats for a course with a prerequisite — founder decision 02/11/2026 (DECISIONS #41):
 * "Anyone may buy team seats for a course with prerequisites. Each staff member's own seat
 * stays locked until they complete the prerequisite."
 *
 * End to end over an in-memory Prisma: a seat is ASSIGNED (not skipped) to a member without
 * the prerequisite, the real lesson route refuses it (403 "Complete … first"), the course page
 * status reports it locked, and completing the prerequisite unlocks it. The live mould course
 * has NO `prerequisitesEnforcedFrom`, which grandfathers every ordinary enrolment — the seat
 * must be locked anyway (`prerequisiteGated`).
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
  users: new Map<string, SessionClaims>(),
}));

const COURSES = [
  { id: 'crs-l2', slug: L2, title: 'Level 2 — Mould Remediation', meta: null },
  {
    id: 'crs-mould',
    slug: MOULD,
    title: 'CARSI Mould Remediation Practitioner',
    // As in data/seed/courses-catalog.json: no enforcement date.
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
  const tx = {
    lmsTeamMember: { findFirst: vi.fn(async () => null) },
    lmsTeam: {
      create: vi.fn(async () => ({ id: 'team-1', slug: 'my-team' })),
      update: vi.fn(async () => ({})),
    },
    lmsTeamCoursePurchase: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => ({})),
    },
    $executeRaw: vi.fn(async () => 0),
  };
  return {
    prisma: {
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
      lmsUser: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
          const c = db.users.get(where.id);
          return c ? { email: c.email, fullName: c.full_name } : null;
        }),
      },
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
        findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
          if (where.prerequisiteGated === true) {
            // listPrerequisiteLockedSeats: gated, live rows for these members, with the course.
            const ids = (where.studentId as { in: string[] }).in;
            return db.enrolments
              .filter(
                (e) => ids.includes(e.studentId) && e.prerequisiteGated && e.status === where.status
              )
              .map((e) => ({ ...e, course: COURSES.find((c) => c.id === e.courseId)! }));
          }
          // loadPrerequisiteFacts: this learner's completed prerequisite enrolments.
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
        upsert: vi.fn(
          async ({
            where,
          }: {
            where: { studentId_courseId: { studentId: string; courseId: string } };
          }) => findEnrolment(where.studentId_courseId.studentId, where.studentId_courseId.courseId)
        ),
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
        update: vi.fn(
          async ({ where, data }: { where: { id: string }; data: Partial<Enrolment> }) => {
            const row = db.enrolments.find((e) => e.id === where.id);
            if (row) Object.assign(row, data);
            return row;
          }
        ),
      },
    },
  };
});

vi.mock('@/lib/server/lms-user-sync', () => ({ ensureLmsUserFromClaims: vi.fn(async () => {}) }));
vi.mock('@/lib/server/course-catalog-sync', () => ({
  getOrCreateCourseBySlug: vi.fn(async (slug: string) => {
    const c = COURSES.find((x) => x.slug === slug);
    if (!c) throw new Error('COURSE_NOT_FOUND');
    return c;
  }),
}));
vi.mock('@/lib/server/team-course-slug-db', () => ({
  readTeamCourseSlug: vi.fn(async () => MOULD),
}));
vi.mock('@/lib/server/lms-auth', () => ({
  sessionClaimsForUserId: vi.fn(async (id: string) => db.users.get(id) ?? null),
}));
vi.mock('@/lib/server/teams', () => ({ createUniqueTeamSlug: vi.fn(async () => 'my-team') }));
vi.mock('@/lib/server/first-lesson', () => ({ getFirstLessonLearnPath: vi.fn(async () => null) }));
vi.mock('@/lib/server/upstream-api', () => ({ getUpstreamBaseUrl: () => null }));
vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: vi.fn(async () => db.claims),
}));
vi.mock('@/lib/auth/session-jwt', () => ({ verifySessionToken: vi.fn(async () => db.claims) }));

const { enrollTeamMemberInPurchasedCourse, fulfillCourseCheckoutForUser } =
  await import('./team-course-purchase');
const { listPrerequisiteLockedSeats } = await import('./course-prerequisites');
const { GET: getLesson } = await import('../../../app/api/lms/lessons/[lessonId]/route');
const { GET: getPrereqStatus } =
  await import('../../../app/api/lms/courses/[slug]/prerequisites/route');

const member: SessionClaims = {
  sub: 'mem',
  email: 'tech@firm.com.au',
  full_name: 'Tech',
  role: 'student',
};
const manager: SessionClaims = {
  sub: 'mgr',
  email: 'boss@firm.com.au',
  full_name: 'Boss',
  role: 'student',
};
const admin: SessionClaims = {
  sub: 'adm',
  email: 'ops@carsi.com.au',
  full_name: 'Ops',
  role: 'admin',
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

async function openLesson(as: SessionClaims) {
  db.claims = as;
  return getLesson(new NextRequest('https://carsi.example.test/api/lms/lessons/les-1'), {
    params: Promise.resolve({ lessonId: 'les-1' }),
  });
}

async function courseStatus(as: SessionClaims) {
  db.claims = as;
  const res = await getPrereqStatus(
    new NextRequest(`https://carsi.example.test/api/lms/courses/${MOULD}/prerequisites`, {
      headers: { cookie: 'auth_token=tok' },
    }),
    { params: Promise.resolve({ slug: MOULD }) }
  );
  return (await res.json()) as {
    locked: boolean;
    enrolled?: boolean;
    prerequisites: { slug: string }[];
  };
}

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://configured';
  db.enrolments = [];
  db.claims = null;
  db.users = new Map([
    [member.sub, member],
    [manager.sub, manager],
    [admin.sub, admin],
  ]);
});

describe('team seat for a member WITHOUT the prerequisite', () => {
  it('is assigned (not skipped) and issued locked', async () => {
    await enrollTeamMemberInPurchasedCourse(member.sub, 'team-1');
    const seat = findEnrolment(member.sub, 'crs-mould');
    expect(seat).toMatchObject({
      status: 'active',
      paymentReference: 'team:team-1',
      prerequisiteGated: true,
    });
  });

  it('locks lessons: 403 "Complete Level 2 … first" from the real lesson route', async () => {
    await enrollTeamMemberInPurchasedCourse(member.sub, 'team-1');
    const res = await openLesson(member);
    const body = (await res.json()) as {
      code?: string;
      detail?: string;
      prerequisites?: { slug: string }[];
    };
    expect(res.status).toBe(403);
    expect(body.code).toBe('prerequisite_not_met');
    expect(body.detail).toMatch(/^Complete Level 2 — Mould Remediation first\./);
    expect(body.prerequisites?.[0]?.slug).toBe(L2);
  });

  it('the course page status reports the seat locked (drives PrerequisiteLockNotice)', async () => {
    await enrollTeamMemberInPurchasedCourse(member.sub, 'team-1');
    const s = await courseStatus(member);
    expect(s).toMatchObject({ locked: true, enrolled: true });
    expect(s.prerequisites[0]?.slug).toBe(L2);
  });

  it('the manager view lists the member as waiting on the prerequisite', async () => {
    await enrollTeamMemberInPurchasedCourse(member.sub, 'team-1');
    const waiting = await listPrerequisiteLockedSeats([member.sub, manager.sub]);
    expect(waiting.get(member.sub)).toEqual([
      expect.objectContaining({
        course_slug: MOULD,
        prerequisites: [expect.objectContaining({ slug: L2 })],
      }),
    ]);
    expect(waiting.has(manager.sub)).toBe(false);
  });

  it('unlocks once the member completes the prerequisite', async () => {
    await enrollTeamMemberInPurchasedCourse(member.sub, 'team-1');
    completePrerequisite(member.sub);
    const res = await openLesson(member);
    expect(res.status).toBe(200);
    expect((await courseStatus(member)).locked).toBe(false);
    expect((await listPrerequisiteLockedSeats([member.sub])).size).toBe(0);
  });

  it('an ordinary (ungated) enrolment on the same course stays grandfathered', async () => {
    db.enrolments.push({
      id: 'old',
      studentId: member.sub,
      courseId: 'crs-mould',
      status: 'active',
      paymentReference: 'cs_before',
      enrolledAt: new Date('2026-10-01T00:00:00Z'),
      prerequisiteGated: false,
    });
    const res = await openLesson(member);
    expect(res.status).toBe(200);
  });
});

describe('team seat for a member WITH the prerequisite', () => {
  it('is issued unlocked and opens lessons', async () => {
    completePrerequisite(member.sub);
    await enrollTeamMemberInPurchasedCourse(member.sub, 'team-1');
    expect(findEnrolment(member.sub, 'crs-mould')?.prerequisiteGated).toBe(false);
    expect((await openLesson(member)).status).toBe(200);
  });
});

describe('admin', () => {
  it('bypasses the lock on a gated seat', async () => {
    db.enrolments.push({
      id: 'adm-seat',
      studentId: admin.sub,
      courseId: 'crs-mould',
      status: 'active',
      paymentReference: 'team:team-1',
      enrolledAt: new Date(),
      prerequisiteGated: true,
    });
    const res = await openLesson(admin);
    expect(res.status).toBe(200);
  });
});

describe('team buyer WITHOUT the prerequisite (Stripe fulfilment)', () => {
  it('gets a team and their own seat, issued locked', async () => {
    const out = await fulfillCourseCheckoutForUser({
      claims: manager,
      courseSlug: MOULD,
      paymentReference: 'cs_team_paid',
      purchaseMode: 'team',
      teamSeatCount: 5,
    });
    expect(out.kind).toBe('team');
    expect(findEnrolment(manager.sub, 'crs-mould')).toMatchObject({
      paymentReference: 'cs_team_paid',
      prerequisiteGated: true,
    });
    expect((await openLesson(manager)).status).toBe(403);
  });
});
