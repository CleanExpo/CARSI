import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import type { PrismaClient } from '@/generated/prisma/client';
import { readAdminCourseCurriculum } from '@/lib/admin/admin-course-curriculum-readback';
import { projectLearnerCourseMeta } from '@/lib/lms/learner-course-meta';
import type { CourseWithCurriculum } from '@/lib/server/course-catalog-sync';
import { convertAiCourseCurriculum } from './ai-course-curriculum';
import {
  buildShortCourseDelivery, configureShortCourseDelivery, parseShortCourseDeliveryInput,
  projectShortCourseDelivery, shortCourseCanonicalBytes, SHORT_COURSE_HASH_DOMAINS, ShortCourseProfileError,
} from './short-course-profile';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

function id(value: number) { return `10000000-0000-4000-8000-${String(value).padStart(12, '0')}`; }
function fixture(pairs = 6): CourseWithCurriculum {
  const courseId = id(1), moduleId = id(2);
  const lessons = Array.from({ length: pairs * 2 }, (_, index) => {
    const pair = Math.floor(index / 2), quizId = id(100 + pair);
    const lessonId = id(10 + index), reading = index % 2 === 0;
    return { id: lessonId, moduleId, orderIndex: index, title: `Lesson ${pair}${reading ? '' : ' \u2014 Knowledge check'}`,
      contentType: reading ? 'text' : 'quiz', contentBody: reading ? '<p>Original Australian scenario.</p>' : quizId,
      isPreview: false, resources: [{ kind: 'carsi-curriculum-v1-marker', mappingVersion: 1, courseId, moduleId,
        lessonId, lessonKind: reading ? 'reading' : 'assessment', sourceLessonIndex: pair,
        ...(!reading ? { quizId } : {}) }] };
  });
  return { id: courseId, title: 'Original course', description: null, status: 'draft', isPublished: false,
    cecHours: 0, iicrcDiscipline: null, durationHours: null,
    modules: [{ id: moduleId, courseId, title: 'Module', orderIndex: 0, lessons }],
    quizzes: Array.from({ length: pairs }, (_, index) => ({ id: id(100 + index), courseId,
      title: `Lesson ${index} \u2014 Knowledge check`, passPercentage: 80, attemptsAllowed: 2, timeLimitMinutes: null,
      questions: [{ id: id(200 + index), quizId: id(100 + index), orderIndex: 0,
        questionText: 'Choose safe preparation.', options: [{ text: 'Check' }, { text: 'Ignore' }], correctIndex: 0, points: 1 }] })),
    meta: { brand: 'CARSI Maintenance Company Onboarding', audience: 'Australian operators', curriculumPersistence: {
      format: 'carsi-curriculum-v1', mappingVersion: 1, courseId,
      modules: [{ moduleId, description: null, lessonBindings: lessons.map((lesson, index) => ({ lessonId: lesson.id,
        kind: index % 2 === 0 ? 'reading' : 'assessment', sourceLessonIndex: Math.floor(index / 2),
        ...(index % 2 ? { quizId: lesson.contentBody } : {}) })) }] } },
  } as unknown as CourseWithCurriculum;
}
function input(course = fixture()) {
  return { contentSha256: readAdminCourseCurriculum(course).sha256,
    sourceManifest: { version: 1, entries: [{ id: 'original-1', kind: 'carsi-original', sha256: 'a'.repeat(64),
      permissionEvidence: 'synthetic author declaration, not a rights audit' }] } };
}
function installed() {
  const course = fixture();
  const profile = buildShortCourseDelivery(course, input(course));
  course.meta = { ...course.meta as object, shortCourseDelivery: profile } as CourseWithCurriculum['meta'];
  course.durationHours = 1.5;
  return { course, profile };
}
function clientFor(course: CourseWithCurriculum | null) {
  const tx = { $queryRaw: vi.fn().mockResolvedValue(course ? [{ id: course.id }] : []),
    lmsCourse: { findUnique: vi.fn().mockResolvedValue(course), update: vi.fn().mockResolvedValue(course) } };
  const transaction = vi.fn(async (run: (arg: typeof tx) => unknown, options?: unknown) => {
    void options;
    return run(tx);
  });
  return { client: { $transaction: transaction } as unknown as PrismaClient, tx, transaction };
}

