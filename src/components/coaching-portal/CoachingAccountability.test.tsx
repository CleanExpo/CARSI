// @vitest-environment jsdom
/**
 * GP-635 — (e) flag off means nothing shows: the Home check-in card and the sidebar item
 * stay hidden unless the accountability API answers 200 / the server flag is on.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/coaching-portal/CoachingPortalContext', () => ({
  useCoachingPortal: () => ({ access: { canEdit: true } }),
}));

import { CoachingCheckInCard } from './CoachingAccountability';
import { coachingPortalNavItems } from './coaching-portal-nav';

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
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render() {
  await act(async () => {
    root.render(<CoachingCheckInCard />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

const VIEW = {
  kpis: [
    { id: 'kpi-quotes', label: 'Quotes sent' },
    { id: 'kpi-jobs', label: 'Jobs won' },
    { id: 'kpi-reviews', label: 'Google reviews' },
  ],
  period: '2026-11-02',
  checkInDue: true,
  currentValues: null,
  streak: 4,
  completion: { done: 1, total: 2, percent: 50 },
  trend: [],
  quiet: { daysSilent: 15 },
  nudges: [],
};

describe('CoachingCheckInCard', () => {
  it('renders nothing while the flag is off (API 404)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ detail: 'Not found.' }, 404))
    );
    await render();
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing without a subscription (API 403)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ detail: 'x' }, 403))
    );
    await render();
    expect(container.innerHTML).toBe('');
  });

  it('shows the check-in prompt, the streak and the welcome-back message when on', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ accountability: VIEW }))
    );
    await render();
    const text = container.textContent ?? '';
    expect(text).toContain('fortnightly check-in is open');
    expect(text).toContain('4');
    expect(text).toContain('15 days');
  });
});

describe('coaching portal sidebar', () => {
  it('hides Progress while the flag is off and shows it when on', () => {
    const off = coachingPortalNavItems({ accountability: false }).map((i) => i.label);
    const on = coachingPortalNavItems({ accountability: true }).map((i) => i.label);
    expect(off).not.toContain('Progress');
    expect(on).toContain('Progress');
    expect(on.filter((l) => l !== 'Progress')).toEqual(off);
  });
});
