// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The measurement id is read once at module load, so it must exist before the import.
const nav = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST1234';
  return { pathname: '/courses/water' };
});
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

import { CONSENT_NOTICE_VERSION, CONSENT_STORAGE_KEY } from '@/lib/analytics/consent';
import { saveAnalyticsChoice } from '@/lib/analytics/consent-client';

import { GoogleAnalytics } from './GoogleAnalytics';

type W = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

function storeChoice(analytics: boolean, version = CONSENT_NOTICE_VERSION) {
  window.localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({ version, analytics, timestamp: '2026-11-16T00:00:00.000Z' })
  );
}

function allScripts(): HTMLScriptElement[] {
  return Array.from(document.querySelectorAll('script'));
}

function googleScripts(): string[] {
  return allScripts()
    .map((script) => script.getAttribute('src') ?? '')
    .filter(
      (src) =>
        src.includes('googletagmanager') ||
        src.includes('google-analytics') ||
        src === '/ga-init.js'
    );
}

/** A script the strict dashboard policy would block: no src, inline content, no nonce. */
function inlineScripts(): HTMLScriptElement[] {
  return allScripts().filter(
    (script) => !script.getAttribute('src') && (script.textContent ?? '').trim() !== ''
  );
}

let container: HTMLDivElement;
let root: Root | null = null;
let calls: unknown[][];

function installGtag() {
  (window as W).gtag = (...args: unknown[]) => {
    calls.push(args);
  };
}

const settle = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(600);
  });

async function renderAt(pathAndQuery: string) {
  window.history.replaceState(null, '', pathAndQuery);
  nav.pathname = pathAndQuery.split('?')[0];
  act(() => {
    root = createRoot(container);
    root.render(createElement(GoogleAnalytics));
  });
  await settle();
}

