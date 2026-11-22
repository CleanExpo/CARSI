// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ apiGet: vi.fn() }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) =>
    createElement('a', { href, ...rest }, children),
}));
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mocks.apiGet } }));

import LeaderboardPage from '../../../app/(dashboard)/dashboard/student/leaderboard/page';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * GP-775: a leaderboard is optional and there may be no board at all. With nobody opted in the
 * page must say so neutrally, and a failed read must not look like an empty month.
 */
const EMPTY = /no one has chosen to appear on this month's board/i;
const UNAVAILABLE = /monthly board could not be loaded/i;

let container: HTMLDivElement;
let root: Root | null = null;

function stubBoard(body: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            period_label: 'November 2026',
            period_timezone: 'Australia/Sydney',
            ...body,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
    )
  );
}

async function render() {
  await act(async () => {
    root = createRoot(container);
    root.render(createElement(LeaderboardPage));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return container.textContent ?? '';
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  mocks.apiGet.mockImplementation(async (p: string) =>
    p.includes('/gamification/me/level')
      ? { total_xp: 40, current_level: 1, level_title: 'Getting started' }
      : []
  );
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container.remove();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe('leaderboard page with no board (GP-775)', () => {
  it('shows a neutral empty state when nobody has opted in', async () => {
    stubBoard({ items: [] });
    const text = await render();
    expect(text).toContain('First course completed'); // the page really rendered
    expect(text).toMatch(EMPTY);
    expect(text).not.toMatch(UNAVAILABLE);
  });

  it('shows a distinct message when the board could not be read', async () => {
    stubBoard({ items: [], unavailable: true });
    const text = await render();
    expect(text).toMatch(UNAVAILABLE);
    expect(text).not.toMatch(EMPTY);
  });

  it('lists opted-in entries when there are some', async () => {
    stubBoard({
      items: [
        {
          rank: 1,
          display_name: 'Alex K., QLD',
          total_xp: 40,
          current_level: 1,
          level_title: 'Getting started',
        },
      ],
    });
    const text = await render();
    expect(text).toContain('Alex K., QLD');
    expect(text).not.toMatch(EMPTY);
  });
});
