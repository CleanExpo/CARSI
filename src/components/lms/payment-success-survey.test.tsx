// @vitest-environment jsdom
/**
 * The payment-success page with and without the purchase survey (Authority Machine slice 1b).
 *
 * The golden file was captured from the page BEFORE the survey existed, so the flag-off test
 * proves the guest's screen is byte-for-byte what it was. The flag-on tests prove the survey
 * can never stand between a buyer and "Start lesson 1": a choice, a skip and a failed save
 * all leave the password form usable.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  search: 'session_id=cs_test_guest',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  useSearchParams: () => new URLSearchParams(nav.search),
  useParams: () => ({ slug: 'moisture-meters-readings-and-dry-standards' }),
}));

vi.mock('@/lib/api/client', async () => {
  class ApiClientError extends Error {
    constructor(
      message: string,
      public status: number,
    ) {
      super(message);
    }
  }
  return {
    ApiClientError,
    apiClient: {
      post: vi.fn(async () => {
        throw new ApiClientError('unauthorised', 401);
      }),
    },
  };
});

import { PaymentSuccessClient } from '../../../app/(public)/courses/[slug]/payment-success/PaymentSuccessClient';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const GOLDEN = resolve(
  process.cwd(),
  'src/components/lms/__fixtures__/payment-success-guest-setup.golden.html'
);

let container: HTMLDivElement;
let root: Root | null = null;
let surveyPosts: Array<Record<string, unknown>>;
let surveyResponse: () => Promise<Response>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  surveyPosts = [];
  surveyResponse = async () => jsonResponse({ saved: true });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('/api/lms/checkout/session')) {
        return jsonResponse({ email: 'guest@example.test', guest_checkout: true });
      }
      if (url === '/api/lms/checkout/survey') {
        surveyPosts.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
        return surveyResponse();
      }
      return jsonResponse({}, 404);
    })
  );
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container.remove();
  vi.unstubAllGlobals();
});

async function renderGuestSetup(props: Record<string, unknown>) {
  await act(async () => {
    root = createRoot(container);
    root.render(createElement(PaymentSuccessClient, props));
  });
  // Let the confirm -> session lookup chain settle into the guest_setup phase.
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
  expect(container.textContent).toContain('Payment successful');
  expect(container.querySelector('#ps-password')).not.toBeNull();
}

function lessonButton(): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>('button[type="submit"]')).find(
    (b) => b.textContent?.includes('Start lesson 1')
  );
  if (!button) throw new Error('Start lesson 1 button not rendered');
  return button;
}

function passwordFormUsable() {
  const password = container.querySelector<HTMLInputElement>('#ps-password');
  const name = container.querySelector<HTMLInputElement>('#ps-full-name');
  expect(password?.disabled).toBe(false);
  expect(name?.disabled).toBe(false);
  expect(lessonButton().disabled).toBe(false);
}

function clickButtonWithText(text: string) {
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => b.textContent?.trim() === text
  );
  if (!button) throw new Error(`button "${text}" not rendered`);
  act(() => button.click());
}

describe('payment-success guest screen with the survey flag off', () => {
  it('is byte-for-byte the screen that shipped before the survey existed', async () => {
    await renderGuestSetup({ surveyEnabled: false });
    if (process.env.CAPTURE_PAYMENT_SUCCESS_GOLDEN === '1') {
      writeFileSync(GOLDEN, container.innerHTML);
    }
    expect(container.innerHTML).toBe(readFileSync(GOLDEN, 'utf8'));
  });

  it('is unchanged when the prop is absent', async () => {
    await renderGuestSetup({});
    expect(container.innerHTML).toBe(readFileSync(GOLDEN, 'utf8'));
    expect(container.textContent).not.toContain('What work do you do?');
  });
});

describe('payment-success guest screen with the survey flag on', () => {
  it('shows both optional questions and the reason for asking above the password form', async () => {
    await renderGuestSetup({ surveyEnabled: true });
    expect(container.textContent).toContain('What work do you do?');
    expect(container.textContent).toContain('How did you find us?');
    expect(container.textContent).toContain('Optional. We use your answers to decide which courses to build.');
    const html = container.innerHTML;
    expect(html.indexOf('What work do you do?')).toBeLessThan(html.indexOf('ps-password'));
    passwordFormUsable();
  });

  it('T1b-7: tapping a choice leaves the password form usable', async () => {
    await renderGuestSetup({ surveyEnabled: true });
    clickButtonWithText('Commercial cleaning');
    passwordFormUsable();
  });

  it('T1b-7: tapping Skip hides the survey and leaves the password form usable', async () => {
    await renderGuestSetup({ surveyEnabled: true });
    clickButtonWithText('Skip');
    expect(container.textContent).not.toContain('What work do you do?');
    expect(surveyPosts).toHaveLength(0);
    passwordFormUsable();
  });

  it('T1b-6: a failed save never blocks Start lesson 1', async () => {
    surveyResponse = async () => jsonResponse({ detail: 'Could not save' }, 502);
    await renderGuestSetup({ surveyEnabled: true });
    clickButtonWithText('Commercial cleaning');
    clickButtonWithText('Google search');
    clickButtonWithText('Send answers');
    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        await Promise.resolve();
      });
    }
    expect(surveyPosts).toEqual([
      {
        session_id: 'cs_test_guest',
        industry: 'commercial_cleaning',
        found_via: 'google_search',
      },
    ]);
    passwordFormUsable();
  });
});
