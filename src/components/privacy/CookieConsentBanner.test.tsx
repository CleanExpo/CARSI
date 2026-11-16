// @vitest-environment jsdom
/**
 * GP-731: the visible, accessible analytics choice. One optional choice with two buttons of equal
 * weight; reopened by the "Cookie settings" control with the current choice shown; Escape and
 * Cancel change nothing; focus goes back to the control that opened it; the result is announced.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CONSENT_STORAGE_KEY } from '@/lib/analytics/consent';
import { getAnalyticsChoice } from '@/lib/analytics/consent-client';

import { CookieConsentBanner } from './CookieConsentBanner';
import { CookieSettingsButton } from './CookieSettingsButton';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

const panel = () => document.querySelector<HTMLElement>('[data-testid="cookie-consent"]');
const button = (name: string) =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => b.textContent?.trim() === name
  );
const status = () => document.querySelector('[data-testid="cookie-choice-status"]')?.textContent;

function render() {
  act(() => {
    root.render(
      createElement('div', null, [
        createElement(CookieSettingsButton, { key: 'b' }),
        createElement(CookieConsentBanner, { key: 'c' }),
      ])
    );
  });
}

beforeEach(() => {
  window.localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('CookieConsentBanner', () => {
  it('is never in the server HTML, so a visitor who has chosen never sees it flash', () => {
    expect(renderToStaticMarkup(createElement(CookieConsentBanner))).not.toContain(
      'cookie-consent'
    );
  });

  it('shows on a first visit as a labelled region with two equal-weight choices', () => {
    render();
    const region = panel();
    expect(region).not.toBeNull();
    expect(region?.getAttribute('role')).toBe('region');
    const labelId = region?.getAttribute('aria-labelledby') ?? '';
    expect(document.getElementById(labelId)?.textContent).toBe('Cookie settings');
    const reject = button('Reject optional');
    const accept = button('Accept analytics');
    expect(reject).toBeDefined();
    expect(accept).toBeDefined();
    expect(reject?.className).toBe(accept?.className);
    expect(reject?.className).toContain('min-h-11');
    expect(region?.querySelector('a[href="/privacy#cookies"]')).not.toBeNull();
  });

  it('"Accept analytics" stores a yes, closes, and announces it', () => {
    render();
    act(() => button('Accept analytics')!.click());
    expect(getAnalyticsChoice()).toBe('granted');
    expect(panel()).toBeNull();
    expect(status()).toBe('Analytics on');
  });

  it('"Reject optional" stores a no, closes, and announces it', () => {
    render();
    act(() => button('Reject optional')!.click());
    expect(getAnalyticsChoice()).toBe('denied');
    expect(panel()).toBeNull();
    expect(status()).toBe('Analytics off');
  });

  it('stays closed on a later visit once a choice is stored', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'x'); // unreadable: positive control below
    render();
    expect(panel()).not.toBeNull();
    act(() => button('Reject optional')!.click());
    act(() => root.unmount());
    root = createRoot(container);
    render();
    expect(panel()).toBeNull();
  });

  it('"Cookie settings" reopens it with the current choice, focus inside, and Escape changes nothing', () => {
    render();
    act(() => button('Accept analytics')!.click());
    const opener = button('Cookie settings')!;
    opener.focus();
    act(() => opener.click());
    expect(panel()).not.toBeNull();
    expect(panel()?.textContent).toContain('Analytics is currently on.');
    expect(document.activeElement?.textContent).toBe('Cookie settings');
    expect(document.activeElement?.tagName).toBe('H2');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(panel()).toBeNull();
    expect(getAnalyticsChoice()).toBe('granted');
    expect(document.activeElement).toBe(opener);
  });

  it('a reopened panel can switch analytics off, and Cancel changes nothing', () => {
    render();
    act(() => button('Accept analytics')!.click());
    act(() => button('Cookie settings')!.click());
    act(() => button('Cancel')!.click());
    expect(getAnalyticsChoice()).toBe('granted');
    act(() => button('Cookie settings')!.click());
    act(() => button('Reject optional')!.click());
    expect(getAnalyticsChoice()).toBe('denied');
    expect(status()).toBe('Analytics off');
  });
});
