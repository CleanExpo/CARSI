// @vitest-environment jsdom
/**
 * GP-677 — the portal layout is kept across client-side navigation, so the visit is sent
 * from the browser on every page change, not only on the first page load (Codex r1 P1).
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ pathname: '/dashboard/coaching/actions' }));

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
}));

import { CoachingPortalVisitBeacon } from './CoachingPortalVisitBeacon';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  nav.pathname = '/dashboard/coaching/actions';
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  fetchMock = vi.fn(async () => ({ ok: true, status: 204 }) as Response);
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render() {
  await act(async () => {
    root.render(<CoachingPortalVisitBeacon />);
  });
}

describe('CoachingPortalVisitBeacon', () => {
  it('sends one visit when a portal page opens, and renders nothing', async () => {
    await render();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/coaching/portal/accountability');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ visit: true });
    expect(container.innerHTML).toBe('');
  });

  it('sends a visit on every client-side page change, not on a re-render of the same page', async () => {
    await render();
    await render();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    nav.pathname = '/dashboard/coaching/sessions';
    await render();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    nav.pathname = '/dashboard/coaching/plan';
    await render();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('ignores a failed request', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(render()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
