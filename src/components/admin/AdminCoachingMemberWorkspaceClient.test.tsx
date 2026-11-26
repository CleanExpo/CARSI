// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listCoachingChapterOptions } from '@/lib/coaching-portal/coaching-chapters';

import { AdminCoachingMemberWorkspaceClient } from './AdminCoachingMemberWorkspaceClient';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const MEMBER = '11111111-1111-4111-8111-111111111111';

function json(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('userId=')) {
        return json({
          workspace: {
            businessName: 'Acme Restore',
            chapterSlug: 'carsi-business-coaching',
            coachUserId: 'coach-phill-mcgurk',
            onboardingSubmittedAt: '2026-01-01T00:00:00.000Z',
            briefGeneratedAt: '2026-01-02T00:00:00.000Z',
            brief: {
              version: 1,
              generatedAt: '2026-01-02T00:00:00.000Z',
              source: 'fallback',
              model: null,
              memberName: 'Member A',
              businessName: 'Acme Restore',
              summary: 'Sample brief',
              suggestedFocusTitle: 'Follow up quotes',
              suggestedFocusDescription: 'Within 48 hours.',
              sections: [{ heading: 'Context', body: 'Owner-led.' }],
              draftActions: [{ title: 'Call quotes', rationale: 'Conversion.' }],
            },
            growthPlan: {
              status: 'approved',
              focusTitle: 'Quotes',
              focusDescription: '48h calls',
              approvedAt: '2026-01-03T00:00:00.000Z',
            },
            subscription: { status: 'active', startedAt: '2025-12-01T00:00:00.000Z' },
            hasOnboardingSnapshot: true,
          },
        });
      }
      return json({
        members: [
          {
            userId: MEMBER,
            email: 'a@example.test',
            fullName: 'Member A',
            subscriptionStatus: 'active',
            draftCount: 0,
          },
        ],
      });
    })
  );
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('AdminCoachingMemberWorkspaceClient', () => {
  it('loads members and renders coach brief', async () => {
    await act(async () => root.render(<AdminCoachingMemberWorkspaceClient />));
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Member workspace');
    expect(container.querySelector('[data-testid="admin-coach-brief"]')?.textContent).toContain(
      'Sample brief'
    );
  });
});

