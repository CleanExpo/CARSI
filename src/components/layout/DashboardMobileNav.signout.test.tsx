// @vitest-environment jsdom
/**
 * GP-745 — mobile sign-out waits for signOut() and then makes a full-page navigation to /login
 * on the same origin.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const signOut = vi.hoisted(() => vi.fn());
vi.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { email: 'learner@example.com' }, signOut }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard/student' }));
vi.mock('@/components/layout/ViewModeToggle', () => ({ ViewModeToggle: () => null }));

import { DashboardMobileNav } from './DashboardMobileNav';

const realLocation = window.location;
let assigned: string[];
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  assigned = [];
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      origin: 'https://carsi.example',
      pathname: '/dashboard/student',
      href: 'https://carsi.example/dashboard/student',
      assign: (url: string) => assigned.push(url),
    },
  });
  signOut.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
});

describe('GP-745 mobile sign-out redirect', () => {
  it('signs out, then navigates to /login on the same origin', async () => {
    let finishSignOut: () => void = () => {};
    signOut.mockReturnValue(new Promise<void>((r) => (finishSignOut = r)));
    act(() => root.render(createElement(DashboardMobileNav)));

    // Open the menu, then press Sign out.
    const menuButton = [...container.querySelectorAll('button')].find((b) =>
      /menu/i.test(b.getAttribute('aria-label') ?? '')
    );
    expect(menuButton).toBeDefined();
    act(() => menuButton!.click());
    const signOutButton = container.querySelector<HTMLButtonElement>(
      '[data-testid="mobile-dashboard-sign-out"]'
    );
    expect(signOutButton).not.toBeNull();
    act(() => signOutButton!.click());

    // No navigation until signOut() has finished.
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(assigned).toEqual([]);
    await act(async () => finishSignOut());

    expect(assigned).toHaveLength(1);
    const dest = new URL(assigned[0]);
    expect(dest.origin).toBe('https://carsi.example');
    expect(dest.pathname).toBe('/login');
  });
});
