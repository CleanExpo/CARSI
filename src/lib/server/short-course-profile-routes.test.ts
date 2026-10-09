import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import type { CourseWithCurriculum } from '@/lib/server/course-catalog-sync';
import { readAdminCourseCurriculum } from '@/lib/admin/admin-course-curriculum-readback';
import { buildShortCourseDelivery, parseShortCourseDeliveryInput, ShortCourseProfileError } from './short-course-profile';

const mocks = vi.hoisted(() => ({
  admin: vi.fn(), claims: vi.fn(), upstream: vi.fn(), configure: vi.fn(), ensureEnrollment: vi.fn(),
  course: { findUnique: vi.fn(), findMany: vi.fn() }, enrollment: { findUnique: vi.fn(), findMany: vi.fn() },
  progress: { findMany: vi.fn() }, teamMembership: { count: vi.fn() },
}));
vi.mock('@/lib/admin/admin-session', () => ({ getAdminSessionOrNull: mocks.admin }));
vi.mock('@/lib/server/auth-from-request', () => ({ getSessionClaimsFromRequest: mocks.claims }));
vi.mock('@/lib/server/upstream-api', () => ({ getUpstreamBaseUrl: mocks.upstream }));
vi.mock('@/lib/server/enrollment-service', () => ({ ensureAdminEnrollmentForCourse: mocks.ensureEnrollment }));
vi.mock('@/lib/prisma', () => ({ prisma: { lmsCourse: mocks.course, lmsEnrollment: mocks.enrollment,
  lmsLessonProgress: mocks.progress, lmsTeamMember: mocks.teamMembership } }));
vi.mock('./short-course-profile', async (importOriginal) => ({
  ...await importOriginal<typeof import('./short-course-profile')>(), configureShortCourseDelivery: mocks.configure,
}));

import { POST } from '../../../app/api/admin/courses/[id]/delivery-profile/route';
import { GET as curriculumGET } from '../../../app/api/lms/courses/[slug]/curriculum/route';
import { GET as onboardingGET } from '../../../app/api/lms/onboarding/[slug]/route';
import { listOnboardingProgramsForUser } from './onboarding-programs';

function id(value: number) { return `20000000-0000-4000-8000-${String(value).padStart(12, '0')}`; }
function fixture(): CourseWithCurriculum {
  const courseId = id(1), moduleId = id(2);
  const lessons = Array.from({ length: 12 }, (_, index) => {
    const reading = index % 2 === 0, pair = Math.floor(index / 2), quizId = id(100 + pair), lessonId = id(10 + index);
    return { id: lessonId, moduleId, orderIndex: index, title: `Preparation ${pair}${reading ? '' : ' \u2014 Knowledge check'}`,
      contentType: reading ? 'text' : 'quiz', contentBody: reading ? '<p>Original scenario.</p>' : quizId, isPreview: false,
      resources: [{ kind: 'carsi-curriculum-v1-marker', mappingVersion: 1, courseId, moduleId, lessonId,
        lessonKind: reading ? 'reading' : 'assessment', sourceLessonIndex: pair, ...(!reading ? { quizId } : {}) }] };
  });
  return { id: courseId, slug: 'original-course', title: 'Original course', description: null, status: 'draft',
    isPublished: false, cecHours: 0, iicrcDiscipline: null, durationHours: 1.5,
    category: 'CARSI Maintenance Company Onboarding',
    modules: [{ id: moduleId, courseId, title: 'Module', orderIndex: 0, lessons }],
    quizzes: Array.from({ length: 6 }, (_, index) => ({ id: id(100 + index), courseId,
      title: `Preparation ${index} \u2014 Knowledge check`, passPercentage: 80, attemptsAllowed: 2, timeLimitMinutes: null,
      questions: [{ id: id(200 + index), quizId: id(100 + index), orderIndex: 0,
        questionText: 'Prepare?', options: [{ text: 'Yes' }, { text: 'No' }], correctIndex: 0, points: 1 }] })),
    meta: { audience: 'Operators', brand: 'CARSI Maintenance Company Onboarding', pricing: { amountAud: 75 },
      curriculumPersistence: { format: 'carsi-curriculum-v1', mappingVersion: 1, courseId,
        modules: [{ moduleId, description: null, lessonBindings: lessons.map((lesson, index) => ({ lessonId: lesson.id,
          kind: index % 2 === 0 ? 'reading' : 'assessment', sourceLessonIndex: Math.floor(index / 2),
          ...(index % 2 ? { quizId: lesson.contentBody } : {}) })) }] } },
  } as unknown as CourseWithCurriculum;
}
function profileInput(course = fixture()) {
  return { contentSha256: readAdminCourseCurriculum(course).sha256, sourceManifest: { version: 1,
    entries: [{ id: 'PRIVATE-SOURCE-ID', kind: 'carsi-original', sha256: 'e'.repeat(64), permissionEvidence: 'PRIVATE-EVIDENCE' }] } };
}
let course: CourseWithCurriculum;
const adminCtx = { params: Promise.resolve({ id: id(1) }) };
const learnerCtx = { params: Promise.resolve({ slug: 'original-course' }) };
function request(body?: string, pathname = '/api/admin/courses/' + id(1) + '/delivery-profile') {
  return new NextRequest('http://localhost' + pathname, body === undefined ? {} : { method: 'POST', body });
}
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('DATABASE_URL', 'postgresql://synthetic:synthetic@localhost/unused-no-connect');
  course = fixture();
  mocks.admin.mockResolvedValue({ sub: id(400) });
  mocks.claims.mockResolvedValue({ sub: id(300), role: 'student', email: 'synthetic@example.invalid' });
  mocks.upstream.mockReturnValue(null);
  mocks.configure.mockImplementation(async (_id: string, raw: unknown) => {
    parseShortCourseDeliveryInput(raw);
    return buildShortCourseDelivery(course, raw);
  });
  mocks.course.findUnique.mockResolvedValue(course); mocks.course.findMany.mockResolvedValue([course]);
  mocks.enrollment.findUnique.mockResolvedValue({ id: id(301), status: 'active', lastAccessedLessonId: id(10) });
  mocks.enrollment.findMany.mockResolvedValue([{ id: id(301), courseId: course.id }]);
  mocks.progress.findMany.mockResolvedValue([]);
  mocks.teamMembership.count.mockResolvedValue(0);
});
afterEach(() => vi.unstubAllEnvs());

