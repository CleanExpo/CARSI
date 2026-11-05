import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { CoachingFilterPills } from './CoachingFilterPills';

describe('CoachingFilterPills', () => {
  it('marks the active filter with aria-selected', () => {
    const html = renderToStaticMarkup(
      createElement(CoachingFilterPills, {
        options: [
          { id: 'all', label: 'All' },
          { id: 'todo', label: 'To do' },
        ],
        value: 'todo',
        onChange: vi.fn(),
        testId: 'f',
      })
    );
    expect(html).toContain('data-testid="f-todo"');
    expect(html).toContain('aria-selected="true"');
  });
});