describe('short-course delivery binding', () => {
  it('defaults only six complete reading/assessment pairs to 90 minutes without changing curriculum digest', () => {
    const course = fixture(), before = structuredClone(course), content = readAdminCourseCurriculum(course).sha256;
    const profile = buildShortCourseDelivery(course, input(course));
    expect(profile.totalMinutes).toBe(90); expect(profile.sessions).toHaveLength(6);
    expect(profile.sessions.every((session) => session.plannedMinutes === 15)).toBe(true);
    expect(profile.sessions[0]).toEqual({ sessionId: `carsi-session:${id(10)}`, objective: 'Lesson 0', plannedMinutes: 15,
      readingLessonId: id(10), assessmentLessonId: id(11) });
    expect(course).toEqual(before); expect(readAdminCourseCurriculum(course).sha256).toBe(content);
    expect(buildShortCourseDelivery(course, input(course))).toEqual(profile);
  });
  it.each([[4, 15, 60], [8, 15, 120], [6, 10, 60]])('supports explicit %i complete sessions at %i minutes', (pairs, minutes, total) => {
    const course = fixture(pairs);
    const result = buildShortCourseDelivery(course, { ...input(course),
      sessions: Array.from({ length: pairs }, (_, index) => ({ objective: `Practise ${index}`, plannedMinutes: minutes })) });
    expect(result.totalMinutes).toBe(total);
  });
  it.each([4, 5, 7, 8])('requires explicit planning for %i pairs', (pairs) => {
    const course = fixture(pairs);
    expect(() => buildShortCourseDelivery(course, input(course))).toThrow(ShortCourseProfileError);
  });
  it.each([0, 9, 16, 10.5, NaN, Infinity, '15', null])('rejects invalid session minutes %j', (plannedMinutes) => {
    const course = fixture();
    expect(() => buildShortCourseDelivery(course, { ...input(course),
      sessions: Array.from({ length: 6 }, () => ({ objective: 'Prepare safely', plannedMinutes })) })).toThrow(ShortCourseProfileError);
  });
  it.each([[4, 10], [9, 15]])('rejects total outside the 60-120 range (%i x %i)', (pairs, plannedMinutes) => {
    const course = fixture(pairs);
    expect(() => buildShortCourseDelivery(course, { ...input(course),
      sessions: Array.from({ length: pairs }, () => ({ objective: 'Prepare safely', plannedMinutes })) })).toThrow(ShortCourseProfileError);
  });
  it('pins literal domain separation and UTF8 canonical array/newline bytes with independent hashes', () => {
    expect(SHORT_COURSE_HASH_DOMAINS).toEqual({ source: 'carsi:short-course:source:v1',
      mapping: 'carsi:short-course:mapping:v1', profile: 'carsi:short-course:profile:v1' });
    expect(shortCourseCanonicalBytes('carsi:short-course:source:v1', [1, [['original-1', 'carsi-original', 'a', 'evidence']]]))
      .toBe('["carsi:short-course:source:v1",1,[["original-1","carsi-original","a","evidence"]]]\n');
    const course = fixture(), profile = buildShortCourseDelivery(course, input(course));
    const sha = (bytes: string) => createHash('sha256').update(bytes, 'utf8').digest('hex');
    const sourceBytes = `["carsi:short-course:source:v1",1,[["original-1","carsi-original","${'a'.repeat(64)}","synthetic author declaration, not a rights audit"]]]\n`;
    expect(profile.sourceManifestSha256).toBe(sha(sourceBytes));
    const map = profile.sessions.map((session) => [session.sessionId, session.readingLessonId, session.assessmentLessonId]);
    expect(profile.sessionMappingSha256).toBe(sha(`${JSON.stringify(['carsi:short-course:mapping:v1', map])}\n`));
    const sessions = profile.sessions.map((session) => [session.sessionId, session.objective, session.plannedMinutes,
      session.readingLessonId, session.assessmentLessonId]);
    expect(profile.profileSha256).toBe(sha(`${JSON.stringify(['carsi:short-course:profile:v1', 1, 'carsi-short-courses-v1',
      profile.contentSha256, profile.sourceManifestSha256, profile.sessionMappingSha256, 90, sessions])}\n`));
  });
  it.each([
    null, { unknown: true }, { sessions: [] }, { sessions: Array(6) },
    { contentSha256: 'A'.repeat(64) }, { contentSha256: 'x' }, { sessions: undefined },
    { sourceManifest: { version: 2, entries: [] } },
  ])('rejects malformed top-level input %#', (change) => {
    expect(() => parseShortCourseDeliveryInput(change === null ? null : { ...input(), ...change })).toThrow(ShortCourseProfileError);
  });
  it.each([
    { kind: 'iicrc-standard' }, { id: ' ' }, { id: 'x'.repeat(101) }, { permissionEvidence: ' ' },
    { permissionEvidence: 'x'.repeat(1001) }, { sha256: 'A'.repeat(64) }, { rawBody: 'private standard text' },
  ])('rejects malformed source declaration %#', (change) => {
    const source = input().sourceManifest;
    expect(() => parseShortCourseDeliveryInput({ ...input(), sourceManifest: { ...source,
      entries: [{ ...source.entries[0], ...change }] } })).toThrow(ShortCourseProfileError);
  });
  it('rejects duplicate source IDs after trim and normalises declarations without retaining mutable arrays', () => {
    const raw = input(), entry = raw.sourceManifest.entries[0];
    expect(() => parseShortCourseDeliveryInput({ ...raw, sourceManifest: { version: 1,
      entries: [entry, { ...entry, id: ' original-1 ' }] } })).toThrow(ShortCourseProfileError);
    raw.sourceManifest.entries[0].id = ' original-1 ';
    const result = parseShortCourseDeliveryInput(raw);
    expect(result.sourceManifest.entries[0].id).toBe('original-1');
    raw.sourceManifest.entries[0].id = 'changed'; expect(result.sourceManifest.entries[0].id).toBe('original-1');
  });
  it('rejects sparse, empty, oversized and unknown nested source manifests', () => {
    const raw = input(), entry = raw.sourceManifest.entries[0];
    for (const sourceManifest of [{ version: 1, entries: [] }, { version: 1, entries: Array(2) },
      { version: 1, entries: Array.from({ length: 21 }, (_, index) => ({ ...entry, id: String(index) })) },
      { ...raw.sourceManifest, permissionVerified: true }]) {
      expect(() => parseShortCourseDeliveryInput({ ...raw, sourceManifest })).toThrow(ShortCourseProfileError);
    }
  });
  it('rejects mismatched pair count, blank/overlong objectives and unknown session fields', () => {
    for (const sessions of [Array.from({ length: 4 }, () => ({ objective: 'Prepare', plannedMinutes: 15 })),
      Array.from({ length: 6 }, () => ({ objective: ' ', plannedMinutes: 15 })),
      Array.from({ length: 6 }, () => ({ objective: 'x'.repeat(301), plannedMinutes: 15 })),
      Array.from({ length: 6 }, () => ({ objective: 'Prepare', plannedMinutes: 15, correctIndex: 1 }))]) {
      expect(() => buildShortCourseDelivery(fixture(), { ...input(), sessions })).toThrow(ShortCourseProfileError);
    }
  });
  it('rejects stale expected content, duplicate native IDs and order gaps', () => {
    expect(() => buildShortCourseDelivery(fixture(), { ...input(), contentSha256: 'b'.repeat(64) })).toThrow(ShortCourseProfileError);
    const duplicate = fixture(); duplicate.modules[0].lessons[2].id = duplicate.modules[0].lessons[0].id;
    expect(() => buildShortCourseDelivery(duplicate, input())).toThrow(ShortCourseProfileError);
    const gap = fixture(); gap.modules[0].lessons[2].orderIndex = 8;
    expect(() => buildShortCourseDelivery(gap, input())).toThrow(ShortCourseProfileError);
  });
  it('projects only timing allowlist and preserves the frozen converter digest', () => {
    const { course, profile } = installed();
    expect(projectShortCourseDelivery(course)).toEqual({ profileId: profile.profileId, totalMinutes: 90, sessions: profile.sessions });
    const output = JSON.stringify(projectShortCourseDelivery(course));
    for (const secret of ['sha256', 'Sha256', 'sourceManifest', 'permissionEvidence', 'correctIndex', 'synthetic author']) {
      expect(output).not.toContain(secret);
    }
    expect(convertAiCourseCurriculum({ modules: [{ name: 'Module', lessons: [{ title: 'Lesson', content: 'Text',
      quiz_questions: [{ question: 'Question?', options: ['A', 'B'], correct_index: 1 }] }] }] },
    { title: 'Course' }, { passPercentage: 80, attemptsAllowed: 2 }).sha256)
      .toBe('a537e3b8301927871808ad66398b5081049a98dddd4d453c00a3e0995c149411');
  });
  it.each(['version', 'profileId', 'contentSha256', 'sourceManifestSha256', 'sessionMappingSha256', 'profileSha256', 'totalMinutes'])
  ('withholds timings when %s is tampered', (key) => {
    const { course } = installed();
    const profile = (course.meta as Record<string, unknown>).shortCourseDelivery as Record<string, unknown>;
    profile[key] = 'tampered'; expect(projectShortCourseDelivery(course)).toBeNull();
  });
  it.each(['sessionId', 'objective', 'plannedMinutes', 'readingLessonId', 'assessmentLessonId'])
  ('withholds timings when session %s is tampered', (key) => {
    const { course } = installed();
    const profile = (course.meta as Record<string, unknown>).shortCourseDelivery as { sessions: Record<string, unknown>[] };
    profile.sessions[0][key] = 'tampered'; expect(projectShortCourseDelivery(course)).toBeNull();
  });
  it.each(['id', 'kind', 'sha256', 'permissionEvidence'])('withholds timings when source %s is tampered', (key) => {
    const { course, profile } = installed();
    (profile.sourceManifest.entries[0] as Record<string, unknown>)[key] = key === 'sha256' ? 'b'.repeat(64) : 'changed';
    expect(projectShortCourseDelivery(course)).toBeNull();
  });
  it('withholds timings when pairs are reordered, missing or duplicated', () => {
    for (const mutation of ['reorder', 'missing', 'duplicate']) {
      const { course, profile } = installed();
      if (mutation === 'reorder') [profile.sessions[0], profile.sessions[1]] = [profile.sessions[1], profile.sessions[0]];
      else if (mutation === 'missing') profile.sessions.pop();
      else profile.sessions[1] = { ...profile.sessions[0] };
      expect(projectShortCourseDelivery(course)).toBeNull();
    }
  });
  it('withholds timings for stale graph, duration mismatch, unknown stored keys and source whitespace drift', () => {
    const one = installed(); one.course.modules[0].lessons[0].contentBody = '<p>Changed.</p>';
    expect(projectShortCourseDelivery(one.course)).toBeNull();
    const two = installed(); two.course.durationHours = 2; expect(projectShortCourseDelivery(two.course)).toBeNull();
    const three = installed(); Object.assign((three.course.meta as Record<string, unknown>).shortCourseDelivery as object, { extra: true });
    expect(projectShortCourseDelivery(three.course)).toBeNull();
    const four = installed(); four.profile.sourceManifest.entries[0].id = ' original-1 ';
    expect(projectShortCourseDelivery(four.course)).toBeNull();
  });
  it.each([null, 'private', { arbitrary: 'private', sourceManifest: 'private' }])('always strips malformed private metadata %#', (privateProfile) => {
    const meta = { brand: 'CARSI Maintenance Company Onboarding', pricing: { amountAud: 99 }, shortCourseDelivery: privateProfile };
    expect(projectLearnerCourseMeta(meta)).toEqual({ brand: meta.brand, pricing: meta.pricing });
    expect(meta.shortCourseDelivery).toBe(privateProfile);
  });
  it('strips valid private namespace and rejects nonobject metadata', () => {
    const { course } = installed(); expect(projectLearnerCourseMeta(course.meta)).not.toHaveProperty('shortCourseDelivery');
    for (const raw of [null, 1, 'x', []]) expect(projectLearnerCourseMeta(raw)).toBeNull();
  });
});

