import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@/generated/prisma/client';
import { CheckpointError, parseCheckpointInput, parseStoredCheckpoint, type CheckpointInput } from '@/lib/lms/lesson-checkpoint';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/server/upstream-api', () => ({ getUpstreamBaseUrl: () => null }));
import { getLessonCheckpoint, saveLessonCheckpoint } from './lesson-checkpoint';

const studentId = '10000000-0000-4000-8000-000000000001';
const lessonId = '10000000-0000-4000-8000-000000000002';
const quizId = '10000000-0000-4000-8000-000000000003';
const questionId = '10000000-0000-4000-8000-000000000004';
let stored: unknown;
let pointer: string | null;
let granted: boolean;
let failPointer: boolean;
let serializeOnce: boolean;
let executions: number;
let contentType: string;
let contentBody: string | undefined;
let resources: unknown;
let correctIndex: number;
let foreignQuiz: boolean;
let writes: string[];
let attemptVersion: string | null;
let durationMinutes: number | null;

const client = {
  $transaction: vi.fn(async (fn, options) => {
    expect(options.isolationLevel).toBe('Serializable');
    executions++;
    if (serializeOnce && executions === 1) throw { code: 'P2034' };
    const prior = stored;
    const oldPointer = pointer;
    const tx = {
      $queryRaw: vi.fn(async (sql: TemplateStringsArray) => {
        const query = sql.join('?');
        if (query.includes('JOIN lms_modules')) return granted ? [{ enrollmentId: '10000000-0000-4000-8000-000000000005',
          courseId: '10000000-0000-4000-8000-000000000006', moduleId: '10000000-0000-4000-8000-000000000007',
          lessonId, title: 'Original synthetic lesson', contentType, contentBody: contentBody ?? (contentType === 'quiz' ? quizId : 'Original text'),
          courseSlug: 'original-course', courseTitle: 'Original course',
          resources, orderIndex: 0, isPreview: false, durationMinutes }] : [];
        if (query.includes('FROM lms_quizzes')) return [{ id: quizId, courseId: foreignQuiz ? 'foreign' : '10000000-0000-4000-8000-000000000006',
          title: 'Quiz', passPercentage: 80, timeLimitMinutes: null, attemptsAllowed: 2 }];
        if (query.includes('FROM lms_quiz_questions')) return [{ id: questionId, questionText: 'Original question?',
          options: [{ text: 'A' }, { text: 'B' }], correctIndex, orderIndex: 0, points: 1 }];
        if (query.includes('FROM lms_lesson_progress')) return stored === null ? [] : [{ checkpoint: stored }];
        if (query.includes('COUNT(*)')) return [{ count: 1 }];
        if (query.includes('FROM lms_quiz_attempts')) {
          expect(query).toContain('ORDER BY COALESCE(content_version =');
          return [{ id: quizId, scorePercent: 100, passed: true, createdAt: new Date('2026-10-08T00:00:00Z'), contentVersion: attemptVersion }];
        }
        throw new Error('Unrecognized query');
      }),
      $executeRaw: vi.fn(async (sql: TemplateStringsArray, ...values: unknown[]) => {
        const query = sql.join('?');
        writes.push(query);
        if (query.includes('INSERT INTO lms_lesson_progress')) {
          stored = JSON.parse(values[3] as string);
          return 1;
        }
        if (failPointer) throw new Error('Synthetic pointer failure');
        pointer = values[0] as string;
        return 1;
      }),
    };
    try { return await fn(tx); } catch (error) { stored = prior; pointer = oldPointer; throw error; }
  }),
} as unknown as PrismaClient;

async function input(): Promise<CheckpointInput> {
  const current = await getLessonCheckpoint(studentId, lessonId, client);
  return { expectedRevision: current.revision, contentVersion: current.contentVersion,
    position: { kind: contentType === 'quiz' ? 'quiz' : 'reading', value: 0 },
    answers: contentType === 'quiz' ? { [questionId]: 1 } : {} };
}

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', 'synthetic-secret-with-more-than-32-characters');
  stored = null; pointer = null; granted = true; failPointer = false; serializeOnce = false;
  executions = 0; contentType = 'quiz'; contentBody = undefined; resources = []; correctIndex = 1; foreignQuiz = false; writes = []; attemptVersion = null;
  durationMinutes = null;
});
afterEach(() => vi.unstubAllEnvs());

