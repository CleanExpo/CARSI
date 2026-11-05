import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CoachingSection } from './CoachingSection';

describe('CoachingSection', () => {
  it('renders title and test id', () => {
    const html = renderToStaticMarkup(
      createElement(CoachingSection, { title: 'Example', testId: 'coaching-section-example' }, 'Body')
    );
    expect(html).toContain('data-testid="coaching-section-example"');
    expect(html).toContain('Example');
    expect(html).toContain('Body');
  });
});
