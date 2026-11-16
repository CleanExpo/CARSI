// @vitest-environment jsdom
/**
 * GP-731: the wire guard is the last check at the browser's exit. Each primitive the Google
 * library can send through is asserted present before it is patched, then each rule is driven
 * through it: nothing leaves without a stored yes; a dirty or private address is dropped; a clean
 * page view leaves unchanged; other traffic is never touched.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSENT_CHANGED_EVENT, CONSENT_STORAGE_KEY, COOKIE_SETTINGS_EVENT } from './consent';
import {
  getAnalyticsChoice,
  installAnalyticsWireGuard,
  openCookieSettings,
  saveAnalyticsChoice,
  subscribeAnalyticsChoice,
} from './consent-client';

const ID = 'G-TEST1234';
const ORIGIN = 'http://localhost:3000';

const beacon = vi.fn((_url: string | URL, _data?: BodyInit | null) => true);
const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('ok'));
const realBeacon = navigator.sendBeacon;
const realFetch = window.fetch;

function collect(fields: Record<string, string>): string {
  return `https://region1.google-analytics.com/g/collect?${new URLSearchParams({
    v: '2',
    tid: ID,
    cid: '1.2',
    en: 'page_view',
    dl: `${ORIGIN}/courses/water`,
    ...fields,
  })}`;
}

beforeAll(() => {
  // jsdom has no sendBeacon; give it one so the guard has a primitive to wrap.
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    writable: true,
    value: beacon,
  });
  window.fetch = fetcher as unknown as typeof window.fetch;
  expect(typeof navigator.sendBeacon).toBe('function');
  expect(typeof window.fetch).toBe('function');
  expect(typeof XMLHttpRequest.prototype.send).toBe('function');
  expect(Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')?.set).toBeTypeOf(
    'function'
  );
  installAnalyticsWireGuard(ID);
});

afterAll(() => {
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    writable: true,
    value: realBeacon,
  });
  window.fetch = realFetch;
});

beforeEach(() => {
  window.localStorage.clear();
  beacon.mockClear();
  fetcher.mockClear();
});

describe('the stored choice in the browser', () => {
  it('reads unset, then granted, then denied, and tells subscribers each time', () => {
    const seen = vi.fn();
    const stop = subscribeAnalyticsChoice(seen);
    expect(getAnalyticsChoice()).toBe('unset');
    saveAnalyticsChoice(true);
    expect(getAnalyticsChoice()).toBe('granted');
    saveAnalyticsChoice(false);
    expect(getAnalyticsChoice()).toBe('denied');
    expect(seen).toHaveBeenCalledTimes(2);
    stop();
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toContain('"analytics":false');
  });

  it('a "Cookie settings" control raises the open event', () => {
    const opened = vi.fn();
    window.addEventListener(COOKIE_SETTINGS_EVENT, opened);
    openCookieSettings();
    window.removeEventListener(COOKIE_SETTINGS_EVENT, opened);
    expect(opened).toHaveBeenCalledTimes(1);
  });

  it('a change in another tab reaches subscribers through the storage event', () => {
    const seen = vi.fn();
    const stop = subscribeAnalyticsChoice(seen);
    window.dispatchEvent(new StorageEvent('storage', { key: CONSENT_STORAGE_KEY }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));
    window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
    stop();
    expect(seen).toHaveBeenCalledTimes(2);
  });
});

describe('the wire guard', () => {
  it('drops every collection request while there is no stored yes', async () => {
    expect(navigator.sendBeacon(collect({}))).toBe(true);
    await window.fetch(collect({}), { method: 'POST', body: 'en=page_view' });
    expect(beacon).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
    expect(Number(document.documentElement.dataset.analyticsDropped)).toBeGreaterThan(0);
  });

  it('drops collection requests after "Reject optional"', async () => {
    saveAnalyticsChoice(false);
    navigator.sendBeacon(collect({}));
    await window.fetch(collect({}));
    expect(beacon).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('after "Accept analytics", lets a clean page view through unchanged', async () => {
    saveAnalyticsChoice(true);
    navigator.sendBeacon(collect({}));
    await window.fetch(collect({}));
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0][0]).toBe(collect({}));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('after "Accept analytics", still drops a private page or an address carrying an email', async () => {
    saveAnalyticsChoice(true);
    navigator.sendBeacon(collect({ dl: `${ORIGIN}/dashboard/student/profile` }));
    navigator.sendBeacon(collect({ dl: `${ORIGIN}/courses/water?email=jane%40example.com` }));
    await window.fetch(collect({ uid: 'user-1' }));
    expect(beacon).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('trims the bad events from a batched body and sends the rest', () => {
    saveAnalyticsChoice(true);
    const url = `https://region1.google-analytics.com/g/collect?v=2&tid=${ID}&cid=1.2&dl=${encodeURIComponent(`${ORIGIN}/courses/water`)}`;
    navigator.sendBeacon(url, 'en=course_view&ep.course_slug=water\nen=scroll');
    expect(beacon).toHaveBeenCalledWith(url, 'en=course_view&ep.course_slug=water');
  });

  it('drops an image beacon without a yes', () => {
    const img = new Image();
    img.src = collect({});
    expect(img.getAttribute('src')).toBeNull();
    img.src = '/logo/favicon.png';
    expect(img.getAttribute('src')).toBe('/logo/favicon.png');
  });

  it('never touches a request to anywhere else', async () => {
    await window.fetch('/api/lms/courses');
    navigator.sendBeacon('https://carsi.com.au/api/analytics', 'x');
    expect(fetcher).toHaveBeenCalledWith('/api/lms/courses', undefined);
    expect(beacon).toHaveBeenCalledWith('https://carsi.com.au/api/analytics', 'x');
  });
});
