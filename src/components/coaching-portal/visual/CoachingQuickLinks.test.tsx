import { Compass } from 'lucide-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CoachingQuickLinks } from './CoachingQuickLinks';

describe('CoachingQuickLinks', () => {
  it('renders navigable quick link cards', () => {
    const html = renderToStaticMarkup(
      createElement(CoachingQuickLinks, {
        links: [{ href: '/plan', label: 'Plan', description: 'Focus', icon: Compass }],
        testId: 'ql',
      })
    );
    expect(html).toContain('href="/plan"');
    expect(html).toContain('data-testid="ql"');
  });
});
