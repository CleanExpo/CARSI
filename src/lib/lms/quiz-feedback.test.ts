import { describe, expect, it } from 'vitest';

import { buildQuizFeedback, MAX_EXPLANATION_CHARS } from './quiz-feedback';

const questions = [
  { id: 'q1', questionText: 'Which reading shows a wet material?', correctIndex: 2 },
  { id: 'q2', questionText: 'When do you stop drying?', correctIndex: 0 },
  { id: 'q3', questionText: 'What PPE is needed?', correctIndex: 1 },
];
const explanations = new Map<string, string | null>([
  ['q1', 'A reading above the dry standard for that material means it is still wet.'],
  ['q2', 'Drying stops at the documented dry standard, not at a set number of days.'],
  ['q3', null],
]);

describe('buildQuizFeedback', () => {
  it('returns the authored explanation for each wrong answer only', () => {
    const out = buildQuizFeedback(questions, { q1: 0, q2: 0, q3: 0 }, explanations);
    expect(out).toEqual([
      {
        question_id: 'q1',
        question_text: 'Which reading shows a wet material?',
        explanation: 'A reading above the dry standard for that material means it is still wet.',
      },
    ]);
  });

  it('treats a skipped question as wrong', () => {
    expect(buildQuizFeedback(questions, {}, explanations).map((f) => f.question_id)).toEqual([
      'q1',
      'q2',
    ]);
  });

  it('never reveals the correct option', () => {
    const out = buildQuizFeedback(questions, { q1: 0 }, explanations);
    for (const item of out) {
      expect(Object.keys(item).sort()).toEqual(['explanation', 'question_id', 'question_text']);
    }
  });

  it('returns nothing for a question with no or blank explanation', () => {
    const blank = new Map([['q1', '   ']]);
    expect(buildQuizFeedback(questions, { q1: 0 }, blank)).toEqual([]);
  });

  it('bounds an explanation to MAX_EXPLANATION_CHARS', () => {
    const long = new Map([['q1', 'x'.repeat(MAX_EXPLANATION_CHARS + 50)]]);
    expect(buildQuizFeedback(questions, { q1: 0 }, long)[0].explanation).toHaveLength(
      MAX_EXPLANATION_CHARS
    );
  });
});
