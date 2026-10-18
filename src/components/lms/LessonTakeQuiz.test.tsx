// @vitest-environment jsdom
/**
 * The lesson page's "Take Quiz" button. In production it sent learners to /courses/<slug>/quiz/<id>,
 * which returned 404 (verified 18/10/2026). It must open the course player at this lesson, where
 * the lesson's quiz checkpoint renders.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ go: vi.fn() }));
const api = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'structural-drying-core', lessonId: 'lesson-1' }),
  useRouter: () => ({ push: nav.go, back: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/lib/api/client', () => ({ apiClient: { get: api.get } }));
vi.mock('@/components/lms/LessonPlayer', () => ({ LessonPlayer: () => null }));

import LessonPage from '../../../app/(dashboard)/dashboard/courses/[slug]/lessons/[lessonId]/page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  nav.go.mockReset();
  api.get.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('lesson page Take Quiz', () => {
  it('opens the course player at this lesson, never the 404 /courses quiz path', async () => {
    api.get.mockResolvedValue({
      id: 'lesson-1',
      title: 'Reading moisture',
      content_type: 'text',
      content_body: 'x',
      drive_file_id: null,
      duration_minutes: 5,
      is_preview: false,
      order_index: 0,
      course_id: 'c1',
      quiz_id: 'quiz-9',
    });
    await act(async () => root.render(createElement(LessonPage)));
    const button = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Take Quiz')
    );
    expect(button, 'Take Quiz button renders for a lesson with a quiz').toBeTruthy();
    await act(async () => button!.click());
    expect(nav.go).toHaveBeenCalledExactlyOnceWith(
      '/dashboard/learn/structural-drying-core?lesson=lesson-1'
    );
  });
});
