// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ router: { push: vi.fn(), refresh: vi.fn() }, toast: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

import { AdminCcwRoadshowClient } from './AdminCcwRoadshowClient';
import { AdminMarketingEmailClient } from './AdminMarketingEmailClient';
import { MarkdownEditor } from './MarkdownEditor';
import { MarketingComposeEditor } from './MarketingComposeEditor';
import { CourseEditorForm } from './courses/CourseEditorForm';
import { OptimizeCourseReview } from './courses/OptimizeCourseReview';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
function json(data: unknown) {
  return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
}
function button(title: string) {
  const found = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
    (node) => node.title === title || node.textContent?.trim() === title
  );
  if (!found) throw new Error(`Button missing: ${title}`);
  return found;
}
function input(selector: string, value: string) {
  const element = container.querySelector<HTMLInputElement>(selector)!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  vi.stubGlobal('fetch', vi.fn());
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn() });
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  Reflect.deleteProperty(document, 'execCommand');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('editor tool events', () => {
  it('runs markdown formatting only on a click and preserves module and cancelled-link actions', async () => {
    const onChange = vi.fn();
    await act(async () =>
      root.render(<MarkdownEditor value="## Module 1 — Original\n\nBody" onChange={onChange} />)
    );
    expect(document.execCommand).not.toHaveBeenCalled();
    act(() => button('Bold').click());
    expect(document.execCommand).toHaveBeenCalledWith('bold', false, undefined);
    expect(onChange).toHaveBeenCalledOnce();
    act(() => button('Module heading').click());
    expect(document.execCommand).toHaveBeenCalledWith(
      'insertHTML',
      false,
      '<h2>Module 2 — </h2><p><br></p>'
    );
    vi.spyOn(window, 'prompt').mockReturnValue(null);
    onChange.mockClear();
    act(() => button('Link').click());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps compose toolbar commands and its link dialog functional', async () => {
    const onChange = vi.fn();
    await act(async () =>
      root.render(
        <MarketingComposeEditor value={{ html: '<p>Body</p>', text: 'Body' }} onChange={onChange} />
      )
    );
    expect(document.execCommand).not.toHaveBeenCalled();
    act(() => button('Underline').click());
    expect(document.execCommand).toHaveBeenCalledWith('underline', false, undefined);
    act(() => button('Insert link').click());
    input('input[placeholder="Text to display"]', 'Source');
    input('input[placeholder="https://"]', 'https://example.test');
    const apply = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (node) => node.textContent?.trim() === 'Apply'
    );
    expect(apply).toBeDefined();
    act(() => apply!.click());
    expect(document.execCommand).toHaveBeenCalledWith(
      'insertHTML',
      false,
      expect.stringContaining('https://example.test')
    );
  });
});

describe('request and navigation lifecycle', () => {
  it('keeps the last recipient page visible but non-actionable while search refreshes', async () => {
    const next = deferred<Response>();
    const payload = (name: string) => ({
      users: [{ id: name, email: `${name}@example.test`, fullName: name }],
      total: 1, page: 1, pageSize: 25, totalPages: 1, cappedSelectAll: 80,
    });
    vi.mocked(fetch).mockResolvedValueOnce(json(payload('Previous recipient'))).mockReturnValueOnce(next.promise);
    await act(async () => root.render(<AdminMarketingEmailClient />));
    input('input[placeholder="Search name or email (3+ letters)"]', 'n');
    expect(container.textContent).toContain('Previous recipient');
    expect(container.textContent).toContain('Updating recipients');
    expect(container.querySelector<HTMLInputElement>('input[type="checkbox"]')?.disabled).toBe(true);
    expect(button('Select page').disabled).toBe(true);
    await act(async () => next.resolve(json(payload('New recipient'))));
    expect(container.textContent).not.toContain('Previous recipient');
    expect(container.textContent).toContain('New recipient');
    expect(container.querySelector<HTMLInputElement>('input[type="checkbox"]')?.disabled).toBe(false);
  });

  it('keeps roadshow hook order stable from the initial loading screen to the registry', async () => {
    const response = deferred<Response>();
    vi.mocked(fetch).mockReturnValue(response.promise);
    await act(async () => root.render(<AdminCcwRoadshowClient />));
    expect(container.textContent).toContain('Loading registry');
    await act(async () => response.resolve(json({ cities: [], rows: [] })));
    expect(container.textContent).toContain('CCW Roadshow Registry');
  });

  it('discards an old review load after switching to a different course', async () => {
    const old = deferred<Response>();
    const current = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    await act(async () => root.render(<OptimizeCourseReview courseId="old" />));
    await act(async () => root.render(<OptimizeCourseReview courseId="current" />));
    await act(async () => current.resolve(json({ courseTitle: 'Current title', draft: null })));
    await act(async () => old.resolve(json({ courseTitle: 'Stale title', draft: null })));
    expect(container.textContent).toContain('Current title');
    expect(container.textContent).not.toContain('Stale title');
  });

  it('ignores stale customer batches and settles network errors so search can retry', async () => {
    const old = deferred<Response>();
    const current = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    await act(async () => root.render(<AdminMarketingEmailClient />));
    act(() => button('50').click());
    const payload = (name: string, size: number) => ({
      users: [{ id: name, email: `${name}@example.test`, fullName: name }],
      total: 1,
      page: 1,
      pageSize: size,
      totalPages: 1,
      cappedSelectAll: 80,
    });
    await act(async () => current.resolve(json(payload('Current customer', 50))));
    await act(async () => old.resolve(json(payload('Stale customer', 25))));
    expect(container.textContent).toContain('Current customer');
    expect(container.textContent).not.toContain('Stale customer');
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection lost'));
    await act(async () => button('80').click());
    expect(container.textContent).toContain('Connection lost');
    expect(container.textContent).not.toContain('Loading…');
    vi.mocked(fetch).mockResolvedValueOnce(json(payload('Retry customer', 80)));
    await act(async () =>
      container
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    );
    expect(container.textContent).toContain('Retry customer');
    expect(container.textContent).not.toContain('Connection lost');
  });

  it('resets existing-to-new course state and ignores a cancelled existing-course load', async () => {
    const old = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(old.promise);
    await act(async () => root.render(<CourseEditorForm courseId="old" />));
    await act(async () => root.render(<CourseEditorForm />));
    expect(container.querySelector<HTMLInputElement>('#course-title')!.value).toBe('');
    expect(container.querySelector('[aria-label="Course article"]')?.textContent).toContain(
      'Module 1'
    );
    input('#course-title', 'Unsaved new title');
    await act(async () => root.render(<CourseEditorForm />));
    expect(container.querySelector<HTMLInputElement>('#course-title')!.value).toBe(
      'Unsaved new title'
    );
    await act(async () => old.reject(new Error('Old request failed')));
    expect(mocks.router.push).not.toHaveBeenCalled();
    expect(mocks.toast).not.toHaveBeenCalled();
  });
});