describe('durable checkpoint service', () => {
  it('preserves native lesson duration and binds duration edits to the content version', async () => {
    durationMinutes = 12;
    const snapshot = await getLessonCheckpoint(studentId, lessonId, client);
    expect(snapshot.content.lesson.duration_minutes).toBe(12);
    durationMinutes = 15;
    const edited = await getLessonCheckpoint(studentId, lessonId, client);
    expect(edited.content.lesson.duration_minutes).toBe(15);
    expect(edited.contentVersion).not.toBe(snapshot.contentVersion);
  });
  it('recovers acknowledged data with exact draft answers and historical passed attempt', async () => {
    const saved = await saveLessonCheckpoint(studentId, lessonId, await input(), client);
    expect(saved.checkpoint?.answers).toEqual({ [questionId]: 1 });
    expect(saved.revision).toBe(1);
    expect(pointer).toBe(lessonId);
    expect(await getLessonCheckpoint(studentId, lessonId, client)).toEqual(saved);
    expect(saved.passedAttempt?.versionVerified).toBe(false);
    expect(writes).toHaveLength(2);
    expect(writes.join('')).not.toMatch(/completed|INSERT INTO lms_quiz_attempts|correct_index/);
    expect(JSON.stringify(saved)).not.toMatch(/correctIndex|correct_index|synthetic-secret/);
    expect(saved.content.quiz?.questions[0]).toEqual({ id: questionId, question_text: 'Original question?',
      question_type: 'single_choice', options: [{ text: 'A' }, { text: 'B' }], order_index: 0, points: 1 });
    expect(saved.content.quiz?.attempts_used).toBe(1);
    expect(saved.content.course).toEqual({ id: '10000000-0000-4000-8000-000000000006', slug: 'original-course', title: 'Original course' });
  });
  it('rejects the second stale revision without changing saved state', async () => {
    const draft = await input();
    await saveLessonCheckpoint(studentId, lessonId, draft, client);
    const saved = stored;
    await expect(saveLessonCheckpoint(studentId, lessonId, draft, client)).rejects.toMatchObject({ status: 409 });
    expect(stored).toBe(saved);
  });
  it('hides stale drafts when only the private grading key changes, then explicitly resets monotonically', async () => {
    const draft = await input();
    await saveLessonCheckpoint(studentId, lessonId, draft, client);
    correctIndex = 0;
    const stale = await getLessonCheckpoint(studentId, lessonId, client);
    expect(stale).toMatchObject({ revision: 1, stale: true, checkpoint: null });
    expect(stale.contentVersion).not.toBe(draft.contentVersion);
    await expect(saveLessonCheckpoint(studentId, lessonId, { ...draft, expectedRevision: 1 }, client)).rejects.toMatchObject({ status: 409 });
    await expect(saveLessonCheckpoint(studentId, lessonId, { ...draft, expectedRevision: 1,
      contentVersion: stale.contentVersion }, client)).rejects.toMatchObject({ status: 409 });
    const reset = await saveLessonCheckpoint(studentId, lessonId, { ...draft, expectedRevision: 1,
      contentVersion: stale.contentVersion, answers: {}, reset: true }, client);
    expect(reset).toMatchObject({ revision: 2, stale: false, checkpoint: { answers: {} } });
  });
  it('invalidates saved data after secret rotation', async () => {
    await saveLessonCheckpoint(studentId, lessonId, await input(), client);
    vi.stubEnv('JWT_SECRET', 'different-synthetic-secret-more-than-32-characters');
    expect(await getLessonCheckpoint(studentId, lessonId, client)).toMatchObject({ stale: true, checkpoint: null, revision: 1 });
  });
  it('labels a persisted pass verified only for the current locked content version', async () => {
    const draft = await input();
    attemptVersion = draft.contentVersion;
    expect((await getLessonCheckpoint(studentId, lessonId, client)).passedAttempt?.versionVerified).toBe(true);
    correctIndex = 0;
    expect((await getLessonCheckpoint(studentId, lessonId, client)).passedAttempt?.versionVerified).toBe(false);
    vi.stubEnv('JWT_SECRET', 'rotated-synthetic-secret-with-more-than-32-characters');
    expect((await getLessonCheckpoint(studentId, lessonId, client)).passedAttempt?.versionVerified).toBe(false);
  });
  it('preserves native Drive identity alongside an associated quiz and binds playback edits to the version', async () => {
    contentType = 'drive_file'; contentBody = '  synthetic-drive-file-id  '; resources = [{ url: `quiz:${quizId}` }];
    const snapshot = await getLessonCheckpoint(studentId, lessonId, client);
    expect(snapshot.content.lesson).toMatchObject({ content_type: 'drive_file', content_body: contentBody,
      drive_file_id: 'synthetic-drive-file-id', duration_minutes: null });
    expect(snapshot.content.resources).toEqual([{ url: `quiz:${quizId}`, label: 'Resource' }]);
    expect(snapshot.content.quiz?.id).toBe(quizId);
    expect(JSON.stringify(snapshot)).not.toMatch(/correctIndex|correct_index|synthetic-secret/);
    contentBody = 'different-synthetic-drive-file-id';
    const edited = await getLessonCheckpoint(studentId, lessonId, client);
    expect(edited.contentVersion).not.toBe(snapshot.contentVersion);
    expect(edited.content.lesson.drive_file_id).toBe(contentBody);
  });
  it.each(['', 'short', ' '.repeat(40)])('fails closed on weak signing configuration (%s)', async (secret) => {
    vi.stubEnv('JWT_SECRET', secret);
    await expect(getLessonCheckpoint(studentId, lessonId, client)).rejects.toMatchObject({ status: 503 });
    expect(executions).toBe(0);
  });
  it('denies absent or revoked enrolments without writes', async () => {
    granted = false;
    await expect(getLessonCheckpoint(studentId, lessonId, client)).rejects.toMatchObject({ status: 404 });
    expect(writes).toEqual([]);
  });
  it('rolls back checkpoint when the enrolment pointer fails', async () => {
    const draft = await input();
    failPointer = true;
    await expect(saveLessonCheckpoint(studentId, lessonId, draft, client)).rejects.toThrow('Synthetic pointer failure');
    expect(stored).toBeNull(); expect(pointer).toBeNull();
  });
  it('uses bounded serialization retry', async () => {
    serializeOnce = true;
    await getLessonCheckpoint(studentId, lessonId, client);
    expect(executions).toBe(2);
  });
  it('rejects foreign quizzes and ambiguous quiz associations', async () => {
    foreignQuiz = true;
    await expect(getLessonCheckpoint(studentId, lessonId, client)).rejects.toMatchObject({ status: 503 });
    foreignQuiz = false;
    resources = [{ url: 'quiz:10000000-0000-4000-8000-000000000099' }];
    await expect(getLessonCheckpoint(studentId, lessonId, client)).rejects.toMatchObject({ status: 503 });
  });
  it('rejects unknown questions, out-of-range choices and quiz position', async () => {
    const draft = await input();
    for (const candidate of [{ ...draft, answers: { [lessonId]: 0 } }, { ...draft, answers: { [questionId]: 2 } },
      { ...draft, position: { kind: 'quiz' as const, value: 1 } }]) {
      await expect(saveLessonCheckpoint(studentId, lessonId, candidate, client)).rejects.toMatchObject({ status: 400 });
    }
    expect(writes).toEqual([]);
  });
  it('requires empty drafts for reading and reset requests', async () => {
    contentType = 'text';
    const draft = await input();
    await expect(saveLessonCheckpoint(studentId, lessonId, { ...draft, answers: { [questionId]: 1 } }, client)).rejects.toMatchObject({ status: 400 });
    await expect(saveLessonCheckpoint(studentId, lessonId, { ...draft, position: { kind: 'reading', value: 3 }, reset: true }, client)).rejects.toMatchObject({ status: 400 });
    expect((await saveLessonCheckpoint(studentId, lessonId, { ...draft, position: { kind: 'reading', value: 5000 } }, client)).checkpoint?.position.value).toBe(5000);
  });
  it('fails closed on unsupported media and corrupt stored JSON', async () => {
    contentType = 'drive_file';
    await expect(getLessonCheckpoint(studentId, lessonId, client)).rejects.toMatchObject({ status: 503 });
    contentType = 'text'; stored = { revision: 1 };
    await expect(getLessonCheckpoint(studentId, lessonId, client)).rejects.toMatchObject({ status: 503 });
  });
});

describe('closed checkpoint contract', () => {
  const valid = { expectedRevision: 0, contentVersion: 'a'.repeat(64), position: { kind: 'reading', value: 0 }, answers: {} };
  it.each([null, [], { ...valid, studentId }, { ...valid, expectedRevision: -1 },
    { ...valid, expectedRevision: 0.5 }, { ...valid, contentVersion: 'A'.repeat(64) },
    { ...valid, position: { kind: 'reading', value: 10001 } }, { ...valid, position: { kind: 'video', value: 86400001 } },
    { ...valid, position: { kind: 'quiz', value: 200 } }, { ...valid, position: { kind: 'reading', value: 0, hidden: true } },
    { ...valid, answers: { bad: 0 } }, { ...valid, answers: { [questionId]: 1.5 } }, { ...valid, reset: 1 },
  ])('rejects malformed payload %#', (candidate) => expect(() => parseCheckpointInput(candidate)).toThrow(CheckpointError));
  it('does not repair stored invalid JSON', () => {
    expect(() => parseStoredCheckpoint(undefined)).toThrow(CheckpointError);
    expect(parseStoredCheckpoint(null)).toBeNull();
  });
});
