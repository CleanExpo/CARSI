// @vitest-environment jsdom

import { Fragment, act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: null, loading: false, signOut: async () => {} }),
}));

import { RESOURCES_HEADING_ID, ResourcesBrowser } from '@/components/resources/ResourcesBrowser';

import MobileNav from './MobileNav';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root | null = null;

function toggle(): HTMLButtonElement {
  const el = container.querySelector<HTMLButtonElement>('button[aria-label$="menu"]');
  if (!el) throw new Error('no mobile menu toggle rendered');
  return el;
}

function resourcesTrigger(): HTMLButtonElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Free Resources')
    ) ?? null
  );
}

function openBoth() {
  act(() => {
    root = createRoot(container);
    root.render(createElement(MobileNav, { tone: 'light' }));
  });
  act(() => toggle().click());
  const trigger = resourcesTrigger();
  if (!trigger) throw new Error('Free Resources trigger not rendered in the mobile panel');
  act(() => trigger.click());
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  return trigger;
}

function pressEscape(target: Element) {
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
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
  document.body.style.overflow = '';
  window.history.replaceState(null, '', '/');
});

describe('MobileNav with the Free Resources disclosure', () => {
  it('first Escape closes only the disclosure and returns focus to its trigger; a second closes the menu and focuses the toggle', async () => {
    const trigger = openBoth();
    const panel = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
    const link = panel?.querySelector('a');
    if (!link) throw new Error('no resource link in the open disclosure');
    act(() => link.focus());
    expect(document.activeElement).toBe(link);

    pressEscape(link);

    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    const survivingTrigger = resourcesTrigger();
    expect(survivingTrigger).toBe(trigger);
    expect(survivingTrigger?.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(survivingTrigger);

    pressEscape(survivingTrigger as Element);
    expect(toggle().getAttribute('aria-expanded')).toBe('false');

    // The panel unmounts after its exit animation; focus must land on the surviving toggle,
    // not fall back to <body>.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });
    expect(document.querySelector('nav[aria-label="Mobile navigation"]')).toBeNull();
    expect(document.activeElement).toBe(toggle());
  });

  it('caps the fixed panel to the viewport and scrolls it vertically so every link stays reachable', () => {
    openBoth();
    const nav = document.querySelector('nav[aria-label="Mobile navigation"]');
    const panel = nav?.parentElement;
    if (!panel) throw new Error('mobile panel not rendered');
    const classes = panel.className.split(/\s+/);
    // Body scroll is locked while the menu is open, so the panel itself must scroll.
    expect(document.body.style.overflow).toBe('hidden');
    expect(classes.some((c) => /^max-h-\[calc\(100dvh-\d+px\)\]$/.test(c))).toBe(true);
    expect(classes).toContain('overflow-y-auto');
    expect(classes).not.toContain('overflow-hidden');
  });
});

describe('MobileNav Free Resources links on the /resources page', () => {
  const FLOOD = 'flood-and-storm-resilience';

  function openOnResourcesPage(): HTMLElement {
    window.history.replaceState(null, '', '/resources');
    act(() => {
      root = createRoot(container);
      root.render(
        createElement(
          Fragment,
          null,
          createElement(MobileNav, { tone: 'light' }),
          createElement('h1', { id: RESOURCES_HEADING_ID, tabIndex: -1 }, 'Free guides'),
          createElement(ResourcesBrowser)
        )
      );
    });
    act(() => toggle().click());
    const trigger = resourcesTrigger();
    if (!trigger) throw new Error('Free Resources trigger not rendered in the mobile panel');
    act(() => trigger.click());
    const panel = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
    if (!panel) throw new Error('no open disclosure panel');
    return panel;
  }

  // Keyboard activation: focus, then Enter, which the browser turns into a click (detail 0).
  async function pressEnterAndSettle(link: HTMLAnchorElement) {
    act(() => link.focus());
    expect(document.activeElement).toBe(link);
    act(() => {
      link.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      );
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
    });
    // Let the panel's exit animation finish and unmount the focused link.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });
    expect(document.querySelector('nav[aria-label="Mobile navigation"]')).toBeNull();
  }

  function link(panel: HTMLElement, href: string): HTMLAnchorElement {
    const a = Array.from(panel.querySelectorAll('a')).find(
      (el) => el.getAttribute('href') === href
    );
    if (!a) throw new Error(`no link for ${href}`);
    return a;
  }

  it('Enter on "All free resources" closes the menu and focuses the page heading, not <body>', async () => {
    const panel = openOnResourcesPage();
    await pressEnterAndSettle(link(panel, '/resources'));
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(document.getElementById(RESOURCES_HEADING_ID));
  });

  it('Enter on a category link closes the menu and focuses that category heading', async () => {
    const panel = openOnResourcesPage();
    await pressEnterAndSettle(link(panel, `/resources#${FLOOD}`));
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(document.getElementById(`${FLOOD}-heading`));
  });
});
