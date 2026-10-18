// @vitest-environment jsdom
/**
 * V6 — membership_checkout_started fires exactly once per real membership checkout, at the shared
 * boundary (`createMembershipCheckout`), whichever way the buyer arrives. CI-runnable: the
 * components are rendered directly, so nothing depends on SUBSCRIPTIONS_ENABLED.
 *
 * The real analytics path runs (trackFunnelEvent → ga4-client → window.gtag); only the network
 * call is stubbed. gtag is a recorder installed before rendering.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  register: vi.fn(async () => ({})),
  params: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({ useSearchParams: () => mocks.params }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/api/auth', () => ({ authApi: { register: mocks.register } }));
vi.mock('@/lib/api/client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/client')>()),
  apiClient: { post: mocks.post },
}));

import { RegisterForm } from '@/components/auth/register-form';
import { ApiClientError } from '@/lib/api/client';

import { SubscribeCta } from '../../app/(public)/subscribe/SubscribeCta';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const STRIPE_URL = 'https://checkout.stripe.test/cs_member';
let container: HTMLDivElement;
let root: Root;
let gtagCalls: unknown[][];
const realLocation = window.location;
const nav = { href: '', origin: 'https://carsi.example.test' };

const checkoutEvents = () =>
  gtagCalls.filter((c) => c[0] === 'event' && c[1] === 'membership_checkout_started');

beforeEach(() => {
  mocks.post.mockReset();
  mocks.register.mockClear();
  gtagCalls = [];
  (window as unknown as { gtag: (...a: unknown[]) => void }).gtag = (...a: unknown[]) => {
    gtagCalls.push(a);
  };
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
  delete (window as unknown as { gtag?: unknown }).gtag;
});

async function clickStart(reason: 'lapsed' | null = null) {
  act(() => root.render(createElement(SubscribeCta, { enabled: true, reason })));
  const button = container.querySelector('button');
  expect(button?.textContent).toMatch(/Start membership|Renew membership/);
  await act(async () => {
    button!.click();
  });
}

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
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  // The form navigates after a 200 ms toast delay.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
}

describe('membership_checkout_started — the shared checkout boundary', () => {
  it('a signed-in buyer: fires once with the price, then goes to Stripe', async () => {
    mocks.post.mockResolvedValue({ url: STRIPE_URL });
    await clickStart();
    expect(checkoutEvents()).toHaveLength(1);
    expect(checkoutEvents()[0][2]).toEqual({ is_renewal: false, value: 795, currency: 'AUD' });
    expect(nav.href).toBe(STRIPE_URL);
  });

  it('a lapsed member renewing: fires once, marked as a renewal', async () => {
    mocks.post.mockResolvedValue({ url: STRIPE_URL });
    await clickStart('lapsed');
    expect(checkoutEvents()).toHaveLength(1);
    expect(checkoutEvents()[0][2]).toMatchObject({ is_renewal: true });
  });

  it('a refused or empty checkout fires nothing', async () => {
    mocks.post.mockResolvedValue({});
    await clickStart();
    mocks.post.mockRejectedValue(new ApiClientError('Unavailable', 503));
    await act(async () => {
      container.querySelector('button')!.click();
    });
    expect(checkoutEvents()).toHaveLength(0);
  });

  // Review r1 P1-V6-GUEST-CHECKOUT-UNTRACKED
  it('a guest: the 401 click fires nothing; the checkout resumed after registering fires once', async () => {
    mocks.post.mockRejectedValueOnce(new ApiClientError('Unauthorized', 401));
    await clickStart();
    expect(nav.href).toBe('/register?next=%2Fsubscribe');
    expect(checkoutEvents()).toHaveLength(0);

    act(() => root.unmount());
    root = createRoot(container);
    mocks.post.mockResolvedValue({ url: STRIPE_URL });
    await registerFromSubscribe();
    expect(mocks.register).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenLastCalledWith('/api/lms/subscription/checkout', {});
    expect(nav.href).toBe(STRIPE_URL);
    expect(checkoutEvents()).toHaveLength(1);
    expect(checkoutEvents()[0][2]).toEqual({ is_renewal: false, value: 795, currency: 'AUD' });
  });

  it('a guest whose resumed checkout fails fires nothing and lands on /subscribe', async () => {
    mocks.post.mockRejectedValue(new Error('checkout unavailable'));
    await registerFromSubscribe();
    expect(nav.href).toBe('/subscribe');
    expect(checkoutEvents()).toHaveLength(0);
  });
});
