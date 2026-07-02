import { describe, expect, it } from 'vitest';

import { parseModuleQuiz } from './admin-courses-service';

describe('parseModuleQuiz', () => {
  const validQuestion = {
    questionText: 'What is airflow measured in?',
    options: ['CFM or m³/h', 'Volts', 'Degrees', 'Litres'],
    correctIndex: 0,
    points: 1,
  };

  it('returns undefined when there is no quiz or nothing valid', () => {
    expect(parseModuleQuiz(undefined)).toBeUndefined();
    expect(parseModuleQuiz(null)).toBeUndefined();
    expect(parseModuleQuiz('nope')).toBeUndefined();
    expect(parseModuleQuiz({ questions: [] })).toBeUndefined();
    expect(parseModuleQuiz({ questions: [{ questionText: '', options: ['a', 'b'], correctIndex: 0 }] })).toBeUndefined();
  });

  it('parses a well-formed quiz and applies defaults', () => {
    const q = parseModuleQuiz({ questions: [validQuestion] });
    expect(q).toBeDefined();
    expect(q!.questions).toHaveLength(1);
    expect(q!.questions[0]).toMatchObject({ questionText: 'What is airflow measured in?', correctIndex: 0, points: 1 });
    // optional metadata omitted when absent
    expect(q!.id).toBeUndefined();
    expect(q!.passPercentage).toBeUndefined();
  });

  it('keeps valid metadata and questions, dropping malformed questions', () => {
    const q = parseModuleQuiz({
      id: 'quiz-1',
      title: 'Module knowledge check',
      passPercentage: 80,
      attemptsAllowed: 3,
      questions: [
        validQuestion,
        { questionText: 'too few options', options: ['only one'], correctIndex: 0 }, // <2 options → dropped
        { questionText: 'bad index', options: ['a', 'b'], correctIndex: 5 }, // out of range → dropped
        { questionText: 'good', options: ['a', 'b', 'c'], correctIndex: 2 },
      ],
    });
    expect(q).toBeDefined();
    expect(q!.id).toBe('quiz-1');
    expect(q!.passPercentage).toBe(80);
    expect(q!.attemptsAllowed).toBe(3);
    expect(q!.questions).toHaveLength(2); // only the two valid ones survive
    expect(q!.questions[1].correctIndex).toBe(2);
  });

  it('ignores an out-of-range passPercentage', () => {
    const q = parseModuleQuiz({ passPercentage: 150, questions: [validQuestion] });
    expect(q!.passPercentage).toBeUndefined();
  });

  it('trims option whitespace and drops blank options', () => {
    const q = parseModuleQuiz({
      questions: [{ questionText: 'Q', options: ['  a  ', '', 'b'], correctIndex: 1 }],
    });
    // blank option removed → ['a','b']; correctIndex 1 now points at 'b' (still in range)
    expect(q!.questions[0].options).toEqual(['a', 'b']);
  });
});
