import { describe, expect, it } from 'vitest';

import { planModuleTitles, RECAP_MODULE_TITLE, targetModuleCount } from './optimize-course-content';
import { parseOptimizeCronSearch } from './optimize-courses-cron';

describe('optimize courses cron helpers', () => {
  it('defaults to one course per tick', () => {
    expect(
      parseOptimizeCronSearch(new URL('https://carsi.com.au/api/cron/optimize-course-content'))
    ).toEqual({ limit: 1, force: false });
    expect(parseOptimizeCronSearch(new URL('https://x.test/c?limit=9&force=1'))).toEqual({
      limit: 5,
      force: true,
    });
  });

  it('plans 7–10 titles, keeping existing ones first', () => {
    expect(targetModuleCount(3)).toBe(8);
    expect(targetModuleCount(8)).toBe(8);
    expect(targetModuleCount(12)).toBe(10);
    const planned = planModuleTitles(['Air quality', 'Water damage'], ['Safety on site']);
    expect(planned[0]).toBe('Air quality');
    expect(planned[1]).toBe('Water damage');
    expect(planned.length).toBeGreaterThanOrEqual(7);
    expect(planned.length).toBeLessThanOrEqual(10);
    expect(planned[planned.length - 1]).toBe(RECAP_MODULE_TITLE);
  });
});
