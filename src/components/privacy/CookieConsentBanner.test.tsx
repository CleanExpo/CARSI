// @vitest-environment jsdom
/**
 * GP-731: the visible, accessible analytics choice. One optional choice with two buttons of equal
 * weight; reopened by the "Cookie settings" control with the current choice shown; Escape and
 * Cancel change nothing; focus goes back to the control that opened it; the result is announced.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

describe('the consent panel is readable in both themes', () => {
  // Read the real colour tokens from app/globals.css: the light set, then the .dark overrides.
  const css = readFileSync(resolve(__dirname, '../../../app/globals.css'), 'utf8');
  const darkStart = css.indexOf('.dark {');
  const darkBlock = css.slice(darkStart, css.indexOf('}', darkStart));
  const token = (name: string, dark: boolean): string => {
    const pattern = new RegExp(`--${name}:\\s*([^;]+);`);
    const value =
      (dark ? darkBlock.match(pattern) : null) ?? css.slice(0, darkStart).match(pattern);
    if (!value) throw new Error(`token --${name} not found`);
    return value[1].trim();
  };
  type Rgba = [number, number, number, number];
  const parse = (value: string): Rgba => {
    const hex = value.match(/^#([0-9a-f]{6})$/i);
    if (hex) {
      const n = parseInt(hex[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
    }
    const rgba = value.match(/^rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+))?\s*\)$/);
    if (!rgba) throw new Error(`cannot read colour ${value}`);
    return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), rgba[4] ? Number(rgba[4]) : 1];
  };
  const over = (top: Rgba, under: Rgba): Rgba => [
    top[0] * top[3] + under[0] * (1 - top[3]),
    top[1] * top[3] + under[1] * (1 - top[3]),
    top[2] * top[3] + under[2] * (1 - top[3]),
    1,
  ];
  const luminance = ([r, g, b]: Rgba) => {
    const lin = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const contrast = (a: Rgba, b: Rgba) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  // The colour token an element's text uses in a theme: its own class, else its nearest ancestor's.
  const textToken = (element: Element, dark: boolean): string => {
    for (let node: Element | null = element; node; node = node.parentElement) {
      const cls = node.getAttribute('class') ?? '';
      const darkMatch = cls.match(/(?:^|\s)dark:text-\[var\(--([a-z-]+)\)\]/);
      if (dark && darkMatch) return darkMatch[1];
      const match = cls.match(/(?:^|\s)text-\[var\(--([a-z-]+)\)\]/);
      if (match) return match[1];
    }
    throw new Error('no text colour found');
  };

  it.each([false, true])('every piece of text meets 4.5:1 (dark theme: %s)', (dark) => {
    window.localStorage.clear();
    render();
    act(() => button('Accept analytics')!.click());
    act(() => button('Cookie settings')!.click());
    const surface = over(parse(token('bg-surface', dark)), parse(token('bg-deep', dark)));
    const texts = Array.from(panel()!.querySelectorAll('h2, p, a, button'));
    expect(texts.length).toBeGreaterThanOrEqual(6);
    const failing = texts
      .map((element) => {
        const name = textToken(element, dark);
        const ratio = contrast(over(parse(token(name, dark)), surface), surface);
        return { text: element.textContent?.trim().slice(0, 30), name, ratio };
      })
      .filter(({ ratio }) => ratio < 4.5);
    expect(failing).toEqual([]);
  });
});
