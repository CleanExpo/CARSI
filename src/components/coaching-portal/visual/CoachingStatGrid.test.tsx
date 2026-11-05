import { Target } from 'lucide-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CoachingStatGrid } from './CoachingStatGrid';

describe('CoachingStatGrid', () => {
  it('renders test ids per stat for visual regression and e2e', () => {
    const html = renderToStaticMarkup(
      createElement(CoachingStatGrid, {
        testIdPrefix: 'demo-stat',
        items: [
          { id: 'fixes', label: 'Fixes', value: '3', hint: 'Ranked', tone: 'warn', icon: Target },
        ],
      })
    );
    expect(html).toContain('data-testid="demo-stat-grid"');
    expect(html).toContain('data-testid="demo-stat-fixes"');
    expect(html).toContain('Fixes');
  });
});
