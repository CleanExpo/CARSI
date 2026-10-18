/**
 * Quiz-loop review round 2: an admin course save must never erase a module's quiz or its authored
 * explanations, and an explanation-only edit must keep question ids (and so the lesson's content
 * version) unchanged, so no learner's in-progress quiz goes stale.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { syncModuleLessons, writeModuleQuiz } from './admin-courses-service';

const WHY = 'A reading above the dry standard for that material means it is still wet.';
const saved = [
  {
    id: 'q-1',
    questionText: 'Which reading shows wet timber?',
    options: [{ text: 'A' }, { text: 'B' }],
    correctIndex: 1,
    points: 1,
    explanation: null as string | null,
  },
  {
    id: 'q-2',
    questionText: 'When does drying stop?',
    options: [{ text: 'A' }, { text: 'B' }],
    correctIndex: 0,
    points: 1,
    explanation: WHY as string | null,
  },
];

function quizTx(rows: typeof saved) {
  const calls: string[] = [];
  const tx = {
    lmsQuiz: { upsert: vi.fn(async () => ({})) },
    lmsQuizQuestion: {
      findMany: vi.fn(async () => {
        calls.push('read');
        return rows.map((r) => ({ ...r }));
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { explanation: string | null };
        }) => {
          calls.push(`update:${where.id}:${data.explanation}`);
          return {};
        }
      ),
      deleteMany: vi.fn(async () => {
        calls.push('delete');
        return { count: rows.length };
      }),
      create: vi.fn(async ({ data }: { data: { explanation: string | null } }) => {
        calls.push(`create:${data.explanation}`);
        return data;
      }),
    },
  };
  return { tx, calls };
}

const sameQuestions = saved.map((r) => ({
  questionText: r.questionText,
  options: ['A', 'B'],
  correctIndex: r.correctIndex,
}));

describe('admin quiz save', () => {
  it('an explanation-only edit updates rows in place: no delete, no new question ids', async () => {
    const { tx, calls } = quizTx(saved);
    await writeModuleQuiz(tx as never, 'c1', 'Module', {
      id: 'quiz-1',
      questions: [{ ...sameQuestions[0], explanation: 'New why.' }, sameQuestions[1]],
    });
    expect(calls).toEqual(['read', 'update:q-1:New why.']);
  });

  it('an unchanged save touches nothing and keeps every saved explanation', async () => {
    const { tx, calls } = quizTx(saved);
    await writeModuleQuiz(tx as never, 'c1', 'Module', { id: 'quiz-1', questions: sameQuestions });
    expect(calls).toEqual(['read']);
  });

  it('a changed question set is rewritten, carrying explanations to questions with the same text', async () => {
    const { tx, calls } = quizTx(saved);
    await writeModuleQuiz(tx as never, 'c1', 'Module', {
      id: 'quiz-1',
      questions: [
        sameQuestions[1],
        { questionText: 'A brand-new question', options: ['A', 'B'], correctIndex: 0 },
      ],
    });
    expect(calls).toEqual(['read', 'delete', `create:${WHY}`, 'create:null']);
  });

  it('an editor save that omits quiz data keeps the module quiz lesson (it used to delete it)', async () => {
    const lessons: { op: string; contentType?: string; contentBody?: string | null }[] = [];
    const tx = {
      lmsLesson: {
        update: vi.fn(
          async ({ data }: { data: { contentType: string; contentBody: string | null } }) => {
            lessons.push({ op: 'update', ...data });
            return {};
          }
        ),
        create: vi.fn(
          async ({ data }: { data: { contentType: string; contentBody: string | null } }) => {
            lessons.push({ op: 'create', ...data });
            return {};
          }
        ),
        delete: vi.fn(async () => {
          lessons.push({ op: 'delete' });
          return {};
        }),
      },
      lmsQuizQuestion: { findMany: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
      lmsQuiz: { upsert: vi.fn() },
    };
    const kept = await syncModuleLessons(
      tx as never,
      'c1',
      'm1',
      'Module',
      'Reading',
      undefined,
      undefined,
      [
        { id: 'l1', orderIndex: 0, contentType: 'text', contentBody: 'Reading', isPreview: true },
        {
          id: 'l2',
          orderIndex: 1,
          contentType: 'quiz',
          contentBody: 'quiz-legacy',
          isPreview: false,
        },
      ],
      true
    );
    expect(kept).toEqual(['quiz-legacy']);
    expect(lessons.some((l) => l.op === 'delete')).toBe(false);
    expect(tx.lmsLesson.update).toHaveBeenCalledTimes(1);
    expect(tx.lmsLesson.update.mock.calls[0][0].where.id).toBe('l1');
    expect(tx.lmsQuizQuestion.deleteMany).not.toHaveBeenCalled();
  });

  // Quiz-loop review round 3: a lesson keeps its id when a reading or video is added or removed
  // around it, so learner progress and quiz checkpoints bound to that id survive the save.
  function lessonTx() {
    const ops: string[] = [];
    const tx = {
      lmsLesson: {
        update: vi.fn(async ({ where }: { where: { id: string } }) => {
          ops.push(`update:${where.id}`);
          return {};
        }),
        create: vi.fn(async ({ data }: { data: { contentType: string } }) => {
          ops.push(`create:${data.contentType}`);
          return {};
        }),
        delete: vi.fn(async ({ where }: { where: { id: string } }) => {
          ops.push(`delete:${where.id}`);
          return {};
        }),
      },
      lmsQuizQuestion: { findMany: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
      lmsQuiz: { upsert: vi.fn() },
    };
    return { tx, ops };
  }

  it('adding a video before an omitted quiz keeps the original quiz lesson id', async () => {
    const { tx, ops } = lessonTx();
    await syncModuleLessons(
      tx as never,
      'c1',
      'm1',
      'Module',
      'Reading',
      'https://video.example/v1',
      undefined,
      [
        { id: 'l1', orderIndex: 0, contentType: 'text', contentBody: 'Reading', isPreview: true },
        {
          id: 'l2',
          orderIndex: 1,
          contentType: 'quiz',
          contentBody: 'quiz-legacy',
          isPreview: false,
        },
      ],
      true
    );
    expect(ops).toEqual(['update:l1', 'create:video']);
  });

  it('removing the reading before a quiz keeps the quiz lesson id and deletes only the reading', async () => {
    const { tx, ops } = lessonTx();
    await syncModuleLessons(
      tx as never,
      'c1',
      'm1',
      'Module',
      undefined,
      'https://video.example/v1',
      undefined,
      [
        { id: 'l1', orderIndex: 0, contentType: 'text', contentBody: 'Reading', isPreview: true },
        {
          id: 'l2',
          orderIndex: 1,
          contentType: 'video',
          contentBody: 'https://video.example/v1',
          isPreview: false,
        },
        {
          id: 'l3',
          orderIndex: 2,
          contentType: 'quiz',
          contentBody: 'quiz-legacy',
          isPreview: false,
        },
      ],
      true
    );
    // Review round 10: the removed reading was the free preview, but a video (a URL) or a quiz (a
    // quiz id) is never promoted to the public text preview; no reading remains, so none is set.
    expect(ops).toEqual(['delete:l1', 'update:l2']);
    expect(
      tx.lmsLesson.update.mock.calls.some((c) =>
        (c[0] as { data: object }).data.hasOwnProperty('isPreview')
      )
    ).toBe(false);
  });

  // Review round 6: the editor shows one reading, so a course-level save deleted a module's second
  // reading (and its learner progress) and renamed and reordered the kept quiz lesson, which
  // changed its content version and staled saved quiz attempts.
  it('a course-level save leaves a second reading and a custom-titled quiz exactly as they are', async () => {
    const { tx, ops } = lessonTx();
    await syncModuleLessons(
      tx as never,
      'c1',
      'm1',
      'Module 1: Introduction',
      'First reading',
      undefined,
      undefined,
      [
        {
          id: 'l1',
          orderIndex: 0,
          contentType: 'text',
          contentBody: 'First reading',
          isPreview: true,
        },
        {
          id: 'l2',
          orderIndex: 1,
          contentType: 'text',
          contentBody: 'Second reading',
          isPreview: false,
        },
        {
          id: 'l3',
          orderIndex: 2,
          contentType: 'quiz',
          contentBody: 'quiz-custom',
          isPreview: false,
        },
      ],
      true
    );
    expect(ops).toEqual(['update:l1']);
    expect(tx.lmsLesson.update.mock.calls[0][0].data).not.toHaveProperty('orderIndex');
  });

  // Review round 7: saving only a new explanation renamed a custom-titled quiz lesson, changing
  // its content version and staling saved attempts.
  it('an explanation-only save leaves the kept quiz lesson (and its title) untouched', async () => {
    const { tx, ops } = lessonTx();
    const { tx: qtx } = quizTx(saved);
    Object.assign(tx, qtx, { lmsLesson: tx.lmsLesson });
    await syncModuleLessons(
      tx as never,
      'c1',
      'm1',
      'Module 1: Introduction',
      'Reading',
      undefined,
      {
        id: 'quiz-1',
        questions: [{ ...sameQuestions[0], explanation: 'New why.' }, sameQuestions[1]],
      },
      [
        { id: 'l1', orderIndex: 0, contentType: 'text', contentBody: 'Reading', isPreview: true },
        { id: 'l2', orderIndex: 1, contentType: 'quiz', contentBody: 'quiz-1', isPreview: false },
      ],
      true
    );
    expect(ops).toEqual(['update:l1']);
  });

  it('reports every quiz the module still references, a second quiz lesson included', async () => {
    const { tx } = lessonTx();
    const kept = await syncModuleLessons(
      tx as never,
      'c1',
      'm1',
      'Module',
      'Reading',
      undefined,
      undefined,
      [
        { id: 'l1', orderIndex: 0, contentType: 'text', contentBody: 'Reading', isPreview: true },
        { id: 'l2', orderIndex: 1, contentType: 'quiz', contentBody: 'quiz-one', isPreview: false },
        { id: 'l3', orderIndex: 2, contentType: 'quiz', contentBody: 'quiz-two', isPreview: false },
      ],
      true
    );
    expect([...kept].sort()).toEqual(['quiz-one', 'quiz-two']);
  });

  // Review round 8: an explanation-only save reset a custom quiz title, pass mark and attempt
  // limit to the defaults, changing the content version and staling saved attempts.
  it('an existing quiz keeps any title, pass mark or attempt limit the save leaves out', async () => {
    const { tx } = quizTx(saved);
    await writeModuleQuiz(tx as never, 'c1', 'Module', {
      id: 'quiz-1',
      questions: [{ ...sameQuestions[0], explanation: 'New why.' }, sameQuestions[1]],
    });
    const call = (tx.lmsQuiz.upsert as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0][0] as {
      update: Record<string, unknown>;
      create: Record<string, unknown>;
    };
    expect(call.update).toEqual({ courseId: 'c1' });
    expect(call.create).toMatchObject({
      title: 'Module — Knowledge check',
      passPercentage: 80,
      attemptsAllowed: 3,
    });
  });

  it('when the preview reading is removed, the next remaining reading becomes the preview', async () => {
    const { tx, ops } = lessonTx();
    await syncModuleLessons(
      tx as never,
      'c1',
      'm1',
      'Module',
      undefined,
      undefined,
      undefined,
      [
        { id: 'l1', orderIndex: 0, contentType: 'text', contentBody: 'Reading', isPreview: true },
        {
          id: 'l2',
          orderIndex: 1,
          contentType: 'quiz',
          contentBody: 'quiz-legacy',
          isPreview: false,
        },
        {
          id: 'l3',
          orderIndex: 2,
          contentType: 'text',
          contentBody: 'Second reading',
          isPreview: false,
        },
      ],
      true
    );
    // The editor sent no reading, so the first reading goes; the quiz is never the preview.
    expect(ops).toEqual(['delete:l1', 'update:l3']);
    expect(tx.lmsLesson.update.mock.calls[0][0]).toEqual({
      where: { id: 'l3' },
      data: { isPreview: true },
    });
  });
});
