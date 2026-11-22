// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  toast: vi.fn(),
  refreshUser: vi.fn(),
  // Stable identity, as the real provider gives: a new object per render would re-run load().
  authUser: { id: 'u1', email: 'learner@example.test', full_name: 'Learner' },
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) =>
    createElement('a', { href, ...rest }, children),
}));
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mocks.get, patch: mocks.patch } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: mocks.authUser, refreshUser: mocks.refreshUser }),
}));

import StudentProfilePage from '../../../app/(dashboard)/dashboard/student/profile/page';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * GP-775 review r3: the server now refuses to acknowledge an unsaved change, and the profile page
 * must not announce one either. "Saved" appears only when the stored choice equals the request,
 * and the checkbox shows what was stored.
 */
const SAVED = 'Achievement preferences saved';
const STORED_IN = {
  id: 'u1',
  email: 'learner@example.test',
  full_name: 'Learner',
  leaderboard_show_display_name: true,
  leaderboard_display_name: 'Alex K., QLD',
};

let container: HTMLDivElement;
let root: Root | null = null;

const flush = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

async function optOutAndSave() {
  await act(async () => {
    root = createRoot(container);
    root.render(createElement(StudentProfilePage));
  });
  await flush();
  const box = container.querySelector<HTMLInputElement>('#lb_show');
  expect(box).not.toBeNull();
  expect(box!.checked).toBe(true);
  await act(async () => {
    box!.click();
  });
  expect(box!.checked).toBe(false);
  const form = box!.closest('form')!;
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await flush();
  return box!;
}

const toastTitles = () => mocks.toast.mock.calls.map((c) => (c[0] as { title: string }).title);

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  mocks.get.mockResolvedValue(STORED_IN);
  mocks.refreshUser.mockResolvedValue(undefined);
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container.remove();
  vi.resetAllMocks();
});

describe('profile opt-out is confirmed only when stored (GP-775 r3)', () => {
  it('a rejected save is never announced as saved', async () => {
    mocks.patch.mockRejectedValue(new Error('503'));
    await optOutAndSave();
    expect(toastTitles()).not.toContain(SAVED);
  });

  it('a 200 that still says opted in is not announced as saved, and the box shows the stored state', async () => {
    mocks.patch.mockResolvedValue(STORED_IN); // server stored nothing new
    const box = await optOutAndSave();
    expect(toastTitles()).not.toContain(SAVED);
    expect(box.checked).toBe(true);
  });

  it('a stored opt-out is announced as saved', async () => {
    mocks.patch.mockResolvedValue({ ...STORED_IN, leaderboard_show_display_name: false });
    const box = await optOutAndSave();
    expect(toastTitles()).toContain(SAVED);
    expect(box.checked).toBe(false);
  });
});
