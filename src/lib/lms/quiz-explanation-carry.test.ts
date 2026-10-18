import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { writeModuleQuiz } from '@/lib/admin/admin-courses-service';

import { existingExplanations, explanationFor } from './quiz-explanation-carry';

const WHY = 'A reading above the dry standard for that material means it is still wet.';

function fakeTx(prior: { questionText: string; explanation: string | null }[]) {
  const created: Record<string, unknown>[] = [];
  const order: string[] = [];
  const tx = {
    lmsQuiz: { upsert: vi.fn(async () => ({})) },
    lmsQuizQuestion: {
      findMany: vi.fn(async () => {
        order.push('read');
        return prior;
      }),
      deleteMany: vi.fn(async () => {
        order.push('delete');
        return { count: prior.length };
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return data;
      }),
    },
  };
  return { tx, created, order };
}

describe('explanation carry-forward', () => {
  it('an authored explanation wins; otherwise the saved one for the same text; otherwise none', () => {
    const prior = new Map([['Which reading shows wet timber?', WHY]]);
    expect(explanationFor('Which reading shows wet timber?', 'New wording.', prior)).toBe(
      'New wording.'
    );
    expect(explanationFor(' Which reading shows wet timber? ', undefined, prior)).toBe(WHY);
    expect(explanationFor('A rewritten question', null, prior)).toBeNull();
  });

  it('reads only non-blank saved explanations', async () => {
    const { tx } = fakeTx([
      { questionText: 'Q1', explanation: WHY },
      { questionText: 'Q2', explanation: '  ' },
      { questionText: 'Q3', explanation: null },
    ]);
    expect([...(await existingExplanations(tx, 'quiz-1'))]).toEqual([['Q1', WHY]]);
  });

  it('an ordinary admin course save keeps the authored explanation (review: it used to erase it)', async () => {
    const { tx, created, order } = fakeTx([
      { questionText: 'Which reading shows wet timber?', explanation: WHY },
    ]);
    await writeModuleQuiz(tx as never, 'course-1', 'Module 1', {
      id: 'quiz-1',
      questions: [
        { questionText: 'Which reading shows wet timber?', options: ['A', 'B'], correctIndex: 1 },
        { questionText: 'A brand-new question', options: ['A', 'B'], correctIndex: 0 },
      ],
    });
    expect(order).toEqual(['read', 'delete']);
    expect(created.map((c) => c.explanation)).toEqual([WHY, null]);
  });

  it('every seed script that rewrites quiz questions reads explanations before deleting them', () => {
    const dir = path.join(process.cwd(), 'scripts');
    const rewriters = readdirSync(dir)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => [f, readFileSync(path.join(dir, f), 'utf8')] as const)
      .filter(([, src]) => src.includes('lmsQuizQuestion.deleteMany'));
    expect(rewriters.length).toBeGreaterThanOrEqual(5);
    for (const [file, src] of rewriters) {
      const read = src.indexOf('existingExplanations(prisma');
      expect(read, file).toBeGreaterThan(-1);
      expect(read, file).toBeLessThan(src.indexOf('lmsQuizQuestion.deleteMany'));
      expect(src, file).toMatch(/explanation: explanationFor\(/);
    }
  });
});
