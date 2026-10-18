// @vitest-environment jsdom
/**
 * V6 review r1 P1-V6-VIEW-DROPPED-BEFORE-GA-READY — GA4 bootstraps afterInteractive, so
 * membership_view (fired on mount) can arrive before window.gtag exists. It must wait and be
 * delivered exactly once when gtag appears, and be dropped (never sent another way) if GA4 never
 * loads. Drives the real MembershipViewTracker and the real analytics path.
 */
import { act, createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type W = { gtag?: (...a: unknown[]) => void; dataLayer?: unknown[] };
let calls: unknown[][];
let container: HTMLDivElement;
let root: Root;

const views = () => calls.filter((c) => c[0] === 'event' && c[1] === 'membership_view');
const installGtag = () => {
  (window as unknown as W).gtag = (...a: unknown[]) => {
    calls.push(a);
  };
};

async function mountTracker() {
  // Fresh modules per test: the queue is module state.
  const { MembershipViewTracker } = await import('@/components/analytics/MembershipViewTracker');
  act(() =>
    root.render(createElement(MembershipViewTracker, { checkoutEnabled: true, status: 'none' }))
  );
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  calls = [];
  delete (window as unknown as W).gtag;
  delete (window as unknown as W).dataLayer;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  delete (window as unknown as W).gtag;
});

describe('membership_view before GA4 is ready', () => {
  it('is delivered exactly once when gtag arrives late', async () => {
    const { GA4_QUEUE_POLL_MS } = await import('./ga4-client');
    await mountTracker();
    expect(views()).toHaveLength(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(GA4_QUEUE_POLL_MS * 3);
    });
    installGtag(); // /ga-init.js finally ran
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GA4_QUEUE_POLL_MS * 2);
    });
    expect(views()).toHaveLength(1);
    expect(views()[0][2]).toEqual({ checkout_enabled: true, membership_status: 'none' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(GA4_QUEUE_POLL_MS * 50);
    });
    expect(views()).toHaveLength(1);
  });

  it('is sent straight away when gtag is already there', async () => {
    installGtag();
    await mountTracker();
    expect(views()).toHaveLength(1);
  });

  it('is sent once per visit under React strict mode (effects run twice in development)', async () => {
    installGtag();
    const { MembershipViewTracker } = await import('@/components/analytics/MembershipViewTracker');
    act(() =>
      root.render(
        createElement(
          StrictMode,
          null,
          createElement(MembershipViewTracker, { checkoutEnabled: true, status: 'none' })
        )
      )
    );
    expect(views()).toHaveLength(1);
  });

  it('is dropped, not sent another way, when GA4 never loads', async () => {
    const { GA4_QUEUE_POLL_MS, GA4_QUEUE_MAX_POLLS } = await import('./ga4-client');
    await mountTracker();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GA4_QUEUE_POLL_MS * (GA4_QUEUE_MAX_POLLS + 2));
    });
    expect((window as unknown as W).dataLayer).toBeUndefined();
    installGtag(); // far too late: the wait is over
    await act(async () => {
      await vi.advanceTimersByTimeAsync(GA4_QUEUE_POLL_MS * 4);
    });
    expect(views()).toHaveLength(0);
  });
});
