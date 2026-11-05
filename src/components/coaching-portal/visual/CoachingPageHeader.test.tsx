import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CoachingPageHeader } from './CoachingPageHeader';

describe('CoachingPageHeader', () => {
  it('renders eyebrow, title and test id', () => {
    const html = renderToStaticMarkup(
      createElement(CoachingPageHeader, {
        eyebrow: 'Test',
        title: 'Title',
        description: 'Desc',
        testId: 'hdr',
      })
    );
    expect(html).toContain('data-testid="hdr"');
    expect(html).toContain('Title');
    expect(html).toContain('Test');
  });
});
