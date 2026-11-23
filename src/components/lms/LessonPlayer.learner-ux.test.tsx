// @vitest-environment jsdom
/**
 * GP-627 (learner walk-through, 8 Oct 2026):
 *  1. an enrolled learner still saw a "Preview" badge on lesson 1;
 *  2. after "Mark complete" the next lesson opened at the old scroll offset (the bottom),
 *     because the dashboard scrolls inside <main>, not the window.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/lms/CourseFormattedBody', () => ({ CourseFormattedBody: () => null }));
vi.mock('@/components/lms/DriveFileViewer', () => ({ DriveFileViewer: () => null }));

import { LessonPlayer } from './LessonPlayer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const lesson = (id = 'l1', isPreview = true) => ({
  id,
  title: 'Moisture mapping',
  content_type: 'text',
  content_body: 'Body',
  drive_file_id: null,
  duration_minutes: null,
  is_preview: isPreview,
  order_index: 0,
  course_id: 'c1',
});

let root: Root | null = null;
let host: HTMLElement | null = null;

/** A stand-in for the dashboard's scrolling <main>, scrolled to the bottom of the last lesson. */
function mountInScrollingMain() {
  const main = document.createElement('main');
  main.style.overflowY = 'auto';
  Object.defineProperty(main, 'clientHeight', { value: 600, configurable: true });
  main.scrollTop = 2400;
  const scrollTo = vi.fn((options: ScrollToOptions) => {
    main.scrollTop = options.top ?? main.scrollTop;
  });
  (main as unknown as { scrollTo: typeof scrollTo }).scrollTo = scrollTo;
  host = document.createElement('div');
  main.appendChild(host);
  document.body.appendChild(main);
  root = createRoot(host);
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  return { main, scrollTo };
}

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  host?.parentElement?.remove();
  host = null;
  vi.unstubAllGlobals();
});

function render(props: Parameters<typeof LessonPlayer>[0]) {
  act(() => root!.render(createElement(LessonPlayer, props)));
}

describe('Preview badge (GP-627 item 1)', () => {
  it('is hidden for an enrolled learner', () => {
    const { main } = mountInScrollingMain();
    render({ lesson: lesson(), enrolled: true });
    expect(main.textContent).not.toContain('Preview');
  });

  it('still shows for a learner who is not enrolled (positive control)', () => {
    const { main } = mountInScrollingMain();
    render({ lesson: lesson() });
    expect(main.textContent).toContain('Preview');
  });

  it('is hidden in the enterprise header for an enrolled learner', () => {
    const { main } = mountInScrollingMain();
    render({ lesson: lesson(), enrolled: true, variant: 'enterprise' });
    expect(main.textContent).not.toContain('Preview');
  });
});

describe('next lesson opens at the top (GP-627 item 2)', () => {
  it('scrolls the dashboard <main> to the top when a new lesson replaces the old one', () => {
    const { main, scrollTo } = mountInScrollingMain();
    render({ lesson: lesson('l1', false), enrolled: true });
    main.scrollTop = 2400; // learner reads to the bottom, then marks complete
    scrollTo.mockClear();
    render({ lesson: lesson('l2', false), enrolled: true });
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
    expect(main.scrollTop).toBe(0);
  });

  it('jumps instantly and never smooth-scrolls, so reduced motion is respected', () => {
    const { scrollTo } = mountInScrollingMain();
    render({ lesson: lesson('l1', false) });
    expect(scrollTo).toHaveBeenCalled();
    for (const [options] of scrollTo.mock.calls) expect(options.behavior).not.toBe('smooth');
  });

  it('leaves a saved reading position to the restore instead of forcing the top', () => {
    const { scrollTo } = mountInScrollingMain();
    render({ lesson: lesson('l1', false), initialPosition: { kind: 'reading', value: 5000 } });
    expect(scrollTo).not.toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
  });
});
