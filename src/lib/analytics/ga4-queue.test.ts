// @vitest-environment jsdom
/**
 * V6 — funnel events reach a CONFIGURED GA4 destination, once.
 *
 * GoogleAnalytics.tsx loads /ga-init.js afterInteractive and sends `gtag('config', id)` only after
 * its own readiness poll, while membership_view fires on mount. Under Google's routing rule an
 * event sent before any config has no default destination, so:
 *  - review r1 P1-V6-VIEW-DROPPED-BEFORE-GA-READY: an event fired before gtag exists must wait;
 *  - review r2 P1-V6-GA-EVENT-BEFORE-CONFIG: it must also wait while gtag exists but has no config.
 * Drives the real GoogleAnalytics component, the real MembershipViewTracker and the real
 * analytics path; gtag is a recorder that ga-init.js would otherwise define.
 */
import { act, createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST1234';
});
vi.mock('next/navigation', () => ({ usePathname: () => '/subscribe' }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type W = { gtag?: (...a: unknown[]) => void; dataLayer?: unknown[] };
let calls: unknown[][];
let container: HTMLDivElement;
let root: Root;

const views = () => calls.filter((c) => c[0] === 'event' && c[1] === 'membership_view');
const indexOf = (pred: (c: unknown[]) => boolean) => calls.findIndex(pred);
const installGtag = () => {
  (window as unknown as W).gtag = (...a: unknown[]) => {
    calls.push(a);
  };
};

async function load() {
  // Fresh modules per test: the queue and the configured flag are module state.
  const [{ MembershipViewTracker }, { GoogleAnalytics }, ga4] = await Promise.all([
    import('@/components/analytics/MembershipViewTracker'),
    import('@/components/analytics/GoogleAnalytics'),
    import('./ga4-client'),
  ]);
  return { MembershipViewTracker, GoogleAnalytics, ga4 };
}

const tick = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

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

describe('membership_view reaches a configured GA4 destination', () => {
  it('late bootstrap: waits for gtag AND config, then is delivered once, after config', async () => {
    const { MembershipViewTracker, GoogleAnalytics } = await load();
    act(() =>
      root.render(
        createElement('div', null, [
          createElement(MembershipViewTracker, { key: 't', checkoutEnabled: true }),
          createElement(GoogleAnalytics, { key: 'ga' }),
        ])
      )
    );
    await tick(750);
    expect(views()).toHaveLength(0);

    installGtag(); // /ga-init.js finally ran
    await tick(600); // GoogleAnalytics' readiness poll notices gtag and sends config

    const configAt = indexOf((c) => c[0] === 'config' && c[1] === 'G-TEST1234');
    const viewAt = indexOf((c) => c[0] === 'event' && c[1] === 'membership_view');
    expect(configAt).toBeGreaterThanOrEqual(0);
    expect(viewAt).toBeGreaterThan(configAt);
    expect(views()).toHaveLength(1);
    expect(views()[0][2]).toEqual({ checkout_enabled: true });

    await tick(15_000);
    expect(views()).toHaveLength(1);
  });

  it('gtag present but not yet configured: nothing is sent until config', async () => {
    const { MembershipViewTracker, ga4 } = await load();
    installGtag();
    act(() => root.render(createElement(MembershipViewTracker, { checkoutEnabled: false })));
    await tick(1_000);
    expect(views()).toHaveLength(0);

    window.gtag!('config', 'G-TEST1234', {});
    ga4.markGa4Configured();
    expect(views()).toHaveLength(1);
    expect(indexOf((c) => c[0] === 'event')).toBeGreaterThan(indexOf((c) => c[0] === 'config'));
  });

  it('is dropped, not sent another way, when GA4 never configures', async () => {
    const { MembershipViewTracker, ga4 } = await load();
    installGtag();
    act(() => root.render(createElement(MembershipViewTracker, { checkoutEnabled: true })));
    await tick(ga4.GA4_QUEUE_WAIT_MS + 500);
    expect((window as unknown as W).dataLayer).toBeUndefined();
    ga4.markGa4Configured(); // far too late: the wait is over
    expect(views()).toHaveLength(0);
  });

  it('is sent once per visit under React strict mode (effects run twice in development)', async () => {
    const { MembershipViewTracker, ga4 } = await load();
    installGtag();
    ga4.markGa4Configured();
    act(() =>
      root.render(
        createElement(
          StrictMode,
          null,
          createElement(MembershipViewTracker, { checkoutEnabled: true })
        )
      )
    );
    expect(views()).toHaveLength(1);
  });
});