describe('admin delivery-profile endpoint', () => {
  it('uses administrator guard before body/DB work and returns no-store', async () => {
    mocks.admin.mockResolvedValue(null);
    const response = await POST(request(JSON.stringify(profileInput())), adminCtx);
    expect(response.status).toBe(401); expect(response.headers.get('cache-control')).toBe('no-store');
    expect(mocks.configure).not.toHaveBeenCalled(); expect(mocks.course.findUnique).not.toHaveBeenCalled();
  });
  it('accepts declared source input under the course ID from route params', async () => {
    const input = profileInput(), response = await POST(request(JSON.stringify(input)), adminCtx);
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
    expect(mocks.configure).toHaveBeenCalledExactlyOnceWith(id(1), input);
    expect((await response.json()).deliveryProfile.totalMinutes).toBe(90);
  });
  it.each(['{', '{}', ' '.repeat(65537), JSON.stringify({ ...profileInput(), studentId: id(300) })])
  ('rejects malformed or oversized input %#', async (body) => {
    const response = await POST(request(body), adminCtx); expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('bounds actual streamed bytes even when Content-Length lies', async () => {
    const req = request(' '.repeat(65537)); req.headers.set('content-length', '1');
    expect((await POST(req, adminCtx)).status).toBe(400); expect(mocks.configure).not.toHaveBeenCalled();
  });
  it('rejects malformed UTF8 without replacing private source declaration bytes', async () => {
    const req = new NextRequest('http://localhost/api/admin/courses/' + id(1) + '/delivery-profile', {
      method: 'POST', body: new Uint8Array([123, 34, 120, 34, 58, 34, 255, 34, 125]),
    });
    expect((await POST(req, adminCtx)).status).toBe(400);
    expect(mocks.configure).not.toHaveBeenCalled();
  });
  it('requires a configured database before calling service', async () => {
    vi.stubEnv('DATABASE_URL', '');
    expect((await POST(request(JSON.stringify(profileInput())), adminCtx)).status).toBe(503);
    expect(mocks.configure).not.toHaveBeenCalled();
  });
  it.each([400, 404, 409, 503] as const)('returns generic no-store %i', async (status) => {
    mocks.configure.mockRejectedValue(new ShortCourseProfileError(status));
    const response = await POST(request(JSON.stringify(profileInput())), adminCtx);
    expect(response.status).toBe(status); expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ detail: 'Delivery profile unavailable' });
  });
  it('hides infrastructure details including authorization-service errors', async () => {
    mocks.admin.mockRejectedValue(new Error('private credentials and host'));
    const response = await POST(request('{}'), adminCtx); expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private');
  });
});

