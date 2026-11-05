// @vitest-environment jsdom

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/coaching-portal/support-contact', () => ({
  openCoachingSupportEmail: vi.fn(),
}));

import { CoachingSupportPanel } from './CoachingSupportPanel';

describe('CoachingSupportPanel', () => {
  it('renders support copy and email action test id', () => {
    const html = renderToStaticMarkup(
      createElement(CoachingSupportPanel, {
        id: 'mp-support',
        tips: ['Tip one'],
        testId: 'support-panel',
      })
    );
    expect(html).toContain('Need help?');
    expect(html).toContain('Tip one');
    expect(html).toContain('data-testid="support-panel-email"');
    expect(html).toContain('id="mp-support"');
  });
});
