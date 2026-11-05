import { ClipboardList } from 'lucide-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CoachingEmptyState } from './CoachingEmptyState';

describe('CoachingEmptyState', () => {
  it('renders title and optional action link', () => {
    const html = renderToStaticMarkup(
      createElement(CoachingEmptyState, {
        icon: ClipboardList,
        title: 'Nothing here',
        description: 'Yet.',
        actionHref: '/go',
        actionLabel: 'Go',
        testId: 'empty',
      })
    );
    expect(html).toContain('Nothing here');
    expect(html).toContain('href="/go"');
  });
});