describe('actual learner metadata response boundaries', () => {
  it('retains upstream programme visibility for an individual without an enrolment', async () => {
    mocks.enrollment.findMany.mockResolvedValue([]);
    expect(await listOnboardingProgramsForUser(id(300))).toEqual([]);
    expect(mocks.teamMembership.count).toHaveBeenCalledExactlyOnceWith({ where: { userId: id(300) } });
    mocks.teamMembership.count.mockResolvedValue(1);
    expect(await listOnboardingProgramsForUser(id(300))).toHaveLength(1);
  });
  it.each(['valid', 'malformed'] as const)('strips %s private evidence from curriculum, detail and programme listing', async (kind) => {
    const profile = kind === 'valid' ? buildShortCourseDelivery(course, profileInput(course)) : {
      rawBody: 'PRIVATE-EVIDENCE', sourceManifest: [{ id: 'PRIVATE-SOURCE-ID' }], profileSha256: 'e'.repeat(64),
    };
    course.meta = { ...course.meta as object, shortCourseDelivery: profile } as CourseWithCurriculum['meta'];
    const before = structuredClone(course.meta);
    const curriculum = await (await curriculumGET(request(undefined, '/api/lms/courses/original-course/curriculum'), learnerCtx)).json();
    const detail = await (await onboardingGET(request(undefined, '/api/lms/onboarding/original-course'), learnerCtx)).json();
    const listing = await listOnboardingProgramsForUser(id(300));
    for (const meta of [curriculum.course.meta, detail.program.meta, listing[0].meta]) {
      expect(meta).not.toHaveProperty('shortCourseDelivery');
      expect(meta).toMatchObject({ audience: 'Operators', brand: 'CARSI Maintenance Company Onboarding', pricing: { amountAud: 75 } });
    }
    for (const payload of [curriculum, detail, listing]) {
      const output = JSON.stringify(payload);
      for (const secret of ['PRIVATE-EVIDENCE', 'PRIVATE-SOURCE-ID', 'sourceManifest', 'profileSha256', 'correctIndex', 'e'.repeat(64)]) {
        expect(output).not.toContain(secret);
      }
    }
    expect(curriculum.course.delivery_profile?.totalMinutes ?? null).toBe(kind === 'valid' ? 90 : null);
    expect(course.meta).toEqual(before);
  });
  it('withholds stale timings but preserves ordinary authorised curriculum', async () => {
    course.meta = { ...course.meta as object, shortCourseDelivery: buildShortCourseDelivery(course, profileInput(course)) } as CourseWithCurriculum['meta'];
    course.modules[0].lessons[0].contentBody = '<p>Changed.</p>';
    const response = await curriculumGET(request(), learnerCtx), payload = await response.json();
    expect(response.status).toBe(200); expect(payload.course.delivery_profile).toBeNull(); expect(payload.modules[0].lessons).toHaveLength(12);
  });
  it('returns only an enrolled pointer that belongs to the visible lesson graph', async () => {
    expect((await (await curriculumGET(request(), learnerCtx)).json()).resume_lesson_id).toBe(id(10));
    mocks.enrollment.findUnique.mockResolvedValue({ id: id(301), status: 'active', lastAccessedLessonId: id(999) });
    expect((await (await curriculumGET(request(), learnerCtx)).json()).resume_lesson_id).toBeNull();
  });
  it('does not allow private metadata reads without a session or curriculum without active access', async () => {
    mocks.claims.mockResolvedValue(null);
    expect((await curriculumGET(request(), learnerCtx)).status).toBe(401); expect(mocks.course.findUnique).not.toHaveBeenCalled();
    mocks.claims.mockResolvedValue({ sub: id(300), role: 'student', email: 'synthetic@example.invalid' });
    mocks.enrollment.findUnique.mockResolvedValue({ id: id(301), status: 'revoked', lastAccessedLessonId: id(10) });
    expect((await curriculumGET(request(), learnerCtx)).status).toBe(403);
  });
});
