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
let completionPosts: Array<Record<string, unknown>>;

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
  completionPosts = [];
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
      if (url === '/api/lms/enrollments/guest-complete') {
        completionPosts.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
        // A refusal keeps the page in place (a success would navigate away, which jsdom cannot).
        return jsonResponse({ detail: 'Stopped by the test after the request was sent' }, 400);
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

function typeInto(selector: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`${selector} not rendered`);
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setValue.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/**
 * Proves the guest can really finish setup: types a name and password, presses
 * "Start lesson 1", and checks the completion request left with exactly what was typed.
 * Checking `disabled` flags alone passed with a non-interactive form (release-gate P1).
 */
async function passwordFormUsable() {
  const before = completionPosts.length;
  typeInto('#ps-full-name', 'Test Guest');
  typeInto('#ps-password', 'a-long-test-password');
  await act(async () => {
    lessonButton().click();
  });
  for (let i = 0; i < 3; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
  expect(completionPosts.slice(before)).toEqual([
    { session_id: 'cs_test_guest', password: 'a-long-test-password', full_name: 'Test Guest' },
  ]);
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

  it('a guest can type and submit the password form (completion request fires)', async () => {
    await renderGuestSetup({ surveyEnabled: false });
    await passwordFormUsable();
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
    await passwordFormUsable();
  });

  it('T1b-7: tapping a choice leaves the password form usable', async () => {
    await renderGuestSetup({ surveyEnabled: true });
    clickButtonWithText('Commercial cleaning');
    await passwordFormUsable();
  });

  it('T1b-7: tapping Skip hides the survey and leaves the password form usable', async () => {
    await renderGuestSetup({ surveyEnabled: true });
    clickButtonWithText('Skip');
    expect(container.textContent).not.toContain('What work do you do?');
    expect(surveyPosts).toHaveLength(0);
    await passwordFormUsable();
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
    await passwordFormUsable();
  });
});
