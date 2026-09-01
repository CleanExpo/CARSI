import { describe, expect, it } from 'vitest';

import { orderCoursesBySlug } from './industry-courses';

describe('orderCoursesBySlug', () => {
  it('keeps the requested slug order and drops missing slugs', () => {
    const courses = [
      { slug: 'b', title: 'B' },
      { slug: 'a', title: 'A' },
    ];
    expect(orderCoursesBySlug(courses, ['a', 'missing', 'b'])).toEqual([
      { slug: 'a', title: 'A' },
      { slug: 'b', title: 'B' },
    ]);
  });
});
