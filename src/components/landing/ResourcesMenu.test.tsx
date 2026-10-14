// @vitest-environment jsdom

import { Fragment, act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PUBLIC_PRIMARY_NAV, PUBLIC_RESOURCES_MENU } from '@/lib/navigation/public-nav';
import { RESOURCE_CATEGORIES } from '@/lib/resources/categories';

import { RESOURCES_HEADING_ID, ResourcesBrowser } from '@/components/resources/ResourcesBrowser';

import { ResourcesMenu } from './ResourcesMenu';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root | null = null;

function mount(variant: 'desktop' | 'mobile') {
  act(() => {
    root = createRoot(container);
    root.render(createElement(ResourcesMenu, { variant, tone: 'light' }));
  });
}

function button(): HTMLButtonElement {
  const el = container.querySelector('button');
  if (!el) throw new Error('no button rendered');
  return el;
}

/**
 * Keyboard activation of a link: the browser focuses it, and Enter dispatches a click with
 * detail 0. jsdom does not synthesise that click from the keydown, so dispatch both.
 */
function pressEnter(link: HTMLAnchorElement) {
  act(() => link.focus());
  expect(document.activeElement).toBe(link);
  act(() => {
    link.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    );
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container.remove();
});

describe('free-resources nav', () => {
  it('lists the hub and every category in a separate menu export', () => {
    const hrefs = PUBLIC_RESOURCES_MENU.items.map((i) => i.href);
    expect(hrefs).toContain('/resources');
    for (const c of RESOURCE_CATEGORIES) expect(hrefs).toContain(`/resources#${c.id}`);
    expect(PUBLIC_PRIMARY_NAV.map((i) => i.href)).not.toContain('/resources');
  });

  it('renders a closed button with aria-expanded and aria-controls', () => {
    mount('desktop');
    const b = button();
    expect(b.textContent).toContain('Free Resources');
    expect(b.getAttribute('aria-expanded')).toBe('false');
    const panel = container.querySelector(`[id="${b.getAttribute('aria-controls')}"]`);
    expect(panel).not.toBeNull();
    expect(panel?.hasAttribute('hidden')).toBe(true);
  });

  it('opens on click and shows the hub link and category links', () => {
    mount('desktop');
    act(() => button().click());
    expect(button().getAttribute('aria-expanded')).toBe('true');
    const panel = container.querySelector(`[id="${button().getAttribute('aria-controls')}"]`);
    expect(panel?.hasAttribute('hidden')).toBe(false);
    const hrefs = Array.from(panel?.querySelectorAll('a') ?? []).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/resources');
    expect(hrefs).toContain('/resources#flood-and-storm-resilience');
  });

  it('closes on Escape and returns focus to the button', () => {
    mount('desktop');
    act(() => button().click());
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button());
  });

  it('closes on an outside click', () => {
    mount('desktop');
    act(() => button().click());
    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(button().getAttribute('aria-expanded')).toBe('false');
  });

  it('works the same way in the mobile menu', () => {
    mount('mobile');
    expect(button().getAttribute('aria-expanded')).toBe('false');
    act(() => button().click());
    expect(button().getAttribute('aria-expanded')).toBe('true');
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(button().getAttribute('aria-expanded')).toBe('false');
  });
});

describe('free-resources nav header wiring', () => {
  it('is rendered by the public header and the mobile menu', async () => {
    const { readFileSync } = await import('node:fs');
    const navbar = readFileSync('src/components/landing/PublicNavbar.tsx', 'utf8');
    const mobile = readFileSync('src/components/landing/MobileNav.tsx', 'utf8');
    expect(navbar).toMatch(/<ResourcesMenu variant="desktop"/);
    expect(mobile).toMatch(/<ResourcesMenu variant="mobile"/);
  });

  it('gives the /resources page heading the focus-target id and tabIndex -1', async () => {
    const { readFileSync } = await import('node:fs');
    const page = readFileSync('app/(public)/resources/page.tsx', 'utf8');
    expect(page).toMatch(/<h1\s+id=\{RESOURCES_HEADING_ID\}\s+tabIndex=\{-1\}/);
  });
});

describe('free-resources nav same-route focus', () => {
  const FLOOD = 'flood-and-storm-resilience';

  function mountOnResourcesPage() {
    window.history.replaceState(null, '', '/resources');
    act(() => {
      root = createRoot(container);
      root.render(
        createElement(
          Fragment,
          null,
          createElement('h1', { id: RESOURCES_HEADING_ID, tabIndex: -1 }, 'Free guides'),
          createElement(ResourcesMenu, { variant: 'desktop', tone: 'light' }),
          createElement(ResourcesBrowser)
        )
      );
    });
  }

  function selectCategory(value: string) {
    const select = document.getElementById('resource-category') as HTMLSelectElement;
    act(() => {
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function menuLink(href: string): HTMLAnchorElement {
    act(() => button().click());
    const panel = document.getElementById(button().getAttribute('aria-controls') ?? '');
    const link = Array.from(panel?.querySelectorAll('a') ?? []).find(
      (a) => a.getAttribute('href') === href
    );
    if (!link) throw new Error(`no menu link for ${href}`);
    return link;
  }

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('Enter on "All free resources" resets the filters and focuses the page heading, not <body>', () => {
    mountOnResourcesPage();
    selectCategory('building-codes');
    const link = menuLink('/resources');

    pressEnter(link);

    expect((document.getElementById('resource-category') as HTMLSelectElement).value).toBe('all');
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(document.getElementById(RESOURCES_HEADING_ID));
  });

  it('Enter on a category link focuses that category heading', () => {
    mountOnResourcesPage();
    const link = menuLink(`/resources#${FLOOD}`);

    pressEnter(link);

    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(document.getElementById(`${FLOOD}-heading`));
  });

  it('Enter on a category link a filter had hidden reveals and focuses its heading', () => {
    mountOnResourcesPage();
    selectCategory('building-codes');
    expect(document.getElementById(FLOOD)).toBeNull();
    const link = menuLink(`/resources#${FLOOD}`);

    pressEnter(link);

    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(document.getElementById(`${FLOOD}-heading`));
  });
});
