import { describe, expect, it } from 'vitest';

import {
  paidCourseNeedsOptimize,
  planModuleTitles,
  RECAP_MODULE_TITLE,
  targetModuleCount,
} from './optimize-course-content';
import { buildOptimizeCronEmail, parseOptimizeCronSearch } from './optimize-courses-cron';

describe('optimize courses cron helpers', () => {
  it('defaults to one course per tick', () => {
    expect(
      parseOptimizeCronSearch(new URL('https://carsi.com.au/api/cron/optimize-course-content'))
    ).toEqual({ limit: 1 });
    expect(parseOptimizeCronSearch(new URL('https://x.test/c?limit=9'))).toEqual({ limit: 5 });
  });

  it('never queues free courses and skips unchanged paid ones', () => {
    const now = new Date();
    expect(paidCourseNeedsOptimize({ isFree: true, updatedAt: now, meta: null })).toBe(false);
    expect(paidCourseNeedsOptimize({ isFree: false, updatedAt: now, meta: null })).toBe(true);
    expect(
      paidCourseNeedsOptimize({
        isFree: false,
        updatedAt: now,
        meta: { optimizeAppliedAt: new Date(now.getTime() + 5_000).toISOString() },
      })
    ).toBe(false);
  });

  it('builds a summary email for the founder inbox', () => {
    const mail = buildOptimizeCronEmail({
      processed: 1,
      updated: 1,
      skipped: 4,
      failed: 0,
      remaining: 2,
      results: [
        {
          courseId: '1',
          title: 'Water',
          previousModuleCount: 5,
          moduleCount: 8,
          summary: 'Rewrote 5 modules and added 3.',
        },
      ],
    });
    expect(mail.subject).toMatch(/1 updated/);
    expect(mail.text).toMatch(/5 modules -> 8/);
    expect(mail.text).toMatch(/ranamuzamil|Paid course/i);
  });

  it('scales module count by current length and price', () => {
    expect(targetModuleCount(5)).toBe(8);
    expect(targetModuleCount(5, 250)).toBe(9);
    expect(targetModuleCount(8)).toBe(10);
    expect(targetModuleCount(10)).toBe(15);
    expect(targetModuleCount(10, 250)).toBe(16);
    expect(targetModuleCount(10, 450)).toBe(18);
    expect(targetModuleCount(12)).toBe(17);

    const planned = planModuleTitles(['Air quality', 'Water damage'], ['Safety on site']);
    expect(planned[0]).toBe('Air quality');
    expect(planned.length).toBe(8);
    expect(planned[planned.length - 1]).toBe(RECAP_MODULE_TITLE);

    const long = planModuleTitles(
      Array.from({ length: 12 }, (_, i) => `Topic ${i + 1}`),
      ['Field decisions']
    );
    expect(long.length).toBe(17);
    expect(long[0]).toBe('Topic 1');
    expect(long[long.length - 1]).toBe(RECAP_MODULE_TITLE);
  });
});
