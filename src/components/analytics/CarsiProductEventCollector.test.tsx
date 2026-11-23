// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/analytics/track-carsi-product-event', () => ({
  trackCarsiProductEvent: vi.fn(),
}));

const { trackCarsiProductEvent } = await import('@/lib/analytics/track-carsi-product-event');
const { CarsiProductEventCollector } = await import('./CarsiProductEventCollector');

describe('CarsiProductEventCollector', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.mocked(trackCarsiProductEvent).mockClear();
  });

  it('tracks allow-listed context and drops forged context', async () => {
    document.body.innerHTML = `
      <a data-carsi-event="course_cta" data-carsi-context="role-guide:nsw-builders:start-1" href="/courses/x">ok</a>
      <a data-carsi-event="course_cta" data-carsi-context="jane@example.com" href="/courses/y">bad</a>
    `;
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const root = createRoot(mount);

    await act(async () => {
      root.render(createElement(CarsiProductEventCollector));
      await Promise.resolve();
    });

    const good = document.querySelector('a[href="/courses/x"]') as HTMLAnchorElement;
    good.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, cancelable: true }));
    const bad = document.querySelector('a[href="/courses/y"]') as HTMLAnchorElement;
    bad.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, cancelable: true }));

    expect(vi.mocked(trackCarsiProductEvent)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(trackCarsiProductEvent).mock.calls[0]?.[0]?.context).toBe(
      'role-guide:nsw-builders:start-1'
    );
  });
});