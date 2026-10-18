// @vitest-environment jsdom
/**
 * After a quiz attempt, the learner sees the authored "why" for each wrong answer, in both the
 * learner and the enterprise (onboarding) result views. No explanation, no panel.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EnterpriseQuizResult, LearnerQuizResult } from './QuizPlayer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const feedback = [
  {
    question_id: 'q1',
    question_text: 'Which reading shows wet timber?',
    explanation: 'A reading above the dry standard for that material means it is still wet.',
  },
];

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const base = { passed: false, scorePercent: 50, passPercentage: 80, onContinue: () => {} };

describe('quiz result feedback', () => {
  it('the learner result shows each wrong answer with its explanation', () => {
    act(() => root.render(createElement(LearnerQuizResult, { ...base, feedback })));
    const item = container.querySelector('[data-quiz-feedback="q1"]');
    expect(item?.textContent).toContain('Which reading shows wet timber?');
    expect(item?.textContent).toContain('still wet');
    expect(container.textContent).toContain('Why those answers were wrong');
  });

  it('the enterprise result shows it too', () => {
    act(() => root.render(createElement(EnterpriseQuizResult, { ...base, feedback })));
    expect(container.querySelector('[data-quiz-feedback="q1"]')?.textContent).toContain(
      'still wet'
    );
  });

  it('shows no feedback panel when there is nothing to explain', () => {
    act(() => root.render(createElement(LearnerQuizResult, { ...base, feedback: [] })));
    expect(container.textContent).not.toContain('Why those answers were wrong');
    act(() => root.render(createElement(LearnerQuizResult, base)));
    expect(container.querySelector('[data-quiz-feedback]')).toBeNull();
  });
});