// GP-799: picking member B must never leave member A's chapter or brief on screen under B, and
// a save made then must never post B's userId with A's chapter and coach.
describe('AdminCoachingMemberWorkspaceClient: switching member', () => {
  const A = MEMBER;
  const B = '22222222-2222-4222-8222-222222222222';

  function workspaceFor(name: string, chapterSlug: string, coachUserId: string) {
    return {
      businessName: `${name} Co`,
      chapterSlug,
      coachUserId,
      onboardingSubmittedAt: null,
      briefGeneratedAt: '2026-01-02T00:00:00.000Z',
      brief: {
        version: 1,
        generatedAt: '2026-01-02T00:00:00.000Z',
        source: 'fallback',
        model: null,
        memberName: name,
        businessName: `${name} Co`,
        summary: `Brief for ${name}`,
        suggestedFocusTitle: 'Focus',
        suggestedFocusDescription: 'Desc',
        sections: [],
        draftActions: [],
      },
      growthPlan: null,
      subscription: null,
      hasOnboardingSnapshot: true,
    };
  }

  type Pending = { resolve: (r: Response) => void };
  let pendingB: Pending[];
  let pendingPost: Pending[];
  let posts: Record<string, unknown>[];

  beforeEach(() => {
    pendingB = [];
    pendingPost = [];
    posts = [];
    const chapterA = listCoachingChapterOptions()[0];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (init?.method === 'POST') {
          posts.push(JSON.parse(String(init.body)));
          return new Promise<Response>((resolve) => pendingPost.push({ resolve }));
        }
        if (url.includes(`userId=${A}`)) {
          return json({ workspace: workspaceFor('Member A', chapterA.slug, chapterA.coachUserId) });
        }
        if (url.includes(`userId=${B}`)) {
          return new Promise<Response>((resolve) => pendingB.push({ resolve }));
        }
        return json({
          members: [
            {
              userId: A,
              email: 'a@example.test',
              fullName: 'Member A',
              subscriptionStatus: 'active',
              draftCount: 0,
            },
            {
              userId: B,
              email: 'b@example.test',
              fullName: 'Member B',
              subscriptionStatus: 'active',
              draftCount: 0,
            },
          ],
        });
      })
    );
  });

  async function flush() {
    await act(async () => {
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });
  }

  async function renderWithA() {
    await act(async () => root.render(<AdminCoachingMemberWorkspaceClient />));
    await flush();
    expect(container.textContent).toContain('Brief for Member A');
  }

  async function pick(userId: string) {
    const select = container.querySelector<HTMLSelectElement>('#coaching-member-select')!;
    await act(async () => {
      select.value = userId;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function saveButton() {
    return Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Save chapter assignment')
    );
  }

  it("hides member A's brief and chapter the moment member B is picked, until B has loaded", async () => {
    await renderWithA();
    await pick(B);

    expect(container.textContent).not.toContain('Brief for Member A');
    expect(container.querySelector('#chapter-slug')).toBeNull();
    expect(saveButton()).toBeUndefined();
    expect(container.textContent).toContain('Loading member');

    const chapterB = listCoachingChapterOptions().at(-1)!;
    await act(async () => {
      pendingB[0].resolve(
        json({ workspace: workspaceFor('Member B', chapterB.slug, chapterB.coachUserId) })
      );
    });
    await flush();
    expect(container.textContent).toContain('Brief for Member B');
    expect(container.querySelector<HTMLSelectElement>('#chapter-slug')?.value).toBe(chapterB.slug);
  });

  it('a save always posts the chapter and coach of the member it names', async () => {
    await renderWithA();
    await pick(B);
    // Nothing for B is on screen, so nothing can be saved for B yet.
    expect(saveButton()).toBeUndefined();

    const chapterB = listCoachingChapterOptions().at(-1)!;
    await act(async () => {
      pendingB[0].resolve(
        json({ workspace: workspaceFor('Member B', chapterB.slug, chapterB.coachUserId) })
      );
    });
    await flush();
    await act(async () => saveButton()!.click());

    expect(posts).toEqual([
      {
        userId: B,
        op: 'save-chapter',
        chapterSlug: chapterB.slug,
        coachUserId: chapterB.coachUserId,
      },
    ]);
  });

  it('a save for member A that answers after the admin moved to B shows nothing under B', async () => {
    await renderWithA();
    await act(async () => saveButton()!.click());
    expect(posts[0]).toMatchObject({ userId: A });

    await pick(B);
    await act(async () => {
      pendingPost[0].resolve(json({ detail: 'A failed' }, false));
    });
    await flush();

    expect(container.textContent).not.toContain('A failed');
    expect(container.textContent).not.toContain('Saved.');
    expect(container.textContent).not.toContain('Brief for Member A');
  });

  it("member A's load failing after the admin moved to B shows no error under B", async () => {
    // A's load is held, then fails once B is picked.
    const heldA: Pending[] = [];
    const base = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (String(input).includes(`userId=${A}`)) {
        return new Promise<Response>((resolve) => heldA.push({ resolve }));
      }
      return base(input, init);
    });
    await act(async () => root.render(<AdminCoachingMemberWorkspaceClient />));
    await flush();
    await pick(B);
    await act(async () => heldA[0].resolve(json({ detail: 'Could not load A' }, false)));
    await flush();

    expect(container.textContent).not.toContain('Could not load A');
  });

  it('a network failure loading the member shows an error, not "Loading member" for ever', async () => {
    const base = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (String(input).includes(`userId=${B}`)) throw new Error('network offline');
      return base(input, init);
    });
    await renderWithA();
    await pick(B);
    await flush();

    expect(container.textContent).toContain('Could not load member.');
    expect(container.textContent).not.toContain('Loading member');
    expect(saveButton()).toBeUndefined();
  });

  it('a network failure saving shows an error and frees the buttons', async () => {
    const base = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (init?.method === 'POST') throw new Error('network offline');
      return base(input, init);
    });
    await renderWithA();
    await act(async () => saveButton()!.click());
    await flush();

    expect(container.textContent).toContain('Request failed.');
    expect(container.textContent).not.toContain('Saved.');
    expect(saveButton()?.disabled).toBe(false);
  });
});

