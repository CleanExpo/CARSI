// @vitest-environment jsdom
/**
 * The public catalogue's result count changes as a visitor searches or filters. A screen-reader
 * user cannot see the grid shrink, so the count must be announced (WCAG 4.1.3 Status Messages).
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CourseGrid } from './CourseGrid';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const courses = [
  {
    id: 'c1',
    slug: 'odour-control-basics',
    title: 'Odour Control Basics',
    price_aud: 0,
    is_free: true,
  },
  {
    id: 'c2',
    slug: 'carpet-cleaning-essentials',
    title: 'Carpet Cleaning Essentials',
    price_aud: 99,
  },
];

afterEach(() => cleanup());

describe('CourseGrid result count', () => {
  it('announces the number of matching courses as a status message', async () => {
    render(<CourseGrid courses={courses} surface="light" />);

    const status = screen.getByRole('status');
    expect(status.textContent).toContain('2 courses');

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Search courses' }), {
        target: { value: 'odour' },
      });
    });
    expect(screen.getByRole('status').textContent).toContain('1 course');
  });
});
