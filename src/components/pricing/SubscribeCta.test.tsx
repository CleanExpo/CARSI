// @vitest-environment jsdom
/**
 * /subscribe "Start membership" (Done item 1): a logged-out buyer whose checkout call is
 * refused with 401 is sent to register in-flow (`/register?next=%2Fsubscribe`), never to /login;
 * a signed-in buyer is sent to the Stripe URL the checkout returns.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/client')>()),
  apiClient: { post },
}));

import { ApiClientError } from '@/lib/api/client';

import { SubscribeCta } from '../../../app/(public)/subscribe/SubscribeCta';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const realLocation = window.location;
const nav = { href: '' };

beforeEach(() => {
  post.mockReset();
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

async function clickStart() {
  act(() => root.render(createElement(SubscribeCta, { enabled: true, reason: null })));
  const button = container.querySelector('button');
  expect(button?.textContent).toContain('Start membership');
  await act(async () => {
    button!.click();
  });
}

describe('SubscribeCta "Start membership"', () => {
  it('logged out (401): goes to register in-flow returning to /subscribe, not /login', async () => {
    post.mockRejectedValue(new ApiClientError('Sign in to start your membership.', 401));
    await clickStart();
    expect(post).toHaveBeenCalledWith('/api/lms/subscription/checkout', {});
    expect(nav.href).toBe('/register?next=%2Fsubscribe');
  });

  it('signed in: goes to the Stripe Checkout URL', async () => {
    post.mockResolvedValue({ url: 'https://checkout.stripe.test/cs_1' });
    await clickStart();
    expect(nav.href).toBe('https://checkout.stripe.test/cs_1');
  });
});
