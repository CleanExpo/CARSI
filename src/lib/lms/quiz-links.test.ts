import { describe, expect, it } from 'vitest';

import { lessonPlayerHref } from './quiz-links';

describe('lessonPlayerHref', () => {
  it('opens the course player at the lesson, where its quiz checkpoint renders', () => {
    expect(lessonPlayerHref('structural-drying-core', '1f0c6a8e-0000-4000-8000-000000000001')).toBe(
      '/dashboard/learn/structural-drying-core?lesson=1f0c6a8e-0000-4000-8000-000000000001'
    );
  });

  it('never targets the /courses/<slug>/quiz path that returned 404 in production', () => {
    expect(lessonPlayerHref('a', 'b')).not.toMatch(/^\/courses\//);
    expect(lessonPlayerHref('a', 'b')).not.toContain('/quiz/');
  });

  it('encodes both segments', () => {
    expect(lessonPlayerHref('a b', 'c&d')).toBe('/dashboard/learn/a%20b?lesson=c%26d');
  });
});
