// @vitest-environment jsdom
/**
 * The course player's quiz renders its questions once the learner begins. This replaces an e2e
 * check that visited a 404 lesson route and only asserted the URL, so it could never fail.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it } from 'vitest';

import { QuizPlayer } from './QuizPlayer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const quiz = {
  id: 'quiz-1',
  title: 'Module 1 knowledge check',
  pass_percentage: 80,
  time_limit_minutes: null,
  attempts_allowed: 3,
  attempts_used: 0,
  questions: [
    {
      id: 'q1',
      question_text: 'Which reading shows wet timber?',
      question_type: 'multiple_choice',
      options: [{ text: 'Below the dry standard' }, { text: 'Above the dry standard' }],
      order_index: 0,
      points: 1,
    },
  ],
};

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

it('shows the question and its options after the learner begins the assessment', () => {
  act(() => root.render(createElement(QuizPlayer, { quiz, onSubmit: () => {} })));
  const begin = [...container.querySelectorAll('button')].find((b) =>
    /begin assessment/i.test(b.textContent ?? '')
  );
  expect(begin).toBeDefined();
  act(() => begin!.click());
  expect(container.textContent).toContain('Which reading shows wet timber?');
  expect(container.textContent).toContain('Above the dry standard');
});
