// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const portal = vi.hoisted(() => ({ canEdit: true }));

vi.mock('@/components/coaching-portal/CoachingPortalContext', () => ({
  useCoachingPortal: () => ({ access: { canEdit: portal.canEdit, mode: 'subscriber' } }),
}));

import { CoachingMarketingPackPage } from './CoachingMarketingPackPage';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function json(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  portal.canEdit = true;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function renderPage() {
  await act(async () => {
    root.render(<CoachingMarketingPackPage />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

describe('CoachingMarketingPackPage (visual shell)', () => {
  it('shows hero, build control and empty state when no pack', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json({ pack: null, history: [], progress: { checksDelta: null, fixCountDelta: null } })
      )
    );
    await renderPage();
    expect(container.querySelector('[data-testid="marketing-pack-page"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="marketing-pack-hero"]')?.textContent).toMatch(
      /Advantage A7/
    );
    expect(container.querySelector('[data-testid="marketing-pack-build"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="marketing-pack-empty"]')).toBeTruthy();
  });

  it('renders stat grid, jump nav, fixes and support when a pack loads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json({
          pack: {
            id: 'p1',
            generatedAt: '2026-11-01T00:00:00.000Z',
            voice: { businessName: '', trade: 'plumbing', town: '', services: '' },
            review: {
              websiteUrl: 'https://x.test',
              googleBusinessUrl: null,
              siteReadable: true,
              summary: 'Summary line.',
              checks: [{ id: 'title', label: 'Page title', passed: false }],
              fixes: [
                {
                  id: 'f1',
                  rank: 1,
                  area: 'website',
                  title: 'Fix title',
                  why: 'Why',
                  how: 'How',
                  impact: 3,
                  effort: 1,
                  score: 8,
                },
              ],
            },
            checklist: [{ id: 'c1', label: 'Item', detail: 'Detail', done: false }],
            calendar: {
              posts: [
                {
                  day: 1,
                  date: '2026-11-01',
                  theme: 'Intro',
                  caption: 'Hello',
                  hashtags: ['#plumbing'],
                },
              ],
              source: 'template',
              rejectedCount: 0,
              tradeMatched: true,
            },
          },
          history: [
            {
              id: 'p1',
              generatedAt: '2026-11-01T00:00:00.000Z',
              checksPassed: 0,
              checksTotal: 1,
              fixCount: 1,
            },
          ],
          progress: { checksDelta: null, fixCountDelta: null },
        })
      )
    );
    await renderPage();
    expect(container.querySelector('[data-testid="marketing-pack-stat-grid"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="marketing-pack-jump"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="marketing-pack-fix-1"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="marketing-pack-support"]')).toBeTruthy();
    expect(container.textContent).toContain('Email coaching support');
  });

  it('disables build when the member cannot edit', async () => {
    portal.canEdit = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json({ pack: null, history: [], progress: { checksDelta: null, fixCountDelta: null } })
      )
    );
    await renderPage();
    const btn = container.querySelector(
      '[data-testid="marketing-pack-build"]'
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
