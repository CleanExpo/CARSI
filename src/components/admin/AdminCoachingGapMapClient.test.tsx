// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminCoachingGapMapClient } from './AdminCoachingGapMapClient';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const CH = 'carsi-business-coaching';
const SOCIAL = {
  id: 'aaaaaaaa-0000-4000-8000-000000000001',
  slug: 'social',
  title: 'Social Media',
};
const ADMIN = { id: 'aaaaaaaa-0000-4000-8000-000000000004', slug: 'admin', title: 'Admin Basics' };

function mapView(marketing: { edited: boolean; courses: (typeof SOCIAL)[] }) {
  return {
    chapters: [
      {
        chapterSlug: CH,
        areas: [
          { area: 'marketing', label: 'Marketing and online visibility', ...marketing },
          { area: 'sales', label: 'Enquiries and sales', edited: false, courses: [] },
        ],
      },
    ],
    options: [SOCIAL, ADMIN],
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
});

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('AdminCoachingGapMapClient', () => {
  it('adds a course to a gap and saves the whole ordered list', async () => {
    const posts: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'POST') {
          posts.push(JSON.parse(String(init.body)));
          return json(mapView({ edited: true, courses: [SOCIAL, ADMIN] }));
        }
        return json(mapView({ edited: false, courses: [SOCIAL] }));
      })
    );
    await act(async () => root.render(<AdminCoachingGapMapClient />));
    await flush();
    expect(container.textContent).toContain('Marketing and online visibility');
    expect(container.textContent).toContain('This gap prescribes nothing.');

    const select = container.querySelector(
      'select[aria-label="Add a course to Marketing and online visibility"]'
    ) as HTMLSelectElement;
    act(() => {
      select.value = ADMIN.id;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const add = select.parentElement!.querySelector('button') as HTMLButtonElement;
    await act(async () => add.click());
    await flush();
    expect(posts).toEqual([
      { op: 'save', chapterSlug: CH, area: 'marketing', courseIds: [SOCIAL.id, ADMIN.id] },
    ]);
    expect(container.textContent).toContain('Edited by a coach');
    expect(container.textContent).toContain('Use the default list');
  });

  it('resets an edited gap to the default and shows a refusal reason', async () => {
    const posts: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'POST') {
          posts.push(JSON.parse(String(init.body)));
          return json({ detail: 'Only published courses can be mapped to a gap.' }, false);
        }
        return json(mapView({ edited: true, courses: [ADMIN] }));
      })
    );
    await act(async () => root.render(<AdminCoachingGapMapClient />));
    await flush();
    const reset = [...container.querySelectorAll('button')].find(
      (b) => b.textContent === 'Use the default list'
    ) as HTMLButtonElement;
    await act(async () => reset.click());
    await flush();
    expect(posts).toEqual([{ op: 'reset', chapterSlug: CH, area: 'marketing' }]);
    expect(container.textContent).toContain('Only published courses can be mapped to a gap.');
  });
});