describe('configure delivery profile transaction', () => {
  it('locks and writes metadata/duration atomically, preserving existing keys and flags', async () => {
    const course = fixture(), { client, tx, transaction } = clientFor(course);
    const profile = await configureShortCourseDelivery(course.id, input(course), client);
    expect(transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'Serializable' });
    expect(tx.$queryRaw.mock.calls[0][0].join('')).toContain('FOR UPDATE');
    expect(tx.lmsCourse.update).toHaveBeenCalledExactlyOnceWith({ where: { id: course.id }, data: {
      meta: { ...course.meta as object, shortCourseDelivery: profile }, durationHours: 1.5 } });
    expect(tx.lmsCourse.update.mock.calls[0][0].data).not.toHaveProperty('isPublished');
  });
  it('identical reviewed profile is idempotent without a write', async () => {
    const { course, profile } = installed(), { client, tx } = clientFor(course);
    expect(await configureShortCourseDelivery(course.id, input(course), client)).toEqual(profile);
    expect(tx.lmsCourse.update).not.toHaveBeenCalled();
  });
  it.each([{ status: 'published' }, { isPublished: true }, { cecHours: 3 }, { cecHours: null },
    { iicrcDiscipline: 'WRT' }, { durationHours: 2 }])('checks state and duration before idempotent success %#', async (change) => {
    const { course } = installed(); Object.assign(course, change); const { client, tx } = clientFor(course);
    await expect(configureShortCourseDelivery(course.id, input(course), client)).rejects.toMatchObject({ status: 409 });
    expect(tx.lmsCourse.update).not.toHaveBeenCalled();
  });
  it('rejects differing or malformed existing profile without overwrite', async () => {
    const { course } = installed(), { client, tx } = clientFor(course);
    await expect(configureShortCourseDelivery(course.id, { ...input(course),
      sessions: Array.from({ length: 6 }, () => ({ objective: 'Different objective', plannedMinutes: 15 })) }, client))
      .rejects.toMatchObject({ status: 409 });
    (course.meta as Record<string, unknown>).shortCourseDelivery = null;
    await expect(configureShortCourseDelivery(course.id, input(course), client)).rejects.toMatchObject({ status: 409 });
    expect(tx.lmsCourse.update).not.toHaveBeenCalled();
  });
  it('returns 404 for missing course or invalid identity and propagates update failure without a second write', async () => {
    const missing = clientFor(null);
    await expect(configureShortCourseDelivery(id(1), input(), missing.client)).rejects.toMatchObject({ status: 404 });
    await expect(configureShortCourseDelivery('bad', input(), missing.client)).rejects.toMatchObject({ status: 404 });
    const course = fixture(), failing = clientFor(course); failing.tx.lmsCourse.update.mockRejectedValue(new Error('synthetic injected failure'));
    await expect(configureShortCourseDelivery(course.id, input(course), failing.client)).rejects.toThrow('synthetic injected failure');
    expect(failing.tx.lmsCourse.update).toHaveBeenCalledTimes(1); expect(course.durationHours).toBeNull();
  });
  it('bounds serialization retries to three attempts', async () => {
    const course = fixture(), context = clientFor(course);
    context.transaction.mockRejectedValue({ code: 'P2034' });
    await expect(configureShortCourseDelivery(course.id, input(course), context.client)).rejects.toEqual({ code: 'P2034' });
    expect(context.transaction).toHaveBeenCalledTimes(3);
  });
});
