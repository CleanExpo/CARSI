// @vitest-environment jsdom
/**
 * P1-5 (force-push review, 23/11/2026): GA4 refuses events on a private page.
 *
 * `marketing_pack_build` is fired by the Build button on /dashboard/coaching/marketing, a signed-in
 * page. PostHog drops it because `scrubPostHogEvent` asks `isCountedPath` about the current page;
 * the GA4 path had no such check, so the event went to Google with whatever page_location gtag
 * held from the last public page. The GA4 path now asks the same `isCountedPath` (one owner, in
 * consent.ts) at the moment of every send: a direct send, and each event flushed from the queue.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSENT_NOTICE_VERSION, CONSENT_STORAGE_KEY, isCountedPath } from './consent';

type W = { gtag?: (...a: unknown[]) => void; dataLayer?: unknown[] };
let calls: unknown[][];

const PUBLIC_PAGE = '/courses';
const PRIVATE_PAGE = '/dashboard/coaching/marketing';

const events = () => calls.filter((c) => c[0] === 'event');
const goTo = (path: string) => window.history.pushState({}, '', path);
const installGtag = () => {
  (window as unknown as W).gtag = (...a: unknown[]) => {
    calls.push(a);
  };
};
const build = { name: 'marketing_pack_build', context: 'coaching-marketing' } as const;

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  calls = [];
  window.localStorage.clear();
  window.localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({ version: CONSENT_NOTICE_VERSION, analytics: true, timestamp: 'x' })
  );
  delete (window as unknown as W).gtag;
  goTo(PUBLIC_PAGE);
});

afterEach(() => {
  vi.useRealTimers();
  delete (window as unknown as W).gtag;
  goTo('/');
});

describe('GA4 refuses events on a private page (P1-5)', () => {
  it('the fixture pages are what the single owner says they are', () => {
    expect(isCountedPath(PUBLIC_PAGE)).toBe(true);
    expect(isCountedPath(PRIVATE_PAGE)).toBe(false);
  });

  it('positive control: on a counted page the event is sent', async () => {
    const ga4 = await import('./ga4-client');
    installGtag();
    ga4.markGa4Configured();
    ga4.trackCarsiProductEvent(build);
    expect(events()).toHaveLength(1);
    expect(events()[0]![1]).toBe('marketing_pack_build');
  });

  it('a direct send on a private page sends nothing', async () => {
    const ga4 = await import('./ga4-client');
    installGtag();
    ga4.markGa4Configured();
    goTo(PRIVATE_PAGE);
    ga4.trackCarsiProductEvent(build);
    expect(events()).toHaveLength(0);
  });

  it('an event fired on a private page is not queued for later', async () => {
    const ga4 = await import('./ga4-client');
    goTo(PRIVATE_PAGE);
    ga4.trackCarsiProductEvent(build);
    goTo(PUBLIC_PAGE);
    installGtag();
    ga4.markGa4Configured();
    expect(events()).toHaveLength(0);
  });

  it('an event queued on a public page is not flushed while a private page is showing', async () => {
    const ga4 = await import('./ga4-client');
    ga4.trackCarsiProductEvent({ name: 'role_guide_start', context: 'hub' });
    goTo(PRIVATE_PAGE);
    installGtag();
    ga4.markGa4Configured();
    expect(events()).toHaveLength(0);
  });
});
