// @vitest-environment jsdom
/**
 * GP-591, stranger -> first course. A visitor who clicks a free course, signs up
 * (`/register?next=/courses/<slug>`), must end up ENROLLED and on the first lesson.
 *
 * `/api/lms/checkout` answers `{ enrolled: true }` for a free course but writes no enrolment;
 * only `/api/lms/enrollments/confirm` does. The form used to stop at the checkout answer, show
 * "You're enrolled" and send the learner to an empty dashboard.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  register: vi.fn(),
  post: vi.fn(),
  toast: vi.fn(),
  params: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({ useSearchParams: () => mocks.params }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/api/auth', () => ({ authApi: { register: mocks.register } }));
vi.mock('@/lib/api/client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/client')>()),
  apiClient: { post: mocks.post },
}));

import { RegisterForm } from './register-form';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SLUG = 'water-damage-essentials';
let container: HTMLDivElement;
let root: Root;
const realLocation = window.location;
const nav = { href: '', origin: 'https://carsi.example.test' };

function setValue(name: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  expect(input, name).not.toBeNull();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input!.dispatchEvent(new Event('input', { bubbles: true }));
}

async function registerWith(query: string) {
  mocks.params = new URLSearchParams(query);
  act(() => root.render(createElement(RegisterForm)));
  act(() => {
    setValue('fullName', 'New Learner');
    setValue('email', 'learner@example.com');
    setValue('password', 'correct-horse-9');
    setValue('confirmPassword', 'correct-horse-9');
  });
  await act(async () => {
    container.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
  });
  // The form navigates after a toast delay (200 ms success, 1500 ms failure).
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1600));
  });
}

function toastTitles(): string[] {
  return mocks.toast.mock.calls.map(([arg]) => String((arg as { title?: unknown }).title));
}

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.register.mockReset().mockImplementation(async () => {
    mocks.calls.push('register');
    return {};
  });
  mocks.post.mockReset();
  mocks.toast.mockReset();
  nav.href = '';
  Object.defineProperty(window, 'location', { configurable: true, value: nav });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
});

describe('RegisterForm — sign up from a free course', () => {
  it('registers, confirms the enrolment, then opens the first lesson', async () => {
    mocks.post.mockImplementation(async (path: string) => {
      mocks.calls.push(`post ${path}`);
      if (path === '/api/lms/checkout') return { enrolled: true };
      if (path === '/api/lms/enrollments/confirm') {
        return { learn_url: `/dashboard/learn/${SLUG}/lesson-1` };
      }
      throw new Error(`unexpected ${path}`);
    });

    await registerWith(`next=%2Fcourses%2F${SLUG}`);

    expect(mocks.calls).toEqual([
      'register',
      'post /api/lms/checkout',
      'post /api/lms/enrollments/confirm',
    ]);
    expect(mocks.post).toHaveBeenCalledWith('/api/lms/enrollments/confirm', { slug: SLUG });
    expect(nav.href).toBe(`/dashboard/learn/${SLUG}/lesson-1`);
  });

  it('does not claim enrolment, and returns to the course, when confirm fails', async () => {
    mocks.post.mockImplementation(async (path: string) => {
      if (path === '/api/lms/checkout') return { enrolled: true };
      throw new Error('confirm unavailable');
    });

    await registerWith(`next=%2Fcourses%2F${SLUG}`);

    expect(nav.href).toBe(`/courses/${SLUG}`);
    expect(toastTitles().some((t) => /enrolled/i.test(t) && !/did not finish/i.test(t))).toBe(false);
    expect(container.textContent).toContain('Press Enrol to try again');
  });

  it('still sends a paid course to its Stripe checkout without confirming', async () => {
    mocks.post.mockResolvedValue({ checkout_url: 'https://checkout.stripe.test/cs_course' });

    await registerWith(`next=%2Fcourses%2F${SLUG}`);

    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(nav.href).toBe('https://checkout.stripe.test/cs_course');
  });

  it.each([
    ['backslash host', 'next=%2F%5Cevil.example'],
    ['protocol-relative host', 'next=%2F%2Fevil.example'],
    ['absolute URL', 'next=https%3A%2F%2Fevil.example'],
  ])('ignores an unsafe next (%s) and goes to the dashboard', async (_label, query) => {
    await registerWith(query);
    expect(mocks.post).not.toHaveBeenCalled();
    expect(nav.href).toBe('/dashboard');
  });
});
