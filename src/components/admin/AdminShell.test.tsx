// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminShell } from './AdminShell';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const navigation = vi.hoisted(() => ({ pathname: '/admin/coaching-learning-paths' }));
vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: null, signOut: vi.fn() }),
}));
vi.mock('@/components/layout/ViewModeToggle', () => ({ ViewModeToggle: () => null }));

let root: Root;
let container: HTMLDivElement;
let desktop: boolean;
let onBreakpoint: ((event: { matches: boolean }) => void) | undefined;

beforeEach(() => {
  navigation.pathname = '/admin/coaching-learning-paths';
  desktop = false;
  onBreakpoint = undefined;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: desktop,
      addEventListener: (_: string, listener: typeof onBreakpoint) => {
        onBreakpoint = listener;
      },
      removeEventListener: vi.fn(),
    }))
  );
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render() {
  await act(async () =>
    root.render(
      <AdminShell>
        <h1>Learning paths</h1>
      </AdminShell>
    )
  );
}

function trigger() {
  const button = container.querySelector<HTMLButtonElement>(
    'button[aria-label="Open navigation menu"]'
  );
  expect(button, 'phone navigation needs a labelled menu button').not.toBeNull();
  return button!;
}

async function open() {
  trigger().focus();
  await act(async () => trigger().click());
  expect(trigger().getAttribute('aria-expanded')).toBe('true');
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
  expect(dialog).not.toBeNull();
  return dialog!;
}

describe('AdminShell responsive navigation', () => {
  it('at phone width hides the persistent sidebar and opens navigation with the menu button', async () => {
    await render();
    const sidebar = container.querySelector('aside')!;
    expect(sidebar.classList.contains('hidden')).toBe(true);
    expect(sidebar.classList.contains('md:flex')).toBe(true);
    expect(trigger().closest('header')?.classList.contains('md:hidden')).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    const dialog = await open();
    expect(dialog.textContent).toContain('Learning paths');
    expect(dialog.textContent).toContain('Owner Circle');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('Escape closes the drawer and returns focus to the menu button', async () => {
    await render();
    await open();
    await act(async () => {
      document.activeElement?.dispatchEvent(
        // Cancelable like a real key press, so a handler that vetoes dismissal fails this test.
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      );
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger()));
  });

  it('keeps focus inside the open drawer and wraps Tab and Shift+Tab', async () => {
    await render();
    const dialog = await open();
    const outside = document.createElement('button');
    outside.textContent = 'Control outside the drawer';
    document.body.appendChild(outside);
    try {
      // A modal drawer must not let focus land on a control behind it.
      await act(async () => outside.focus());
      expect(document.activeElement).not.toBe(outside);
      expect(dialog.contains(document.activeElement)).toBe(true);
      await act(async () => trigger().focus());
      expect(document.activeElement).not.toBe(trigger());
      expect(dialog.contains(document.activeElement)).toBe(true);

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
      );
      expect(focusable.length).toBeGreaterThan(1);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const tab = (shiftKey: boolean) =>
        act(async () => {
          document.activeElement?.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true })
          );
        });

      await act(async () => last.focus());
      await tab(false);
      expect(document.activeElement).toBe(first);
      await tab(true);
      expect(document.activeElement).toBe(last);
    } finally {
      outside.remove();
    }
  });

  it('closes when selecting a navigation link, including the current page', async () => {
    await render();
    const dialog = await open();
    const link = dialog.querySelector<HTMLAnchorElement>(
      'a[href="/admin/coaching-learning-paths"]'
    )!;
    // Keep jsdom from attempting a full navigation; the real click still reaches the nav.
    link.addEventListener('click', (event) => event.preventDefault());
    await act(async () => link.click());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger()));
  });

  it('closes when the route changes outside a navigation click', async () => {
    await render();
    await open();
    navigation.pathname = '/admin/business-coaching';
    await render();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('at desktop width retains the 240px sidebar and clears any open mobile modal on resize', async () => {
    desktop = true;
    await render();
    const sidebar = container.querySelector('aside')!;
    expect(sidebar.classList.contains('md:w-[240px]')).toBe(true);
    expect(sidebar.classList.contains('md:flex')).toBe(true);
    expect(sidebar.querySelectorAll('nav a')).toHaveLength(18);
    expect(container.querySelector('main')?.classList.contains('min-w-0')).toBe(true);
    await open();
    await act(async () => onBreakpoint?.({ matches: true }));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('keeps desktop navigation sizing while the phone drawer can scroll', async () => {
    await render();
    const nav = container.querySelector('aside nav')!;
    expect(nav.classList.contains('overflow-y-auto')).toBe(true);
    expect(nav.classList.contains('md:overflow-visible')).toBe(true);
    expect(nav.classList.contains('md:min-h-auto')).toBe(true);
    expect(nav.classList.contains('whitespace-nowrap')).toBe(true);
  });
});
