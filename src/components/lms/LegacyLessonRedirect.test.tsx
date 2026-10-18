/**
 * The legacy lesson URL /dashboard/courses/<slug>/lessons/<id> rendered nothing usable (it read
 * the lesson API envelope as a flat lesson) and its Take Quiz target returned 404. It must send
 * learners to the course player at that lesson, where the lesson and its quiz render.
 */
import { describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ redirect: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: nav.redirect }));

import LegacyLessonPage from '../../../app/(dashboard)/dashboard/courses/[slug]/lessons/[lessonId]/page';

describe('legacy lesson page', () => {
  it('redirects to the course player at that lesson', async () => {
    await LegacyLessonPage({
      params: Promise.resolve({ slug: 'structural-drying-core', lessonId: 'lesson-1' }),
    });
    expect(nav.redirect).toHaveBeenCalledExactlyOnceWith(
      '/dashboard/learn/structural-drying-core?lesson=lesson-1'
    );
  });

  it('decodes route segments once, so they are not double-encoded', async () => {
    nav.redirect.mockClear();
    await LegacyLessonPage({
      params: Promise.resolve({ slug: 'water%20damage', lessonId: 'l%262' }),
    });
    expect(nav.redirect).toHaveBeenCalledExactlyOnceWith(
      '/dashboard/learn/water%20damage?lesson=l%262'
    );
  });
});
