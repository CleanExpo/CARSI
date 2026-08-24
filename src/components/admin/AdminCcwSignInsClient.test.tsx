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
      offerEligible: false,
      membershipCompedAt: null,
    },
  ],
};

const COMP_ENDPOINT = '/api/admin/ccw-roadshow/comp-membership';

/** Both days, opted in, provisioned — the state the comp is offered for. */
const eligibleRow = {
  signInId: 'sign-in-2',
  eventSlug: 'melbourne',
  fullName: 'Eligible Attendee',
  businessName: 'Restoration Co',
  email: 'eligible@example.test',
  registrationId: null,
  isWalkIn: false,
  provisionStatus: 'provisioned',
  day1CheckedInAt: '2026-07-22T00:00:00.000Z',
  day2CheckedInAt: '2026-07-23T00:00:00.000Z',
  emailOptIn: true,
  offerEmailSentAt: null,
  courseAccessGranted: true,
  attendanceComplete: true,
  offerEligible: true,
  membershipCompedAt: null,
};

function rosterOf(...rows: unknown[]) {
  return { eventSlug: 'melbourne', courseSlug: 'ccw-2-day-workshop', rows };
}

function compButtons(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll('button')).filter(
    (candidate) => candidate.textContent?.trim() === 'Comp membership'
  );
}

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

/** Remount with a chosen roster; the shared beforeEach mounts the default one. */
async function remount(rosterFixture: unknown) {
  await act(async () => root.unmount());
  container.remove();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  vi.mocked(fetch).mockResolvedValue(jsonResponse({ roster: rosterFixture }));
  await act(async () => {
    root.render(<AdminCcwSignInsClient />);
  });
}

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

describe('AdminCcwSignInsClient comp membership action', () => {
  function stubDialogs(price: string | null, confirmed = true) {
    vi.spyOn(window, 'prompt').mockReturnValue(price);
    vi.spyOn(window, 'confirm').mockReturnValue(confirmed);
    return vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  }

  function compCalls() {
    return vi.mocked(fetch).mock.calls.filter(([url]) => url === COMP_ENDPOINT);
  }

  it('offers the comp only where it can succeed, and reports an existing comp instead', async () => {
    await remount(
      rosterOf(
        eligibleRow,
        { ...eligibleRow, signInId: 'sign-in-3', membershipCompedAt: '2026-08-24T04:15:00.000Z' },
        { ...eligibleRow, signInId: 'sign-in-4', offerEligible: false }
      )
    );

    // One button: not for the already-comped row (the route answers 409), and
    // not for the ineligible row (403). Both are refusals worth not offering.
    expect(compButtons(container)).toHaveLength(1);
    // Rendered in the viewer's locale, not sliced from the UTC ISO string: a
    // comp stamped 04:15Z is the 24th in UTC but already the 24th afternoon in
    // Melbourne, and an operator reconciles against the local date.
    const localDate = new Date('2026-08-24T04:15:00.000Z').toLocaleDateString('en-AU');
    expect(container.textContent).toContain(`Comped ${localDate}`);
  });

  it('posts the entered price to the comp endpoint and reports what was granted', async () => {
    await remount(rosterOf(eligibleRow));
    const alertSpy = stubDialogs('295');

    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          priceLabel: 'A$295',
          reachableCourseCount: 12,
          publishedCourseCount: 14,
        })
      )
      .mockResolvedValueOnce(jsonResponse({ roster: rosterOf(eligibleRow) }));

    await act(async () => {
      compButtons(container)[0].click();
    });

    expect(compCalls()).toHaveLength(1);
    const [, init] = compCalls()[0];
    expect(JSON.parse(String(init?.body))).toEqual({
      signInId: 'sign-in-2',
      pricingMode: 'custom',
      priceAud: 295,
    });

    const message = String(alertSpy.mock.calls[0]?.[0] ?? '');
    expect(message).toContain('eligible@example.test');
    expect(message).toContain('A$295');
    expect(message).toContain('12 of 14');
  });

  it('sends the free pricing mode for a zero price rather than a custom $0', async () => {
    await remount(rosterOf(eligibleRow));
    stubDialogs('0');

    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ ok: true, priceLabel: 'Complimentary' }))
      .mockResolvedValueOnce(jsonResponse({ roster: rosterOf(eligibleRow) }));

    await act(async () => {
      compButtons(container)[0].click();
    });

    expect(JSON.parse(String(compCalls()[0][1]?.body))).toMatchObject({
      pricingMode: 'free',
      priceAud: 0,
    });
  });

  it('refuses a malformed price without touching the endpoint', async () => {
    await remount(rosterOf(eligibleRow));
    stubDialogs('two hundred');

    await act(async () => {
      compButtons(container)[0].click();
    });

    expect(compCalls()).toHaveLength(0);
    expect(container.textContent).toContain('digits only, up to two decimal places');
  });

  it('abandons the comp when the operator cancels the confirmation', async () => {
    await remount(rosterOf(eligibleRow));
    stubDialogs('295', false);

    await act(async () => {
      compButtons(container)[0].click();
    });

    expect(compCalls()).toHaveLength(0);
  });

  it('abandons the comp when the price prompt is dismissed', async () => {
    await remount(rosterOf(eligibleRow));
    stubDialogs(null);

    await act(async () => {
      compButtons(container)[0].click();
    });

    expect(compCalls()).toHaveLength(0);
  });
});
