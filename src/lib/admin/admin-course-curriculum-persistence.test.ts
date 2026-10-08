import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { convertAiCourseCurriculum } from '@/lib/server/ai-course-curriculum';
import type { CourseWithCurriculum } from '@/lib/server/course-catalog-sync';
import { parseLessonResources } from '@/lib/lms/lesson-resources';
import { mergeVideoResource } from '@/lib/video/lesson-video-helpers';
import { resolveLmsCourseCecHours } from '@/lib/server/course-cec-hours';
import { readAdminCourseCurriculum, validateStructuredCourse } from './admin-course-curriculum-readback';

const mocks = vi.hoisted(() => ({
  ensure: vi.fn(), find: vi.fn(), read: vi.fn(), transaction: vi.fn(),
  courseCreate: vi.fn(), courseUpdate: vi.fn(), moduleCreate: vi.fn(), lessonCreate: vi.fn(),
  quizCreate: vi.fn(), questionCreate: vi.fn(), quizPrune: vi.fn(), quizUpsert: vi.fn(), questionDelete: vi.fn(),
  session: vi.fn(),
  approvals: [] as { slug: string; status: 'approved' | 'submitted' | 'not_submitted'; approvedHours?: number }[],
}));
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  return { ...actual, randomUUID: vi.fn(actual.randomUUID) };
});
vi.mock('../../../data/seed/cec-approvals.json', () => ({ default: { version: 1, approvals: mocks.approvals } }));
vi.mock('@/lib/admin/admin-session', () => ({ getAdminSessionOrNull: mocks.session }));
vi.mock('@/lib/prisma', () => ({ prisma: {
  lmsCourse: { findUnique: mocks.find, findUniqueOrThrow: mocks.read }, $transaction: mocks.transaction,
} }));
vi.mock('@/lib/server/course-catalog-sync', () => ({
  courseWithCurriculum: {}, DEFAULT_INSTRUCTOR_ID: 'instructor', ensureCatalogInstructor: mocks.ensure,
}));
const { adminCreateCourse, adminUpdateCourse, courseToAdminDto, parseAdminCourseWriteBody } =
  await import('./admin-courses-service');
const { POST } = await import('../../../app/api/admin/courses/route');
const { PATCH } = await import('../../../app/api/admin/courses/[id]/route');
const { ensureCatalogInstructor: realEnsureCatalogInstructor } =
  await vi.importActual<typeof import('@/lib/server/course-catalog-sync')>('@/lib/server/course-catalog-sync');

function proposal() {
  return convertAiCourseCurriculum({ modules: [{ name: 'Safe work', description: '', lessons: [
    { title: 'Safety & tools', content: '<Read>\n\nUse metric units.', quiz_questions: [
      { question: 'First action?', options: ['Inspect', 'Ignore'], correct_index: 0 },
      { question: 'Voltage?', options: ['230 V', '115 V'], correct_index: 0 },
    ] },
    { title: 'Assess', content: 'Check the site.', quiz_questions: [
      { question: 'RCD?', options: ['Bypass', 'Check'], correct_index: 1 },
    ] },
  ] }] }, { title: 'Australian safe work', description: '' }, { passPercentage: 81, attemptsAllowed: 4 });
}
function input() {
  const result = proposal();
  return { ...result.snapshot.course, isFree: true, priceAud: 0, published: false,
    cecHours: 0, iicrcDiscipline: null, modules: result.modules };
}
let native: CourseWithCurriculum;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.approvals.length = 0;
  mocks.ensure.mockReset();
  mocks.session.mockResolvedValue({ id: 'admin' });
  native = { modules: [], quizzes: [], updatedAt: new Date(), durationHours: null,
    shortDescription: null, thumbnailUrl: null, level: null } as unknown as CourseWithCurriculum;
  mocks.find.mockResolvedValue(null);
  mocks.read.mockImplementation(async () => native);
  mocks.courseCreate.mockImplementation(async ({ data }) => Object.assign(native, data));
  mocks.courseUpdate.mockImplementation(async ({ data }) => Object.assign(native, data));
  mocks.moduleCreate.mockImplementation(async ({ data }) => native.modules.push({ ...data, lessons: [] }));
  mocks.lessonCreate.mockImplementation(async ({ data }) => native.modules.find((m) => m.id === data.moduleId)!.lessons.push(data));
  mocks.quizCreate.mockImplementation(async ({ data }) => native.quizzes.push({ ...data, timeLimitMinutes: null, questions: [] }));
  mocks.quizUpsert.mockImplementation(async ({ create }) => native.quizzes.push({ ...create, questions: [] }));
  mocks.questionCreate.mockImplementation(async ({ data }) => native.quizzes.find((q) => q.id === data.quizId)!.questions.push({ id: randomUUID(), ...data }));
  mocks.transaction.mockImplementation(async (run) => run({
    lmsCourse: { create: mocks.courseCreate, update: mocks.courseUpdate },
    lmsModule: { create: mocks.moduleCreate }, lmsLesson: { create: mocks.lessonCreate },
    lmsQuiz: { create: mocks.quizCreate, deleteMany: mocks.quizPrune, upsert: mocks.quizUpsert },
    lmsQuizQuestion: { create: mocks.questionCreate, deleteMany: mocks.questionDelete },
  }));
});

