import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CoachingWorkspaceLoading } from './CoachingWorkspaceLoading';

describe('CoachingWorkspaceLoading', () => {
  it('shows loading test id', () => {
    const html = renderToStaticMarkup(createElement(CoachingWorkspaceLoading));
    expect(html).toContain('data-testid="coaching-workspace-loading"');
  });
});
