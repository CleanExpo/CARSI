// @vitest-environment jsdom
/**
 * Done item 1, register-in-flow: a buyer who reached /register from "Start membership"
 * (`next=/subscribe`) is registered first, then the form opens the membership checkout with the
 * session that registration just set, and navigates to the Stripe URL it returns. If checkout
 * cannot start, the buyer lands on /subscribe instead of being stranded.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  register: vi.fn(),
  post: vi.fn(),
  params: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({ useSearchParams: () => mocks.params }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/api/auth', () => ({ authApi: { register: mocks.register } }));
vi.mock('@/lib/api/client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/client')>()),
  apiClient: { post: mocks.post },
}));

import { RegisterForm } from './register-form';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

async function registerFromSubscribe() {
  mocks.params = new URLSearchParams('next=%2Fsubscribe');
  act(() => root.render(createElement(RegisterForm)));
  act(() => {
    setValue('fullName', 'Test Buyer');
    setValue('email', 'buyer@example.com');
    setValue('password', 'correct-horse-9');
    setValue('confirmPassword', 'correct-horse-9');
  });
  await act(async () => {
    container.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
  });
  // The form navigates after a 200 ms toast delay.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
}

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.register.mockReset().mockImplementation(async () => {
    mocks.calls.push('register');
    return {};
  });
  mocks.post.mockReset();
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

describe('RegisterForm — resume membership checkout after registering', () => {
  it('registers, then opens the membership checkout and goes to the Stripe URL', async () => {
    mocks.post.mockImplementation(async (path: string) => {
      mocks.calls.push(`post ${path}`);
      return { url: 'https://checkout.stripe.test/cs_member' };
    });
    await registerFromSubscribe();

    expect(mocks.register).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'buyer@example.com', full_name: 'Test Buyer' })
    );
    // Checkout is opened only after registration has set the new session.
    expect(mocks.calls).toEqual(['register', 'post /api/lms/subscription/checkout']);
    expect(mocks.post).toHaveBeenCalledWith('/api/lms/subscription/checkout', {});
    expect(nav.href).toBe('https://checkout.stripe.test/cs_member');
  });

  it('falls back to /subscribe when the checkout call fails', async () => {
    mocks.post.mockRejectedValue(new Error('checkout unavailable'));
    await registerFromSubscribe();
    expect(mocks.post).toHaveBeenCalledWith('/api/lms/subscription/checkout', {});
    expect(nav.href).toBe('/subscribe');
  });

  it('falls back to /subscribe when checkout returns no URL', async () => {
    mocks.post.mockResolvedValue({});
    await registerFromSubscribe();
    expect(nav.href).toBe('/subscribe');
  });
});