describe('structured HTTP responses', () => {
  const request = (method: string, body: unknown) => new NextRequest('https://example.test/api/admin/courses', {
    method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
  });
  it('returns 400 for malformed structured requests before persistence', async () => {
    vi.stubEnv('DATABASE_URL', 'unused-mocked-database');
    try {
      const body = input(); Object.assign(body.modules[0], { id: 'forbidden' });
      expect((await POST(request('POST', body))).status).toBe(400);
      expect((await PATCH(request('PATCH', body), { params: Promise.resolve({ id: 'id' }) })).status).toBe(400);
      expect(mocks.transaction).not.toHaveBeenCalled();
      expect(mocks.ensure).not.toHaveBeenCalled();
    } finally { vi.unstubAllEnvs(); }
  });
  it('returns 409 for structured and flattening PATCH, retaining auth precedence', async () => {
    vi.stubEnv('DATABASE_URL', 'unused-mocked-database');
    try {
      await adminCreateCourse(input()); mocks.find.mockResolvedValue(native); mocks.transaction.mockClear();
      const ctx = { params: Promise.resolve({ id: native.id }) };
      expect((await PATCH(request('PATCH', input()), ctx)).status).toBe(409);
      expect((await PATCH(request('PATCH', { ...input(), modules: [{ title: 'Legacy' }] }), ctx)).status).toBe(409);
      expect(mocks.transaction).not.toHaveBeenCalled();
      mocks.session.mockResolvedValue(null);
      expect((await POST(request('POST', input()))).status).toBe(401);
      expect((await PATCH(request('PATCH', input()), ctx)).status).toBe(401);
    } finally { vi.unstubAllEnvs(); }
  });
});