beforeEach(() => {
  vi.useFakeTimers();
  calls = [];
  window.localStorage.clear();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; max-age=0; path=/`;
  }
  delete (window as W).gtag;
  delete (window as W).dataLayer;
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  container.remove();
  vi.useRealTimers();
  window.history.replaceState(null, '', '/');
});

describe('GoogleAnalytics waits for the visitor to say yes (GP-731)', () => {
  it('with no stored choice, loads nothing from Google and makes no gtag call', async () => {
    installGtag();
    await renderAt('/courses/water');
    expect(googleScripts()).toEqual([]);
    expect(calls).toEqual([]);
  });

  it('after "Reject optional", loads nothing from Google and makes no gtag call', async () => {
    storeChoice(false);
    installGtag();
    await renderAt('/courses/water');
    expect(googleScripts()).toEqual([]);
    expect(calls).toEqual([]);
  });

  it('a yes stored under an older notice version counts as no choice', async () => {
    storeChoice(true, '0-2026-01-01');
    installGtag();
    await renderAt('/courses/water');
    expect(googleScripts()).toEqual([]);
    expect(calls).toEqual([]);
  });

  it('after "Accept analytics", loads the library and sends one clean page view', async () => {
    installGtag();
    await renderAt('/courses/water');
    expect(googleScripts()).toEqual([]);

    act(() => saveAnalyticsChoice(true));
    await settle();

    const srcs = googleScripts();
    expect(srcs).toContain('/ga-init.js');
    expect(srcs).toContain('https://www.googletagmanager.com/gtag/js?id=G-TEST1234');
    // Strict Content-Security-Policy: only scripts with a src, never an inline script the
    // signed-in app's policy would block (GP-547, break 11). Asserted here because next/script
    // injects each src once per module lifetime, and this is the first test that injects.
    expect(inlineScripts()).toEqual([]);
    const config = calls.find((c) => c[0] === 'config');
    expect(config?.[1]).toBe('G-TEST1234');
    expect(config?.[2]).toMatchObject({
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    const views = calls.filter((c) => c[0] === 'event' && c[1] === 'page_view');
    expect(views).toHaveLength(1);
    expect((views[0][2] as Record<string, unknown>).page_location).toBe(
      'http://localhost:3000/courses/water'
    );
  });

  it('strips personal data from the address it sends', async () => {
    storeChoice(true);
    installGtag();
    await renderAt(
      '/courses/water?email=jane%40example.com&token=abc123&session_id=cs_test_1&utm_source=newsletter'
    );
    const views = calls.filter((c) => c[0] === 'event' && c[1] === 'page_view');
    expect(views).toHaveLength(1);
    expect((views[0][2] as Record<string, unknown>).page_location).toBe(
      'http://localhost:3000/courses/water?utm_source=newsletter'
    );
    const everything = JSON.stringify(calls);
    expect(everything).not.toContain('jane');
    expect(everything).not.toContain('abc123');
    expect(everything).not.toContain('cs_test_1');
  });

  it('sends no page view, and no private address, for a signed-in page', async () => {
    storeChoice(true);
    installGtag();
    await renderAt('/dashboard/student/profile?email=jane%40example.com');
    expect(calls.some((c) => c[0] === 'config')).toBe(true); // positive control: it did load
    expect(calls.filter((c) => c[0] === 'event')).toEqual([]);
    expect(JSON.stringify(calls)).not.toContain('/dashboard');
    expect(JSON.stringify(calls)).not.toContain('jane');
  });

  it('a later "no" withdraws: consent denied, property disabled, Google cookies deleted', async () => {
    storeChoice(true);
    installGtag();
    await renderAt('/courses/water');
    document.cookie = '_ga=GA1.1.123.456; path=/';
    document.cookie = '_ga_TEST1234=GS1.1.789; path=/';
    document.cookie = 'carsi_theme=light; path=/';
    expect(document.cookie).toContain('_ga=');

    act(() => saveAnalyticsChoice(false));

    expect(calls).toContainEqual(['consent', 'update', { analytics_storage: 'denied' }]);
    expect((window as unknown as Record<string, unknown>)['ga-disable-G-TEST1234']).toBe(true);
    expect(document.cookie).not.toContain('_ga');
    expect(document.cookie).toContain('carsi_theme=light');
  });
});

describe('GoogleAnalytics under the strict Content-Security-Policy', () => {
  it('the static bootstrap, executed, denies advertising, queues the js event and every later call', () => {
    const source = readFileSync(resolve(process.cwd(), 'public', 'ga-init.js'), 'utf8');
    expect(source).not.toMatch(/G-[A-Z0-9]{6,}/);

    const w = window as W;
    delete w.dataLayer;
    delete w.gtag;
    new Function(source)();

    expect(Array.isArray(w.dataLayer)).toBe(true);
    expect(typeof w.gtag).toBe('function');
    const queued = () =>
      (w.dataLayer as unknown[]).map((entry) => Array.from(entry as ArrayLike<unknown>));
    expect(queued()).toHaveLength(2);
    expect(queued()[0]).toEqual([
      'consent',
      'default',
      {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'granted',
      },
    ]);
    expect(queued()[1][0]).toBe('js');
    expect(queued()[1][1]).toBeInstanceOf(Date);

    w.gtag!('config', 'G-TEST1234', { send_page_view: false });
    expect(queued()).toHaveLength(3);
    expect(queued()[2]).toEqual(['config', 'G-TEST1234', { send_page_view: false }]);

    // An existing queue is reused, never replaced.
    const existing = w.dataLayer;
    new Function(source)();
    expect(w.dataLayer).toBe(existing);
    expect(queued()).toHaveLength(5);
  });

  it('positive control: the pre-fix inline bootstrap is exactly what the inline-script probe catches', () => {
    const bootstrap = document.createElement('script');
    bootstrap.id = 'ga4-bootstrap';
    bootstrap.textContent = 'window.dataLayer = window.dataLayer || [];';
    document.body.appendChild(bootstrap);
    expect(inlineScripts().map((script) => script.id)).toEqual(['ga4-bootstrap']);
    bootstrap.remove();
  });
});
