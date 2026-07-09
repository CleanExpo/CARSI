import { describe, expect, it } from 'vitest';

import { detectAttachedResources } from './plan';
import type { KitCourse } from './types';

const COURSE: KitCourse = {
  slug: 'demo',
  title: 'Demo',
  cecHours: 0,
  modules: [
    {
      title: 'M1',
      lessons: [
        {
          id: 'l1',
          title: 'L1',
          contentBody: '<p>x</p>',
          resources: [
            { kind: 'flashcards', cards: [{ front: 'a', back: 'b' }] },
            { kind: 'audio', url: 'https://x/a.mp3' },
          ],
        },
        { id: 'l2', title: 'L2', contentBody: '<p>y</p>', resources: [] },
        {
          id: 'l3',
          title: 'L3',
          contentBody: '<p>z</p>',
          resources: [{ label: 'Workbook', url: 'https://x/w.pdf' }],
        },
      ],
    },
  ],
};

describe('detectAttachedResources', () => {
  it('reports attached kinds and lesson coverage', () => {
    const r = detectAttachedResources(COURSE);
    expect(r.totalLessons).toBe(3);
    expect(r.lessonsWithResources).toBe(2);
    expect([...r.kinds].sort()).toEqual(['audio', 'flashcards', 'link']);
  });

  it('treats a lesson with no resources as uncovered', () => {
    const r = detectAttachedResources({
      slug: 's',
      title: 't',
      cecHours: 0,
      modules: [{ title: 'M', lessons: [{ id: 'x', title: 'X', contentBody: null }] }],
    });
    expect(r.lessonsWithResources).toBe(0);
    expect(r.kinds.size).toBe(0);
  });
});
