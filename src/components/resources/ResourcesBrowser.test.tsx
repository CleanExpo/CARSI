// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PUBLIC_RESOURCES_MENU } from '@/lib/navigation/public-nav';
import { FREE_RESOURCES, isBuildingCodeResource } from '@/lib/resources/free-resources';
import { RESOURCE_CATEGORIES } from '@/lib/resources/categories';

import { BUILDING_CODE_NOTE, ResourcesBrowser } from './ResourcesBrowser';

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

describe('ResourcesBrowser building-code caution and draft labels', () => {
  it('renders the building-code note once in every group that has an NCC or ABCB card, above its cards', () => {
    const groups = Array.from(document.querySelectorAll<HTMLElement>('section[id]')).filter((el) =>
      RESOURCE_CATEGORIES.some((c) => c.id === el.id)
    );
    expect(groups.length).toBe(RESOURCE_CATEGORIES.length);
    let withNote = 0;
    for (const group of groups) {
      const expected = FREE_RESOURCES.some(
        (r) => r.category === group.id && isBuildingCodeResource(r)
      );
      const notes = group.querySelectorAll('[data-testid="building-code-note"]');
      expect(notes.length, group.id).toBe(expected ? 1 : 0);
      if (!expected) continue;
      withNote += 1;
      expect(notes[0].textContent).toBe(BUILDING_CODE_NOTE);
      expect(notes[0].compareDocumentPosition(group.querySelector('li')!)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      );
    }
    // Building-code documents sit in several categories, not only "Building codes".
    expect(withNote).toBeGreaterThanOrEqual(3);
  });

  it('labels every draft proposal card "Draft proposal — not in force"', () => {
    const drafts = FREE_RESOURCES.filter((r) => r.status === 'draft-proposal');
    expect(drafts.length).toBeGreaterThan(0);
    for (const r of drafts) {
      const link = Array.from(document.querySelectorAll('a')).find(
        (a) => a.getAttribute('href') === r.url
      );
      const card = link?.closest('li');
      expect(card?.textContent, r.id).toContain('Draft proposal — not in force');
    }
    const labelled = Array.from(document.querySelectorAll('li')).filter((li) =>
      li.textContent?.includes('Draft proposal — not in force')
    );
    expect(labelled.length).toBe(drafts.length);
  });
});
