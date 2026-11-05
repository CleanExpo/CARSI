import { describe, expect, it } from 'vitest';

import { coachingRouteMetadata } from './coaching-route-metadata';

describe('coachingRouteMetadata', () => {
  it('uses page meta title and description', () => {
    const m = coachingRouteMetadata('actions');
    expect(m.title).toContain('Actions');
    expect(m.description).toMatch(/Steps for this month/);
    expect(m.robots).toEqual({ index: false, follow: false });
  });
});
