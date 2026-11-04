// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminCoachingLearningPathsClient } from './AdminCoachingLearningPathsClient';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const COURSE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const COURSE_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const members = [
  { userId: A, email: 'a@example.test', fullName: 'Member A', subscriptionStatus: 'active' },
  { userId: B, email: 'b@example.test', fullName: 'Member B', subscriptionStatus: 'active' },
];

function viewOf(courseId: string, title: string) {
  return {
    hasAssessment: true,
    gaps: [],
    path: [
      { actionId: `act-${courseId}`, courseId, slug: title, title, status: 'todo', percent: 0 },
    ],
    options: [],
  };
}

function json(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

type Deferred = { resolve: (r: Response) => void; promise: Promise<Response> };
function deferred(): Deferred {
  let resolve!: (r: Response) => void;
  const promise = new Promise<Response>((r) => (resolve = r));
  return { resolve, promise };
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
});

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function choose(userId: string) {
  const select = container.querySelector('select') as HTMLSelectElement;
  act(() => {
    select.value = userId;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('AdminCoachingLearningPathsClient', () => {
  it('ignores a late response for a member no longer selected (review r4 P1)', async () => {
    const getA = deferred();
    const getB = deferred();
    const posts: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === 'POST') {
          posts.push(JSON.parse(String(init.body)));
          return json(viewOf(COURSE_B, 'Course B'));
        }
        if (url.endsWith(`userId=${A}`)) return getA.promise;
        if (url.endsWith(`userId=${B}`)) return getB.promise;
        return json({ members });
      })
    );

    await act(async () => root.render(<AdminCoachingLearningPathsClient />));
    await flush();

    choose(A);
    choose(B);
    // B answers first, then A's stale answer arrives.
    await act(async () => getB.resolve(json(viewOf(COURSE_B, 'Course B'))));
    await flush();
    await act(async () => getA.resolve(json(viewOf(COURSE_A, 'Course A'))));
    await flush();

    expect(container.textContent).toContain('Course B');
    expect(container.textContent).not.toContain('Course A');

    const remove = container.querySelector('button[aria-label^="Remove"]') as HTMLButtonElement;
    await act(async () => remove.click());
    await flush();
    expect(posts).toEqual([{ userId: B, op: 'adjust', remove: [COURSE_B] }]);
  });

  it('drops a save response that lands after the coach switched member', async () => {
    const save = deferred();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === 'POST') return save.promise;
        if (url.endsWith(`userId=${A}`)) return json(viewOf(COURSE_A, 'Course A'));
        if (url.endsWith(`userId=${B}`)) return json(viewOf(COURSE_B, 'Course B'));
        return json({ members });
      })
    );

    await act(async () => root.render(<AdminCoachingLearningPathsClient />));
    await flush();
    choose(A);
    await flush();
    const remove = container.querySelector('button[aria-label^="Remove"]') as HTMLButtonElement;
    await act(async () => remove.click());
    choose(B);
    await flush();
    await act(async () => save.resolve(json({ ...viewOf(COURSE_A, 'Course A'), path: [] })));
    await flush();

    expect(container.textContent).toContain('Course B');
    expect(container.textContent).not.toContain('Path saved.');
  });
});
