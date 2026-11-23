/**
 * GP-627 item 3: after finishing lesson 1 of 8, the My Learning card read "Lesson 1 of 8" beside
 * "Next lesson: <lesson 2's title>", because it printed the count of completed lessons as the
 * lesson number. The card must name the lesson it is sending the learner to.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { resolveNextLessonPosition } from '@/lib/lms/next-lesson-position';

import { ContinueLearningBanner, type ContinueLearningSnapshot } from './ContinueLearningBanner';

const snapshot: ContinueLearningSnapshot = {
  course_slug: 'water-damage',
  course_title: 'Water Damage Restoration',
  lesson_id: 'l2',
  lesson_title: 'Psychrometry basics',
  resume_href: '/dashboard/learn/water-damage?lesson=l2',
  last_accessed_at: '2026-10-08T00:00:00.000Z',
  lesson_index: 2,
  lesson_total: 8,
};

function render(props: Parameters<typeof ContinueLearningBanner>[0]): string {
  return renderToStaticMarkup(createElement(ContinueLearningBanner, props)).replace(/<!-- -->/g, '');
}

describe('continue-learning card lesson number', () => {
  it('names the next lesson (2 of 8) after lesson 1 is complete, not "Lesson 1 of 8"', () => {
    const html = render({ snapshot, progressPercent: 13, lessonsCompleted: 1, lessonTotal: 8 });
    expect(html).toContain('Lesson 2 of 8');
    expect(html).not.toContain('Lesson 1 of 8');
    expect(html).toContain('Psychrometry basics');
  });

  it('falls back to completed + 1 when the snapshot carries no position', () => {
    const { lesson_index: _i, lesson_total: _t, ...bare } = snapshot;
    const html = render({ snapshot: bare, progressPercent: 13, lessonsCompleted: 1, lessonTotal: 8 });
    expect(html).toContain('Lesson 2 of 8');
  });
});

describe('resolveNextLessonPosition', () => {
  it('prefers the resume lesson position', () => {
    expect(resolveNextLessonPosition({ resumeIndex: 5, resumeTotal: 8, lessonsCompleted: 2, lessonsTotal: 8 })).toEqual({ index: 5, total: 8 });
  });
  it('a fresh course starts at lesson 1', () => {
    expect(resolveNextLessonPosition({ lessonsCompleted: 0, lessonsTotal: 8 })).toEqual({ index: 1, total: 8 });
  });
  it('never runs past the last lesson', () => {
    expect(resolveNextLessonPosition({ lessonsCompleted: 8, lessonsTotal: 8 })).toEqual({ index: 8, total: 8 });
  });
  it('shows nothing without a lesson total', () => {
    expect(resolveNextLessonPosition({ lessonsCompleted: 1, lessonsTotal: 0 })).toBeNull();
    expect(resolveNextLessonPosition({})).toBeNull();
  });
  it('ignores an out-of-range resume position', () => {
    expect(resolveNextLessonPosition({ resumeIndex: 9, resumeTotal: 8, lessonsCompleted: 1, lessonsTotal: 8 })).toEqual({ index: 2, total: 8 });
  });
});
