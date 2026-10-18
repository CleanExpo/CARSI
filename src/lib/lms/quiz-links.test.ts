import { describe, expect, it } from 'vitest';

import { lessonQuizHref } from './quiz-links';

describe('lessonQuizHref', () => {
  it('opens the course player at the lesson, where its quiz checkpoint renders', () => {
    expect(lessonQuizHref('structural-drying-core', '1f0c6a8e-0000-4000-8000-000000000001')).toBe(
      '/dashboard/learn/structural-drying-core?lesson=1f0c6a8e-0000-4000-8000-000000000001'
    );
  });

  it('never targets the /courses/<slug>/quiz path that returned 404 in production', () => {
    expect(lessonQuizHref('a', 'b')).not.toMatch(/^\/courses\//);
    expect(lessonQuizHref('a', 'b')).not.toContain('/quiz/');
  });

  it('encodes both segments', () => {
    expect(lessonQuizHref('a b', 'c&d')).toBe('/dashboard/learn/a%20b?lesson=c%26d');
  });
});
