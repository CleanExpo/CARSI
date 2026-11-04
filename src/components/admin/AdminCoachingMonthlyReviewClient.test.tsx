// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AdminCoachingMonthlyReviewClient,
  type MonthlyReviewView,
} from './AdminCoachingMonthlyReviewClient';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const members = [
  { userId: A, email: 'a@example.test', fullName: 'Member A', subscriptionStatus: 'active' },
  { userId: B, email: 'b@example.test', fullName: 'Member B', subscriptionStatus: 'active' },
];

function draftView(title: string): MonthlyReviewView {
  return {
    status: 'draft',
    nextSession: { id: 's1', scheduledAt: '2026-11-10T00:00:00.000Z' },
    goals: [{ id: 'g1', title: 'One more direct job booked per week' }],
    currentGuidance: 'Old guidance',
    generatedAt: '2026-11-04T00:00:00.000Z',
    source: 'model',
    review: {
      summary: '2 of 5 actions done, 1 blocked, 2 still open.',
      counts: { total: 5, done: 2, blocked: 1, open: 2 },
      completed: [{ title: 'Call every quote', note: null }],
      blocked: [{ title: 'Write the crew lead job description', reason: 'Pay unclear.' }],
      open: [{ title: 'Price a second van', status: 'todo' }],
      memberFlagged: ['To discuss: Crew lead pay rates'],
    },
    guidance: 'New draft guidance',
    actions: [{ title, description: null, goalId: 'g1', priority: 'high', dueDate: '2026-11-20' }],
  };
}

function json(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function flush() {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  });
}

async function choose(userId: string) {
  const select = container.querySelector('select') as HTMLSelectElement;
  act(() => {
    select.value = userId;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await flush();
}

function button(text: string): HTMLButtonElement {
  const b = [...container.querySelectorAll('button')].find((x) => x.textContent?.trim() === text);
  if (!b) throw new Error(`no button "${text}"`);
  return b as HTMLButtonElement;
}

describe('AdminCoachingMonthlyReviewClient', () => {
  it('shows the month in review and the editable draft, and says the member cannot see it', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes('userId=') ? json(draftView('Set a crew lead pay range')) : json({ members })
    );
    vi.stubGlobal('fetch', fetchMock);
    act(() => root.render(<AdminCoachingMonthlyReviewClient />));
    await flush();
    await choose(A);

    const text = container.textContent ?? '';
    expect(text).toContain('2 of 5 actions done, 1 blocked, 2 still open.');
    expect(text).toContain('Write the crew lead job description: Pay unclear.');
    expect(text).toContain('To discuss: Crew lead pay rates');
    expect(text).toContain('Nothing is visible to the member until you approve.');
    const title = container.querySelector('input[aria-label="Action 1 title"]') as HTMLInputElement;
    expect(title.value).toBe('Set a crew lead pay range');
  });

  it('approve sends the edited draft for the member on screen, after confirmation', async () => {
    const posts: { userId: string; op: string; edits?: { actions: { title: string }[] } }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === 'POST') {
          posts.push(JSON.parse(init.body as string));
          return json({
            ...draftView('x'),
            status: 'none',
            actions: [],
            result: { status: 'approved', published: 1 },
          });
        }
        return url.includes('userId=')
          ? json(draftView('Set a crew lead pay range'))
          : json({ members });
      })
    );
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    act(() => root.render(<AdminCoachingMonthlyReviewClient />));
    await flush();
    await choose(A);

    const title = container.querySelector('input[aria-label="Action 1 title"]') as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(title, 'Edited by coach');
      title.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => button('Approve all and publish').click());
    await flush();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(posts).toHaveLength(1);
    expect(posts[0].userId).toBe(A);
    expect(posts[0].op).toBe('approve');
    expect(posts[0].edits?.actions[0].title).toBe('Edited by coach');
    expect(container.textContent).toContain('Published 1 action and the new guidance.');
  });

  it('does nothing when the coach cancels the confirmation', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes('userId=') ? json(draftView('A')) : json({ members })
    );
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    act(() => root.render(<AdminCoachingMonthlyReviewClient />));
    await flush();
    await choose(A);
    act(() => button('Approve all and publish').click());
    await flush();
    expect(
      fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === 'POST')
    ).toBe(false);
  });

  it('drops a slow response for a member who is no longer selected', async () => {
    let releaseA!: (r: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes(`userId=${A}`)) return new Promise<Response>((r) => (releaseA = r));
        if (url.includes(`userId=${B}`)) return Promise.resolve(json(draftView('Member B action')));
        return Promise.resolve(json({ members }));
      })
    );
    act(() => root.render(<AdminCoachingMonthlyReviewClient />));
    await flush();
    await choose(A);
    await choose(B);
    releaseA(json(draftView('Member A action')));
    await flush();
    const title = container.querySelector('input[aria-label="Action 1 title"]') as HTMLInputElement;
    expect(title.value).toBe('Member B action');
  });
});
