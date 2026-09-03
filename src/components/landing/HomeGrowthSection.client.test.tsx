// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HomeGrowthSection } from './HomeGrowthSection';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom has neither API; framer-motion reads both when the ticket mounts.
class QuietIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
(globalThis as typeof globalThis & { IntersectionObserver: unknown }).IntersectionObserver =
  QuietIntersectionObserver;
window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {
    return false;
  },
})) as typeof window.matchMedia;

/** A stop whose last day passed long ago: what a stale cached render would still carry. */
const PAST = { city: 'Melbourne', startsOn: '2000-01-01', endsOn: '2000-01-02' };
const FUTURE = { city: 'Hobart', startsOn: '2999-12-30', endsOn: '2999-12-31' };
/** The real stop: its last day is Saturday 5 September 2026 in Brisbane. */
const BRISBANE = { city: 'Brisbane', startsOn: '2026-09-04', endsOn: '2026-09-05' };

let container: HTMLDivElement;
let root: Root | null = null;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  container.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('HomeGrowthSection in the browser', () => {
  it('drops a stop the browser clock says has passed, even when the server markup still carried it', () => {
    const element = createElement(HomeGrowthSection, { stops: [PAST, FUTURE] });
    const staleServerHtml = renderToString(element);
    expect(staleServerHtml).toContain('Melbourne');

    container.innerHTML = staleServerHtml;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    act(() => {
      root = hydrateRoot(container, element);
    });

    expect(container.textContent).toContain('Hobart');
    expect(container.textContent).not.toContain('Melbourne');
    const hydrationErrors = consoleError.mock.calls.filter((call) =>
      String(call[0]).toLowerCase().includes('hydrat'),
    );
    expect(hydrationErrors).toEqual([]);
  });

  it('shows the fallback row once every stop has passed', () => {
    act(() => {
      root = createRoot(container);
      root.render(createElement(HomeGrowthSection, { stops: [PAST] }));
    });
    expect(container.textContent).toContain('No upcoming dates listed');
    expect(container.textContent).not.toContain('Melbourne');
  });

  it('drops the stop at Brisbane midnight while the tab stays open', () => {
    // 23:59:58 on Saturday 5 September in Brisbane (UTC+10): the last minute of the stop.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-05T13:59:58Z'));

    act(() => {
      root = createRoot(container);
      root.render(createElement(HomeGrowthSection, { stops: [BRISBANE] }));
    });
    expect(container.textContent).toContain('Brisbane');
    expect(container.textContent).toContain('4 to 5 Sep');

    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(container.textContent).not.toContain('Brisbane');
    expect(container.textContent).toContain('No upcoming dates listed');
  });

  it('re-checks the stops when a suspended tab becomes visible again', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-05T13:59:58Z'));
    act(() => {
      root = createRoot(container);
      root.render(createElement(HomeGrowthSection, { stops: [BRISBANE] }));
    });
    expect(container.textContent).toContain('Brisbane');

    // The clock jumps past midnight without the timer firing (the tab was suspended).
    vi.setSystemTime(new Date('2026-09-05T14:30:00Z'));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(container.textContent).not.toContain('Brisbane');
  });
});
