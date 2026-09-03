// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const authApiMock = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
}));
vi.mock('@/lib/api/auth', () => ({ authApi: authApiMock }));

import { AuthProvider, useAuth } from './auth-provider';

const SIGNED_IN = { id: 'u1', email: 'learner@example.test', full_name: 'Learner', role: 'user' };

/** Prints the provider's state so the assertions read the DOM, not internals. */
function Probe() {
  const { user, loading } = useAuth();
  return createElement('span', { 'data-loading': String(loading), 'data-user': user?.email ?? '' });
}

function tree() {
  return createElement(AuthProvider, null, createElement(Probe));
}

function probe(container: HTMLElement) {
  const span = container.querySelector('span');
  return { loading: span?.getAttribute('data-loading'), user: span?.getAttribute('data-user') };
}

function setSentinel(present: boolean) {
  document.cookie = present
    ? 'carsi_session=1; path=/'
    : 'carsi_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

let container: HTMLDivElement;
let root: Root | null = null;

beforeEach(() => {
  authApiMock.getCurrentUser.mockReset();
  authApiMock.getCurrentUser.mockResolvedValue(SIGNED_IN);
  setSentinel(false);
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  container.remove();
  setSentinel(false);
});

async function mount() {
  act(() => {
    root = createRoot(container);
    root.render(tree());
  });
  await act(async () => {
    await Promise.resolve();
  });
}

describe('AuthProvider and the session sentinel', () => {
  it('makes no auth request for an anonymous visitor and resolves loading at once', async () => {
    await mount();
    expect(authApiMock.getCurrentUser).not.toHaveBeenCalled();
    expect(probe(container)).toEqual({ loading: 'false', user: '' });
  });

  it('asks /api/auth/me exactly once when the sentinel is present and exposes the user', async () => {
    setSentinel(true);
    await mount();
    expect(authApiMock.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(probe(container)).toEqual({ loading: 'false', user: SIGNED_IN.email });
  });

  it('with a stale sentinel and no live session, asks once and ends signed out', async () => {
    setSentinel(true);
    authApiMock.getCurrentUser.mockResolvedValue(null);
    await mount();
    expect(authApiMock.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(probe(container)).toEqual({ loading: 'false', user: '' });
  });

  it('renders loading on the server without any request, so hydration matches', () => {
    const html = renderToStaticMarkup(tree());
    expect(html).toContain('data-loading="true"');
    expect(authApiMock.getCurrentUser).not.toHaveBeenCalled();
  });

  it('positive control: the pre-fix provider would have called on mount regardless of the cookie', async () => {
    // The mock resolves a user; only the sentinel gate keeps the anonymous mount from calling it.
    setSentinel(false);
    await mount();
    expect(authApiMock.getCurrentUser).not.toHaveBeenCalled();
    setSentinel(true);
    act(() => {
      root?.unmount();
    });
    root = null;
    await mount();
    expect(authApiMock.getCurrentUser).toHaveBeenCalledTimes(1);
  });
});
