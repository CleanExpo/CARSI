// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminCcwSignInsClient } from './AdminCcwSignInsClient';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('uqr', () => ({ renderSVG: vi.fn().mockReturnValue('<svg />') }));
vi.mock('@/lib/marketing/ccw-roadshow', () => ({
  ccwRoadshowEvents: [{ slug: 'melbourne', city: 'Melbourne' }],
}));

const roster = {
  eventSlug: 'melbourne',
  courseSlug: 'ccw-2-day-workshop',
  rows: [
    {
      signInId: 'sign-in-1',
      eventSlug: 'melbourne',
      fullName: 'Synthetic Attendee',
      businessName: null,
      email: 'attendee@example.test',
      registrationId: null,
      isWalkIn: true,
      provisionStatus: 'pending',
      day1CheckedInAt: '2026-07-22T00:00:00.000Z',
      day2CheckedInAt: null,
      courseAccessGranted: false,
      attendanceComplete: false,
    },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function buttonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === text
  );
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Button not found: ${text}`);
  return button;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ roster })));
  vi.spyOn(window, 'prompt').mockReturnValue('operator reason');
  await act(async () => {
    root.render(<AdminCcwSignInsClient />);
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('AdminCcwSignInsClient mutation pending contract', () => {
  it('disables and marks correction busy, settles rejection, then permits a safe retry', async () => {
    const fetchMock = vi.mocked(fetch);
    const firstMutation = deferred<Response>();
    fetchMock.mockImplementationOnce(() => firstMutation.promise);

    let reverse = buttonByText(container, 'Reverse D1');
    await act(async () => {
      reverse.click();
    });

    reverse = buttonByText(container, 'Reverse D1');
    expect(reverse.disabled).toBe(true);
    expect(reverse.getAttribute('aria-busy')).toBe('true');
    reverse.click();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      firstMutation.reject(new Error('synthetic network failure'));
      await firstMutation.promise.catch(() => undefined);
    });

    reverse = buttonByText(container, 'Reverse D1');
    expect(reverse.disabled).toBe(false);
    expect(reverse.getAttribute('aria-busy')).toBe('false');
    expect(container.textContent).toContain('Network error while completing the action');

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse({ roster }));
    await act(async () => {
      reverse.click();
    });

    const mutationCalls = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');
    expect(mutationCalls).toHaveLength(2);
    expect(buttonByText(container, 'Reverse D1').disabled).toBe(false);
  });

  it('disables and marks merge busy while preventing a duplicate in-flight request', async () => {
    const fetchMock = vi.mocked(fetch);
    const mutation = deferred<Response>();
    fetchMock.mockImplementationOnce(() => mutation.promise);

    let merge = buttonByText(container, 'Merge dupe');
    await act(async () => {
      merge.click();
    });

    merge = buttonByText(container, 'Merge dupe');
    expect(merge.disabled).toBe(true);
    expect(merge.getAttribute('aria-busy')).toBe('true');
    merge.click();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockResolvedValueOnce(jsonResponse({ roster }));
    await act(async () => {
      mutation.resolve(jsonResponse({ ok: true }));
      await mutation.promise;
    });

    merge = buttonByText(container, 'Merge dupe');
    expect(merge.disabled).toBe(false);
    expect(merge.getAttribute('aria-busy')).toBe('false');
  });
});
