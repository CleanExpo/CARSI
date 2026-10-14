// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PUBLIC_RESOURCES_MENU } from '@/lib/navigation/public-nav';
import { FREE_RESOURCES } from '@/lib/resources/free-resources';

import { ResourcesBrowser } from './ResourcesBrowser';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const FLOOD = 'flood-and-storm-resilience';
const MOULD = 'mould-and-health';

let container: HTMLDivElement;
let headerLink: HTMLAnchorElement;
let root: Root | null = null;

function selectCategory(value: string) {
  const select = document.getElementById('resource-category') as HTMLSelectElement;
  act(() => {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function floodCards(): number {
  return document.getElementById(FLOOD)?.querySelectorAll('li').length ?? 0;
}

beforeEach(() => {
  window.history.replaceState(null, '', '/resources');
  container = document.createElement('div');
  document.body.appendChild(container);
  // Stand-in for the header's category link, which lives outside the browser component.
  const href = PUBLIC_RESOURCES_MENU.items.find((i) => i.href.endsWith(`#${FLOOD}`))?.href;
  if (!href) throw new Error('header menu has no flood category link');
  headerLink = document.createElement('a');
  headerLink.href = href;
  headerLink.textContent = 'Flood';
  document.body.appendChild(headerLink);
  act(() => {
    root = createRoot(container);
    root.render(createElement(ResourcesBrowser));
  });
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container.remove();
  headerLink.remove();
  window.history.replaceState(null, '', '/');
});

describe('ResourcesBrowser category anchors under active filters', () => {
  it('a header category link reveals its section when a filter had removed it', () => {
    const expected = FREE_RESOURCES.filter((i) => i.category === FLOOD).length;
    expect(expected).toBeGreaterThan(0);
    expect(floodCards()).toBe(expected);

    selectCategory(MOULD);
    expect(document.getElementById(FLOOD)).toBeNull();

    act(() => headerLink.click());

    expect(floodCards()).toBe(expected);
  });

  it('a hash change to a category reveals its section when a filter had removed it', () => {
    selectCategory(MOULD);
    expect(document.getElementById(FLOOD)).toBeNull();

    act(() => {
      window.history.replaceState(null, '', `/resources#${FLOOD}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(floodCards()).toBeGreaterThan(0);
  });
});
