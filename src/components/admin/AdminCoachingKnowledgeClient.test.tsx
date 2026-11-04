// @vitest-environment jsdom
/**
 * GP-631 coach knowledge-base page: with the flag off it shows only the "turned off" note and
 * no form; with it on, a coach adds an item, sees it waiting, and approves it.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminCoachingKnowledgeClient } from './AdminCoachingKnowledgeClient';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function json(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const ITEM = {
  id: 'i1',
  sourceType: 'transcript',
  sourceTypeLabel: 'Transcript',
  title: 'Episode 12',
  body: 'Measure the square metres before you quote.',
  provenanceUrl: null,
  approvedAt: null as string | null,
  createdAt: '2026-11-04T00:00:00.000Z',
  passageCount: 1,
  heldBackCount: 0,
};

let container: HTMLDivElement;
let root: Root;

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

async function render() {
  await act(async () => {
    root.render(<AdminCoachingKnowledgeClient />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

function setValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value')!.set!;
  act(() => {
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function button(label: string) {
  return Array.from(container.querySelectorAll('button')).find((b) => b.textContent === label);
}

describe('AdminCoachingKnowledgeClient', () => {
  it('shows only the turned-off note while the flag is off (404)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ detail: 'Not found.' }, 404))
    );
    await render();
    expect(container.textContent).toContain('turned off');
    expect(container.querySelector('textarea')).toBeNull();
    expect(button('Add to knowledge base')).toBeUndefined();
  });

  it('adds an item, shows it waiting, then approves it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ items: [] }))
      .mockResolvedValueOnce(json({ ok: true, items: [ITEM] }))
      .mockResolvedValueOnce(
        json({ ok: true, items: [{ ...ITEM, approvedAt: '2026-11-04T01:00:00.000Z' }] })
      );
    vi.stubGlobal('fetch', fetchMock);
    await render();

    const [title] = Array.from(
      container.querySelectorAll('input:not([type])')
    ) as HTMLInputElement[];
    setValue(title, 'Episode 12');
    setValue(container.querySelector('textarea')!, ITEM.body);
    await act(async () => {
      button('Add to knowledge base')!.click();
    });
    const [addUrl, addInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(addUrl).toBe('/api/admin/coaching/corpus');
    expect(addInit.method).toBe('POST');
    expect(JSON.parse(String(addInit.body))).toMatchObject({
      sourceType: 'transcript',
      title: 'Episode 12',
    });
    expect(container.textContent).toContain('Waiting for your approval');

    await act(async () => {
      button('Approve')!.click();
    });
    const [approveUrl, approveInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(approveUrl).toBe('/api/admin/coaching/corpus/i1');
    expect(approveInit.method).toBe('PATCH');
    expect(container.textContent).toContain('In use');
  });
});
