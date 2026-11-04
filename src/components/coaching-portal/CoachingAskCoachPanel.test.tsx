// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const portal = vi.hoisted(() => ({ canEdit: true }));

vi.mock('@/components/coaching-portal/CoachingPortalContext', () => ({
  useCoachingPortal: () => ({ access: { canEdit: portal.canEdit } }),
}));

import { CoachingAskCoachPanel } from './CoachingAskCoachPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function json(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  portal.canEdit = true;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render() {
  await act(async () => {
    root.render(<CoachingAskCoachPanel />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

function typeQuestion(text: string) {
  const ta = container.querySelector('textarea') as HTMLTextAreaElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(ta, text);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function askButton() {
  return Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Ask')!;
}

describe('CoachingAskCoachPanel', () => {
  it('renders nothing while the API is off (404)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ detail: 'Not found.' }, 404))
    );
    await render();
    expect(container.innerHTML).toBe('');
  });

  it('shows the coach material with its source when the question is answered', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ questions: [] }))
      .mockResolvedValueOnce(
        json({
          result: {
            status: 'answered',
            passages: [
              { itemId: 'q', title: 'Quoting & job costing rhythm', text: 'Templates and habits.' },
            ],
            citations: [
              {
                itemId: 'q',
                title: 'Quoting & job costing rhythm',
                sourceLabel: 'Coaching programme: what is included',
                sourceHref: '/ccw-training',
              },
            ],
          },
          questions: [],
        })
      );
    vi.stubGlobal('fetch', fetchMock);
    await render();
    typeQuestion('How do I stop undercharging?');
    await act(async () => {
      askButton().click();
    });
    expect(container.textContent).toContain('Templates and habits.');
    const link = container.querySelector('a[href="/ccw-training"]');
    expect(link?.textContent).toBe('Coaching programme: what is included');
  });

  it('names a coach’s own item as the source, linking only when it has a web address (GP-631)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ questions: [] }))
      .mockResolvedValueOnce(
        json({
          result: {
            status: 'answered',
            passages: [
              { itemId: 'a', title: 'Episode 12', text: 'Measure the square metres.' },
              { itemId: 'b', title: 'Chapter 3', text: 'Write the roster first.' },
            ],
            citations: [
              {
                itemId: 'a',
                title: 'Episode 12',
                sourceLabel: 'Transcript: Episode 12',
                sourceHref: 'https://example.test/podcast/12',
              },
              {
                itemId: 'b',
                title: 'Chapter 3',
                sourceLabel: 'Book chapter: Chapter 3',
                sourceHref: '',
              },
            ],
          },
          questions: [],
        })
      );
    vi.stubGlobal('fetch', fetchMock);
    await render();
    typeQuestion('How do I price a carpet job?');
    await act(async () => {
      askButton().click();
    });
    const external = container.querySelector('a[href="https://example.test/podcast/12"]');
    expect(external?.textContent).toBe('Transcript: Episode 12');
    expect(external?.getAttribute('rel')).toContain('noopener');
    expect(container.textContent).toContain('Book chapter: Chapter 3');
    expect(container.querySelector('a[href=""]')).toBeNull();
  });

  it('tells the member the question went to the coach and lists the coach answer later', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          questions: [
            {
              id: 'old',
              question: 'Lease or buy?',
              status: 'answered',
              coachAnswer: 'Lease it.',
              askedAt: '2026-11-01T00:00:00.000Z',
              answeredAt: '2026-11-02T00:00:00.000Z',
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        json({
          result: { status: 'sent_to_coach', reason: 'no_grounded_source', questionId: 'new' },
          questions: [],
        })
      );
    vi.stubGlobal('fetch', fetchMock);
    await render();
    expect(container.textContent).toContain('Lease it.');
    typeQuestion('Which van should I buy?');
    await act(async () => {
      askButton().click();
    });
    expect(container.textContent).toContain('we have sent it to your coach');
  });

  it('disables asking for a read-only viewer', async () => {
    portal.canEdit = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ questions: [] }))
    );
    await render();
    typeQuestion('How do I stop undercharging?');
    expect(askButton().disabled).toBe(true);
  });
});