// GP-799, second round: comparing member ids is not enough. After A, then B, then A again, an
// answer for the first A is still "for A" but belongs to a selection the admin has left. Each
// selection (not each member) owns its requests, and a pending save belongs to its own selection.
describe('AdminCoachingMemberWorkspaceClient: away and back (A, B, A)', () => {
  const A = MEMBER;
  const B = '22222222-2222-4222-8222-222222222222';
  const chapters = listCoachingChapterOptions();

  function ws(name: string, chapterSlug: string, coachUserId: string) {
    return {
      businessName: `${name} Co`,
      chapterSlug,
      coachUserId,
      onboardingSubmittedAt: null,
      briefGeneratedAt: '2026-01-02T00:00:00.000Z',
      brief: {
        version: 1,
        generatedAt: '2026-01-02T00:00:00.000Z',
        source: 'fallback',
        model: null,
        memberName: name,
        businessName: `${name} Co`,
        summary: `Brief for ${name}`,
        suggestedFocusTitle: 'Focus',
        suggestedFocusDescription: 'Desc',
        sections: [],
        draftActions: [],
      },
      growthPlan: null,
      subscription: null,
      hasOnboardingSnapshot: true,
    };
  }

  type Held = { resolve: (r: Response) => void; signal: AbortSignal | undefined };
  let gets: Record<string, Held[]>;
  let posts: Held[];

  beforeEach(() => {
    gets = { [A]: [], [B]: [] };
    posts = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (init?.method === 'POST') {
          return new Promise<Response>((resolve) => posts.push({ resolve, signal: init.signal! }));
        }
        for (const id of [A, B]) {
          if (url.includes(`userId=${id}`)) {
            return new Promise<Response>((resolve) =>
              gets[id].push({ resolve, signal: init?.signal ?? undefined })
            );
          }
        }
        return json({
          members: [A, B].map((userId, i) => ({
            userId,
            email: `m${i}@example.test`,
            fullName: `Member ${i === 0 ? 'A' : 'B'}`,
            subscriptionStatus: 'active',
            draftCount: 0,
          })),
        });
      })
    );
  });

  async function flush() {
    await act(async () => {
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });
  }
  async function pick(userId: string) {
    const select = container.querySelector<HTMLSelectElement>('#coaching-member-select')!;
    await act(async () => {
      select.value = userId;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  async function answerGet(userId: string, index: number, name: string, slug = chapters[0].slug) {
    const coach = chapters.find((c) => c.slug === slug)!.coachUserId;
    await act(async () => gets[userId][index].resolve(json({ workspace: ws(name, slug, coach) })));
    await flush();
  }
  function saveButton() {
    return Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Save chapter assignment')
    );
  }
  async function renderAndLoadA() {
    await act(async () => root.render(<AdminCoachingMemberWorkspaceClient />));
    await flush();
    await answerGet(A, 0, 'Member A');
  }

  it('an old load for A that answers last does not replace the newer load for A', async () => {
    await act(async () => root.render(<AdminCoachingMemberWorkspaceClient />));
    await flush();
    await pick(B);
    await pick(A);
    expect(gets[A]).toHaveLength(2);
    await answerGet(A, 1, 'New A');
    await answerGet(A, 0, 'Old A');
    expect(container.textContent).toContain('Brief for New A');
    expect(container.textContent).not.toContain('Brief for Old A');
  });

  it("leaving a member aborts that member's load request", async () => {
    await act(async () => root.render(<AdminCoachingMemberWorkspaceClient />));
    await flush();
    expect(gets[A][0].signal?.aborted).toBe(false);
    await pick(B);
    expect(gets[A][0].signal?.aborted).toBe(true);
    expect(gets[B][0].signal?.aborted).toBe(false);
  });

  it("an old save for A that answers after A, B, A does not undo the admin's newer choice", async () => {
    await renderAndLoadA();
    await act(async () => saveButton()!.click());
    expect(posts).toHaveLength(1);

    await pick(B);
    await answerGet(B, 0, 'Member B');
    await pick(A);
    await answerGet(A, 1, 'Member A', chapters[0].slug);

    // The admin now chooses another chapter for A.
    const newer = chapters[chapters.length - 1];
    const select = container.querySelector<HTMLSelectElement>('#chapter-slug')!;
    await act(async () => {
      select.value = newer.slug;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(container.querySelector<HTMLSelectElement>('#chapter-slug')!.value).toBe(newer.slug);

    // The first save finally answers with the old assignment.
    await act(async () =>
      posts[0].resolve(
        json({ workspace: ws('Member A', chapters[0].slug, chapters[0].coachUserId) })
      )
    );
    await flush();

    expect(container.querySelector<HTMLSelectElement>('#chapter-slug')!.value).toBe(newer.slug);
    expect(container.textContent).not.toContain('Saved.');
  });

  it('a save answer does not wipe a chapter the admin picked while the save was running', async () => {
    await renderAndLoadA();
    await act(async () => saveButton()!.click());
    expect(posts).toHaveLength(1);

    const newer = chapters[chapters.length - 1];
    const select = container.querySelector<HTMLSelectElement>('#chapter-slug')!;
    await act(async () => {
      select.value = newer.slug;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () =>
      posts[0].resolve(
        json({ workspace: ws('Member A', chapters[0].slug, chapters[0].coachUserId) })
      )
    );
    await flush();

    expect(container.textContent).toContain('Saved.');
    expect(container.querySelector<HTMLSelectElement>('#chapter-slug')!.value).toBe(newer.slug);
  });

  it("a save for A that never answers does not lock member B's buttons", async () => {
    await renderAndLoadA();
    await act(async () => saveButton()!.click());
    expect(saveButton()!.disabled).toBe(true);

    await pick(B);
    await answerGet(B, 0, 'Member B');

    expect(saveButton()!.disabled).toBe(false);
  });

  it('coming back to A shows no old A and offers no save until A has loaded again', async () => {
    await renderAndLoadA();
    await pick(B);
    // B never answers: A's first workspace is still the only one held in memory.
    await pick(A);
    // A's second load is still pending. The first A load must not stand in for it.
    expect(gets[A]).toHaveLength(2);
    expect(container.textContent).not.toContain('Brief for Member A');
    expect(container.querySelector('#chapter-slug')).toBeNull();
    expect(saveButton()).toBeUndefined();
    expect(posts).toHaveLength(0);

    await answerGet(A, 1, 'Member A again');
    expect(container.textContent).toContain('Brief for Member A again');
    expect(saveButton()).toBeDefined();
  });

  it('an answer that arrives after the page is closed changes nothing and does not throw', async () => {
    await renderAndLoadA();
    await act(async () => saveButton()!.click());
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () =>
      posts[0].resolve(
        json({ workspace: ws('Member A', chapters[0].slug, chapters[0].coachUserId) })
      )
    );
    await flush();
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