describe('create-only structured native curriculum', () => {
  it('retains the upstream optional category contract in structured creation', async () => {
    const body = { ...input(), category: '  Original CARSI learning  ' };
    expect(parseAdminCourseWriteBody(body)).not.toBeNull();
    await adminCreateCourse(body);
    expect(native.category).toBe('Original CARSI learning');
    expect(courseToAdminDto(native).category).toBe('Original CARSI learning');
    expect(parseAdminCourseWriteBody({ ...body, category: 42 })).toBeNull();
  });
  it.each([
    { slug: 'synthetic-approval-identity' },
    { slug: '  SYNTHETIC-APPROVAL-IDENTITY  ' },
    { title: ' Synthetic Approval Identity ' },
    { slug: ' ', title: 'SYNTHETIC APPROVAL IDENTITY' },
  ])('denies reserved registry identity before any writes: %j', async (override) => {
    mocks.approvals.push({ slug: 'synthetic-approval-identity', status: 'approved', approvedHours: 3 });
    // Reproduce the licence-critical mismatch: registry identity overrides explicit zero.
    expect(resolveLmsCourseCecHours({ slug: 'synthetic-approval-identity', cecHours: 0 })).toBe(3);
    await expect(adminCreateCourse({ ...input(), ...override })).rejects.toThrow('INVALID_STRUCTURED_CURRICULUM');
    expect(mocks.ensure).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it.each(['submitted', 'not_submitted'] as const)('reserves %s registry identities as well', async (status) => {
    mocks.approvals.push({ slug: 'reserved', status });
    await expect(adminCreateCourse({ ...input(), slug: 'reserved' })).rejects.toThrow('INVALID_STRUCTURED_CURRICULUM');
    expect(mocks.ensure).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('denies a reserved generated collision suffix before instructor/transaction writes', async () => {
    mocks.approvals.push({ slug: 'candidate-feedface', status: 'approved', approvedHours: 3 });
    mocks.find.mockResolvedValueOnce({ id: 'existing' }).mockResolvedValueOnce(null);
    vi.mocked(randomUUID).mockReturnValueOnce('feedface-1111-4111-8111-111111111111');
    await expect(adminCreateCourse({ ...input(), slug: 'candidate' })).rejects.toThrow('INVALID_STRUCTURED_CURRICULUM');
    expect(mocks.find).toHaveBeenNthCalledWith(2, { where: { slug: 'candidate-feedface' } });
    expect(mocks.ensure).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('keeps legacy registry-slug behaviour and its default instructor prerequisite', async () => {
    mocks.approvals.push({ slug: 'reserved', status: 'approved', approvedHours: 3 });
    await adminCreateCourse({ ...input(), slug: 'reserved', modules: [{ title: 'Legacy', textContent: 'Legacy body' }] });
    expect(native.slug).toBe('reserved');
    expect(mocks.ensure).toHaveBeenCalledExactlyOnceWith();
  });

  it('rolls back a missing technical instructor using the real helper on the same transaction', async () => {
    const users: object[] = [];
    const tx = {
      lmsUser: {
        findUnique: vi.fn(async () => null),
        upsert: vi.fn(async ({ create }: { create: object }) => { users.push(create); return create; }),
      },
      lmsCourse: { create: vi.fn(async () => { throw new Error('injected transaction failure'); }) },
    };
    mocks.ensure.mockImplementation(realEnsureCatalogInstructor);
    mocks.transaction.mockImplementation(async (run) => {
      const countBefore = users.length;
      try { return await run(tx); }
      catch (error) { users.length = countBefore; throw error; }
    });
    await expect(adminCreateCourse(input())).rejects.toThrow('injected transaction failure');
    expect(mocks.ensure).toHaveBeenCalledExactlyOnceWith(tx);
    expect(tx.lmsUser.findUnique).toHaveBeenCalledTimes(1);
    expect(tx.lmsUser.upsert).toHaveBeenCalledTimes(1);
    expect(tx.lmsCourse.create).toHaveBeenCalledTimes(1);
    expect(users).toEqual([]);
    expect(native.modules).toEqual([]);
    expect(native.quizzes).toEqual([]);
  });

  it('persists plural quizzes and reconstructs exact converter bytes from native rows', async () => {
    await adminCreateCourse(input());
    expect(mocks.quizCreate).toHaveBeenCalledTimes(2);
    expect(new Set(native.quizzes.map((q) => q.id)).size).toBe(2);
    expect(mocks.questionCreate).toHaveBeenCalledTimes(3);
    expect(mocks.quizPrune).not.toHaveBeenCalled();
    expect(mocks.quizUpsert).not.toHaveBeenCalled();
    expect(mocks.questionDelete).not.toHaveBeenCalled();
    expect(native.modules.flatMap((mod) => mod.lessons).every((lesson) => lesson.isPreview === false)).toBe(true);
    const observed = readAdminCourseCurriculum(native);
    expect(observed).toEqual(proposal());
    expect(native.description).toBe('');
    const dto = courseToAdminDto(native);
    expect(dto.description).toBe('');
    expect(dto.modules[0].lessons).toHaveLength(4);
    expect(dto.modules[0].description).toBe('');
    expect(dto.modules[0].lessons![3]).toMatchObject({ quiz: { questions: [{ correctIndex: 1, points: 1 }] } });
    expect(Object.keys((native.meta as Record<string, object>).curriculumPersistence).sort())
      .toEqual(['courseId', 'format', 'mappingVersion', 'modules']);
  });

  const invalidCases: [string, (body: ReturnType<typeof input>) => void][] = [
    ['mixed legacy', (body) => Object.assign(body.modules[0], { textContent: 'overwrite' })],
    ['caller ID', (body) => Object.assign(body.modules[0], { id: 'existing' })],
    ['resources', (body) => Object.assign(body.modules[0].lessons[0], { resources: [] })],
    ['reserved metadata', (body) => Object.assign(body, { meta: { curriculumPersistence: {} } })],
    ['missing course description', (body) => { Reflect.deleteProperty(body, 'description'); }],
    ['missing module description', (body) => { Reflect.deleteProperty(body.modules[0], 'description'); }],
    ['missing pair', (body) => { body.modules[0].lessons.pop(); }],
    ['wrong source', (body) => { body.modules[0].lessons[1].sourceLessonIndex = 9; }],
    ['wrong title', (body) => { body.modules[0].lessons[1].title = 'Other'; }],
    ['sparse modules', (body) => { body.modules.length = 2; }],
    ['sparse lessons', (body) => { delete body.modules[0].lessons[1]; }],
    ['blank title', (body) => { body.modules[0].title = ' '; }],
    ['invalid publishing', (body) => { body.published = true; }],
    ['CEC claim', (body) => { body.cecHours = 1; }],
    ['policy fraction', (body) => { const lesson = body.modules[0].lessons[1]; if (lesson.kind === 'assessment') lesson.quiz.passPercentage = 80.5; }],
    ['policy overflow', (body) => { const lesson = body.modules[0].lessons[1]; if (lesson.kind === 'assessment') lesson.quiz.attemptsAllowed = 2147483648; }],
    ['answer fraction', (body) => { const lesson = body.modules[0].lessons[1]; if (lesson.kind === 'assessment') lesson.quiz.questions[0].correctIndex = 0.5; }],
    ['sparse options', (body) => { const lesson = body.modules[0].lessons[1]; if (lesson.kind === 'assessment') delete lesson.quiz.questions[0].options[0]; }],
    ['points', (body) => { const lesson = body.modules[0].lessons[1]; if (lesson.kind === 'assessment') Object.assign(lesson.quiz.questions[0], { points: 2 }); }],
  ];
  it.each(invalidCases)('rejects %s before any writes, including direct callers', async (_name, mutate) => {
    const body = input(); mutate(body);
    expect(parseAdminCourseWriteBody(body)).toBeNull();
    await expect(adminCreateCourse(body)).rejects.toThrow('INVALID_STRUCTURED_CURRICULUM');
    expect(mocks.ensure).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it('preserves null/empty descriptions and normalises textual converter metadata', async () => {
    const body = input(); body.description = null; body.modules[0].description = null;
    body.title = ' Australian\r\nsafe work ';
    expect(validateStructuredCourse(body).title).toBe('Australian\nsafe work');
    await adminCreateCourse(body);
    expect(readAdminCourseCurriculum(native).snapshot.course.description).toBeNull();
    expect(readAdminCourseCurriculum(native).modules[0].description).toBeNull();
  });

  it('keeps marker invisible to learners and preserves it during video resource merge', async () => {
    await adminCreateCourse(input());
    const resources = native.modules[0].lessons[0].resources;
    expect(parseLessonResources(resources)).toEqual([]);
    const merged = mergeVideoResource(resources, { kind: 'video', label: 'Video', url: 'https://example.test/video', language: 'en-AU' });
    expect(merged[0]).toEqual((resources as unknown[])[0]);
    native.modules[0].lessons[0].resources = merged;
    expect(readAdminCourseCurriculum(native).sha256).toBe(proposal().sha256);
  });

  it.each(['primary', 'malformed', 'secondary', 'malformed secondary', 'wrapped secondary'])('blocks flattening update for %s markers before mutation', async (mode) => {
    await adminCreateCourse(input());
    if (mode === 'malformed') native.meta = { curriculumPersistence: null };
    if (mode === 'secondary') native.meta = {};
    if (mode.includes('secondary') && mode !== 'secondary') {
      native.meta = {};
      native.modules.forEach((mod) => mod.lessons.forEach((lesson) => {
        const marker = (lesson.resources as object[])[0];
        lesson.resources = mode === 'malformed secondary' ? marker : { malformed: marker };
      }));
    }
    mocks.find.mockResolvedValue(native);
    mocks.transaction.mockClear();
    const before = JSON.stringify(native);
    await expect(adminUpdateCourse(native.id, { ...input(), modules: [{ title: 'Flatten', textContent: 'Lost quizzes' }] }))
      .rejects.toThrow('STRUCTURED_CURRICULUM_EDIT_BLOCKED');
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(JSON.stringify(native)).toBe(before);
  });

  it('rejects structured updates even on unmarked courses without consulting the database', async () => {
    await expect(adminUpdateCourse('id', input())).rejects.toThrow('STRUCTURED_CURRICULUM_EDIT_BLOCKED');
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it('retains the legacy parser and single-quiz writer behaviour', async () => {
    const body = parseAdminCourseWriteBody({ title: ' Legacy ', modules: [{ title: 'Module', textContent: 'Text',
      quiz: { questions: [{ questionText: 'Question', options: [' a ', 'b'], correctIndex: 1 }] } }] })!;
    expect(body.title).toBe('Legacy');
    expect(body.modules[0].quiz!.questions[0].options).toEqual(['a', 'b']);
    await adminCreateCourse(body);
    expect(mocks.quizUpsert).toHaveBeenCalledTimes(1);
    expect(mocks.questionDelete).toHaveBeenCalledTimes(1);
    expect(mocks.quizPrune).toHaveBeenCalledTimes(1);
    expect(mocks.lessonCreate.mock.calls[0][0].data.contentBody).toBe('<p>Text</p>');
    expect(mocks.lessonCreate.mock.calls[0][0].data.isPreview).toBe(true);
  });

  it('retains legacy updates for unmarked courses', async () => {
    mocks.find.mockResolvedValue({ ...native, id: 'legacy', meta: null, modules: [] });
    await adminUpdateCourse('legacy', { ...input(), modules: [{ title: 'Legacy module', textContent: 'Existing path' }] });
    expect(mocks.courseUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.quizPrune).toHaveBeenCalledTimes(1);
    expect(mocks.lessonCreate.mock.calls[0][0].data.contentBody).toBe('<p>Existing path</p>');
  });
});

describe('independent native observation', () => {
  const corruptions: [string, () => void][] = [
    ['module ownership', () => { native.modules[0].courseId = 'other'; }],
    ['lesson ownership', () => { native.modules[0].lessons[0].moduleId = 'other'; }],
    ['question ownership', () => { native.quizzes[0].questions[0].quizId = 'other'; }],
    ['module order', () => { native.modules[0].orderIndex = 1; }],
    ['lesson order', () => { native.modules[0].lessons[1].orderIndex = 4; }],
    ['question order', () => { native.quizzes[0].questions[0].orderIndex = 1; }],
    ['quiz relation', () => { native.modules[0].lessons[1].contentBody = native.quizzes[1].id; }],
    ['bad points', () => { native.quizzes[0].questions[0].points = 2; }],
    ['bad policy', () => { native.quizzes[0].passPercentage = 0; }],
    ['extra quiz', () => { native.quizzes.push({ ...native.quizzes[0], id: randomUUID() }); }],
    ['extra lesson', () => { native.modules[0].lessons.push({ ...native.modules[0].lessons[0], id: randomUUID() }); }],
    ['missing marker', () => { native.modules[0].lessons[0].resources = []; }],
    ['public preview', () => { native.modules[0].lessons[0].isPreview = true; }],
    ['marker ownership', () => { Object.assign((native.modules[0].lessons[0].resources as object[])[0], { courseId: 'other' }); }],
    ['duplicate marker', () => { const lesson = native.modules[0].lessons[0]; lesson.resources = [...lesson.resources as object[], ...(lesson.resources as object[])]; }],
    ['marker content copy', () => { Object.assign((native.modules[0].lessons[0].resources as object[])[0], { content: 'copy' }); }],
    ['primary extra snapshot', () => { Object.assign((native.meta as Record<string, object>).curriculumPersistence, { snapshot: {} }); }],
    ['missing primary', () => { native.meta = {}; }],
    ['duplicate question ID', () => { native.quizzes[0].questions[1].id = native.quizzes[0].questions[0].id; }],
    ['noncanonical question', () => { native.quizzes[0].questions[0].questionText += ' '; }],
  ];
  it.each(corruptions)('rejects %s', async (_name, mutate) => {
    await adminCreateCourse(input()); mutate();
    expect(() => readAdminCourseCurriculum(native)).toThrow('INVALID_STRUCTURED_CURRICULUM');
  });
  it.each(['content', 'policy', 'answer'])('changes digest on valid %s edits', async (field) => {
    await adminCreateCourse(input());
    if (field === 'content') native.modules[0].lessons[0].contentBody += '<p>Changed.</p>';
    if (field === 'policy') native.quizzes[0].passPercentage = 82;
    if (field === 'answer') native.quizzes[0].questions[0].correctIndex = 1;
    expect(readAdminCourseCurriculum(native).sha256).not.toBe(proposal().sha256);
  });
});
