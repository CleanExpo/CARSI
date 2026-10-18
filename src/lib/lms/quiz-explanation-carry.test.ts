import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { parseModuleQuiz, writeModuleQuiz } from '@/lib/admin/admin-courses-service';

import { explanationFor, writeQuizQuestions } from './quiz-explanation-carry';

const WHY = 'A reading above the dry standard for that material means it is still wet.';

type Row = {
  id: string;
  questionText: string;
  options: { text: string }[];
  correctIndex: number;
  points: number;
  explanation: string | null;
};

const row = (id: string, questionText: string, explanation: string | null): Row => ({
  id,
  questionText,
  options: [{ text: 'A' }, { text: 'B' }],
  correctIndex: 1,
  points: 1,
  explanation,
});

function fakeDb(prior: Row[]) {
  const ops: string[] = [];
  const created: Record<string, unknown>[] = [];
  const db = {
    lmsQuiz: { upsert: vi.fn(async () => ({})) },
    lmsQuizQuestion: {
      findMany: vi.fn(async () => {
        ops.push('read');
        return prior.map((r) => ({ ...r }));
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { explanation: string | null };
        }) => {
          ops.push(`update:${where.id}:${data.explanation}`);
          return {};
        }
      ),
      deleteMany: vi.fn(async () => {
        ops.push('delete');
        return { count: prior.length };
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        ops.push('create');
        created.push(data);
        return data;
      }),
    },
  };
  return { db, ops, created };
}

const input = (questionText: string, explanation?: string) => ({
  questionText,
  options: ['A', 'B'],
  correctIndex: 1,
  ...(explanation ? { explanation } : {}),
});

describe('explanation carry-forward', () => {
  it('an authored explanation wins; otherwise the saved one for the same text; otherwise none', () => {
    const prior = new Map([['Which reading shows wet timber?', WHY]]);
    expect(explanationFor('Which reading shows wet timber?', 'New wording.', prior)).toBe(
      'New wording.'
    );
    expect(explanationFor(' Which reading shows wet timber? ', undefined, prior)).toBe(WHY);
    expect(explanationFor('A rewritten question', null, prior)).toBeNull();
  });

  it('a seed run that only adds an explanation keeps question ids (review round 4: it re-keyed them)', async () => {
    const { db, ops } = fakeDb([row('q-1', 'Q1', null), row('q-2', 'Q2', WHY)]);
    await writeQuizQuestions(db as never, 'quiz-1', [input('Q1', 'New why.'), input('Q2')]);
    expect(ops).toEqual(['read', 'update:q-1:New why.']);
  });

  // Review round 9: rows stored with plain-string options were rewritten (new ids) on an
  // explanation-only save, because only the { text } shape was compared.
  it('older rows with plain-string options are still updated in place', async () => {
    const { db, ops } = fakeDb([{ ...row('q-1', 'Q1', null), options: ['A', 'B'] as never }]);
    await writeQuizQuestions(db as never, 'quiz-1', [input('Q1', 'New why.')]);
    expect(ops).toEqual(['read', 'update:q-1:New why.']);
  });

  it('a changed question set is replaced, carrying saved explanations by question text', async () => {
    const { db, ops, created } = fakeDb([row('q-1', 'Q1', WHY)]);
    await writeQuizQuestions(db as never, 'quiz-1', [input('Q1'), input('A brand-new question')]);
    expect(ops).toEqual(['read', 'delete', 'create', 'create']);
    expect(created.map((c) => c.explanation)).toEqual([WHY, null]);
  });

  // Review round 5: an explanation could never be removed; null or blank fell back to the saved one.
  it('null or a blank explanation removes the saved one in place; an absent field keeps it', async () => {
    const { db, ops } = fakeDb([
      row('q-1', 'Q1', WHY),
      row('q-2', 'Q2', WHY),
      row('q-3', 'Q3', WHY),
    ]);
    await writeQuizQuestions(db as never, 'quiz-1', [
      { ...input('Q1'), explanation: null },
      { ...input('Q2'), explanation: '   ' },
      input('Q3'),
    ]);
    expect(ops).toEqual(['read', 'update:q-1:null', 'update:q-2:null']);
  });

  it('a rewritten question set honours a removed explanation too', async () => {
    const { db, created } = fakeDb([row('q-1', 'Q1', WHY)]);
    await writeQuizQuestions(db as never, 'quiz-1', [
      { ...input('Q1'), explanation: null },
      input('A brand-new question'),
    ]);
    expect(created.map((c) => c.explanation)).toEqual([null, null]);
  });

  it('the admin parser keeps null and blank explanations as a removal, and omits an absent one', () => {
    const quiz = parseModuleQuiz({
      questions: [
        { questionText: 'Q1', options: ['A', 'B'], correctIndex: 1, explanation: null },
        { questionText: 'Q2', options: ['A', 'B'], correctIndex: 1, explanation: ' ' },
        { questionText: 'Q3', options: ['A', 'B'], correctIndex: 1 },
        { questionText: 'Q4', options: ['A', 'B'], correctIndex: 1, explanation: ' Why. ' },
      ],
    })!;
    expect(quiz.questions.map((q) => ('explanation' in q ? q.explanation : 'absent'))).toEqual([
      null,
      null,
      'absent',
      'Why.',
    ]);
  });

  it('an ordinary admin course save keeps the authored explanation (review: it used to erase it)', async () => {
    const { db, created } = fakeDb([row('q-1', 'Which reading shows wet timber?', WHY)]);
    await writeModuleQuiz(db as never, 'course-1', 'Module 1', {
      id: 'quiz-1',
      questions: [
        { questionText: 'Which reading shows wet timber?', options: ['A', 'B'], correctIndex: 1 },
        { questionText: 'A brand-new question', options: ['A', 'B'], correctIndex: 0 },
      ],
    });
    expect(created.map((c) => c.explanation)).toEqual([WHY, null]);
  });

  it('no script rewrites quiz questions directly; the quiz seeds use the shared writer', () => {
    const dir = path.join(process.cwd(), 'scripts');
    const scripts = readdirSync(dir)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => [f, readFileSync(path.join(dir, f), 'utf8')] as const);
    for (const [file, src] of scripts) {
      expect(src, file).not.toMatch(/lmsQuizQuestion\.deleteMany\(/);
    }
    const seeds = scripts.filter(([, src]) => /writeQuizQuestions\(prisma, /.test(src));
    expect(seeds.map(([f]) => f).sort()).toEqual([
      'seed-all-quizzes.ts',
      'seed-assessment-draft.ts',
      'seed-commercial-floor-care-quiz.ts',
      'seed-floor-care-quizzes.ts',
      'seed-h5-bird-flu-quiz.ts',
    ]);
  });
});
