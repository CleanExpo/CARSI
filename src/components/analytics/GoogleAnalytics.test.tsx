// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The measurement id is read once at module load, so it must exist before the import.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST1234';
});
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

import { GoogleAnalytics } from './GoogleAnalytics';

function allScripts(): HTMLScriptElement[] {
  return Array.from(document.querySelectorAll('script'));
}

/** A script the strict dashboard policy would block: no src, inline content, no nonce. */
function inlineScripts(): HTMLScriptElement[] {
  return allScripts().filter(
    (script) => !script.getAttribute('src') && (script.textContent ?? '').trim() !== '',
  );
}

let container: HTMLDivElement;
let root: Root | null = null;

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  container.remove();
});

describe('GoogleAnalytics under the strict Content-Security-Policy', () => {
  it('injects only scripts with a src, never an inline script the strict policy would block', async () => {
    act(() => {
      root = createRoot(container);
      root.render(createElement(GoogleAnalytics));
    });
    await act(async () => {
      await Promise.resolve();
    });

    const srcs = allScripts().map((script) => script.getAttribute('src') ?? '');
    expect(srcs).toContain('/ga-init.js');
    expect(srcs.some((src) => src.startsWith('https://www.googletagmanager.com/gtag/js?id=G-TEST1234'))).toBe(true);
    expect(inlineScripts()).toEqual([]);
  });

  it('the static bootstrap defines dataLayer and gtag, parses as JavaScript, and carries no measurement id', () => {
    const source = readFileSync(resolve(process.cwd(), 'public', 'ga-init.js'), 'utf8');
    expect(source).toContain('window.dataLayer = window.dataLayer || []');
    expect(source).toContain('window.gtag = gtag');
    expect(source).toMatch(/gtag\('js', new Date\(\)\)/);
    expect(source).not.toMatch(/G-[A-Z0-9]{6,}/);
    expect(() => new Function(source)).not.toThrow();
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
